import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from '../node_modules/typescript/lib/typescript.js';

const ROOT = new URL('../', import.meta.url).pathname;
const SOURCE = path.join(ROOT, 'src/lib/uploads.ts');
let dir;
let uploads;
let moduleUrl;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumix-uploads-test-'));
  const out = path.join(dir, 'uploads.mjs');
  const js = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  fs.writeFileSync(out, js);
  moduleUrl = pathToFileURL(out).href;
  uploads = await import(moduleUrl);
});

after(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

function identityRows(size = 2) {
  const rows = [];
  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) rows.push(`${r} ${g} ${b}`);
    }
  }
  return rows;
}

function cube({ style = 'VLOG', size = 2, domainMin, domainMax, rows = identityRows(size) } = {}) {
  return [
    'TITLE "Own look"',
    style === null ? null : `#LUMIXPHOTOSTYLE ${style}`,
    `LUT_3D_SIZE ${size}`,
    domainMin ? `DOMAIN_MIN ${domainMin}` : null,
    domainMax ? `DOMAIN_MAX ${domainMax}` : null,
    ...rows,
    '',
  ].filter((line) => line !== null).join('\n');
}

function cubeFile(text, name = 'own.cube') {
  return new File([text], name, { type: 'text/plain' });
}

class FakeRequest {
  result;
  error = null;
  onsuccess = null;
  onerror = null;
  onupgradeneeded = null;
  onblocked = null;
}

class FakeIndexedDb {
  records = new Map();
  created = false;
  failNextWrite = false;

  open() {
    const request = new FakeRequest();
    queueMicrotask(() => {
      const owner = this;
      const db = {
        objectStoreNames: { contains: () => owner.created },
        createObjectStore: () => { owner.created = true; },
        close: () => {},
        onversionchange: null,
        transaction: (_storeName, mode) => {
          const transaction = {
            error: null,
            oncomplete: null,
            onerror: null,
            onabort: null,
            objectStore: () => ({
              add: (record) => {
                const add = new FakeRequest();
                queueMicrotask(() => {
                  if (owner.failNextWrite) {
                    owner.failNextWrite = false;
                    transaction.error = new DOMException('quota', 'QuotaExceededError');
                    transaction.onabort?.();
                    return;
                  }
                  if (owner.records.has(record.id)) {
                    transaction.error = new DOMException('duplicate', 'ConstraintError');
                    transaction.onabort?.();
                    return;
                  }
                  owner.records.set(record.id, structuredClone(record));
                  add.result = record.id;
                  add.onsuccess?.();
                  queueMicrotask(() => transaction.oncomplete?.());
                });
                return add;
              },
              getAll: () => {
                const get = new FakeRequest();
                queueMicrotask(() => {
                  get.result = [...owner.records.values()].map((record) => structuredClone(record));
                  get.onsuccess?.();
                  queueMicrotask(() => transaction.oncomplete?.());
                });
                return get;
              },
            }),
          };
          if (mode !== 'readwrite' && mode !== 'readonly') throw new Error(`unsupported mode ${mode}`);
          return transaction;
        },
      };
      request.result = db;
      if (!owner.created) request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }
}

describe('inspectUpload', () => {
  it('returns trusted structural metadata and the declared input style', async () => {
    const result = await uploads.inspectUpload(cubeFile(cube({
      domainMin: '-0.1 0 0.1',
      domainMax: '0.9 1 1.1',
    })));
    assert.deepEqual(result, {
      fileName: 'own.cube',
      title: 'Own look',
      declaredInputStyle: 'VLOG',
      inputStyleRequired: false,
      size: 2,
      domainMin: [-0.1, 0, 0.1],
      domainMax: [0.9, 1, 1.1],
      previewSupported: true,
    });
  });

  it('rejects non-finite values instead of storing a poisoned table', async () => {
    const rows = identityRows();
    rows[3] = 'NaN 0 0';
    await assert.rejects(uploads.inspectUpload(cubeFile(cube({ rows }))), /finite numbers/);
  });

  it('rejects an oversized grid before allocating its table', async () => {
    await assert.rejects(
      uploads.inspectUpload(cubeFile('LUT_3D_SIZE 66\n0 0 0\n')),
      /2 and 65/,
    );
  });

  it('rejects invalid domains and truncated tables', async () => {
    await assert.rejects(
      uploads.inspectUpload(cubeFile(cube({ domainMin: '0 0 0', domainMax: '0 1 1' }))),
      /DOMAIN_MAX.*greater than.*DOMAIN_MIN/,
    );
    await assert.rejects(
      uploads.inspectUpload(cubeFile(cube({ rows: identityRows().slice(1) }))),
      /should contain 8.*found 7 rows/,
    );
  });

  it('rejects unsupported color-pipeline directives instead of silently misreading them', async () => {
    const text = cube().replace('LUT_3D_SIZE 2', 'LUT_3D_SIZE 2\nLUT_3D_INPUT_RANGE 0 1023');
    await assert.rejects(
      uploads.inspectUpload(cubeFile(text)),
      /unsupported.*LUT_3D_INPUT_RANGE/,
    );
  });
});

describe('importUpload persistence', () => {
  it('requires an explicit style when trusted metadata is absent', async () => {
    await assert.rejects(
      uploads.importUpload(cubeFile(cube({ style: null }))),
      /Explicitly select an input color style/,
    );
  });

  it('survives a module reload and leaves prior data intact when a write aborts', async () => {
    const fake = new FakeIndexedDb();
    globalThis.indexedDB = fake;

    const first = await uploads.importUpload(cubeFile(cube({ style: null }), 'first.cube'), 'REC709');
    assert.equal(first.inputStyle, 'REC709');
    assert.equal((await uploads.loadUploads()).length, 1);

    fake.failNextWrite = true;
    await assert.rejects(
      uploads.importUpload(cubeFile(cube(), 'second.cube')),
      /no changes were saved/,
    );
    assert.deepEqual((await uploads.loadUploads()).map((item) => item.id), [first.id]);

    const reloaded = await import(`${moduleUrl}?reload=${Date.now()}`);
    assert.deepEqual((await reloaded.loadUploads()).map((item) => item.id), [first.id]);
  });
});

describe('renderUpload', () => {
  it('uses the real per-style sample signal and applies trilinear LUT interpolation', async () => {
    const fake = new FakeIndexedDb();
    globalThis.indexedDB = fake;
    const isolated = await import(`${moduleUrl}?preview=${Date.now()}`);
    const upload = await isolated.importUpload(cubeFile(cube({ style: 'CNED2' })), 'CNED2');

    let requestedUrl = '';
    let renderedPixels;
    globalThis.fetch = async (url) => {
      requestedUrl = String(url);
      return { ok: true, status: 200, blob: async () => new Blob(['image']) };
    };
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
    globalThis.document = {
      createElement: (tag) => {
        assert.equal(tag, 'canvas');
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage() {},
            getImageData: () => ({ data: new Uint8ClampedArray([128, 64, 255, 255]) }),
            putImageData: (image) => { renderedPixels = [...image.data]; },
          }),
          toDataURL: () => `data:image/test,${renderedPixels.join(',')}`,
        };
      },
    };

    const result = await isolated.renderUpload(upload, 's9');
    assert.match(requestedUrl, /sample\/_before\/s9-cned2\.webp$/);
    assert.equal(result, 'data:image/test,128,64,255,255');
  });

  it('refuses a style whose correct input signal is unavailable', async () => {
    const isolated = await import(`${moduleUrl}?unsupported=${Date.now()}`);
    const upload = await isolated.importUpload(cubeFile(cube({ style: 'STD' }), 'standard.cube'));
    await assert.rejects(isolated.renderUpload(upload, 's9'), /Standard.*preview is not supported for this LUT/);
  });
});
