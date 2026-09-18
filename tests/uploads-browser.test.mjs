import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, it } from 'node:test';
import { chromium } from 'playwright';
import ts from '../node_modules/typescript/lib/typescript.js';

const ROOT = new URL('../', import.meta.url).pathname;
const SAMPLE_PATH = path.join(ROOT, 'public/sample/_before/s9-cned2.webp');
const source = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'src/lib/uploads.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText;

let browser;
let page;
const requests = [];

async function installModule() {
  await page.evaluate(async (moduleSource) => {
    const url = URL.createObjectURL(new Blob([moduleSource], { type: 'text/javascript' }));
    window.__uploads = await import(url);
    URL.revokeObjectURL(url);
  }, source);
}

before(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  page = await browser.newPage();
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    if (url.pathname === '/sample/_before/s9-cned2.webp') {
      await route.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(SAMPLE_PATH) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>uploads test</title>' });
  });
  await page.goto('http://127.0.0.1:4177/');
  await installModule();
});

after(async () => {
  await browser?.close();
});

it('persists through a real browser reload and renders the raw style signal on a real canvas', async () => {
  const first = await page.evaluate(async () => {
    const rows = [];
    for (let blue = 0; blue < 2; blue += 1) {
      for (let green = 0; green < 2; green += 1) {
        for (let red = 0; red < 2; red += 1) rows.push(`${1 - red} ${1 - green} ${1 - blue}`);
      }
    }
    const cube = [
      'TITLE "Browser invert"',
      '#LUMIXPHOTOSTYLE CNED2',
      'LUT_3D_SIZE 2',
      ...rows,
      '',
    ].join('\n');
    const upload = await window.__uploads.importUpload(new File([cube], 'browser.cube'));
    const preview = await window.__uploads.renderUpload(upload, 's9');

    async function pixels(url) {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: 'srgb' }).data;
    }

    const original = await pixels('/sample/_before/s9-cned2.webp');
    const rendered = await pixels(preview);
    let inverseError = 0;
    let changed = 0;
    let channels = 0;
    for (let offset = 0; offset < original.length; offset += 160) {
      for (let channel = 0; channel < 3; channel += 1) {
        inverseError += Math.abs(rendered[offset + channel] - (255 - original[offset + channel]));
        changed += Math.abs(rendered[offset + channel] - original[offset + channel]);
        channels += 1;
      }
    }
    return {
      id: upload.id,
      stored: (await window.__uploads.loadUploads()).length,
      previewPrefix: preview.slice(0, 16),
      inverseMeanError: inverseError / channels,
      changedMean: changed / channels,
    };
  });

  assert.equal(first.stored, 1);
  assert.match(first.previewPrefix, /^data:image\/webp/);
  assert.ok(first.inverseMeanError < 8, `inverse mean error ${first.inverseMeanError}`);
  assert.ok(first.changedMean > 30, `changed mean ${first.changedMean}`);
  assert.ok(requests.includes('/sample/_before/s9-cned2.webp'));

  await page.reload();
  await installModule();
  const afterReload = await page.evaluate(async () => {
    const uploads = await window.__uploads.loadUploads();
    return { ids: uploads.map((upload) => upload.id), typed: uploads[0]?.values instanceof Float32Array };
  });
  assert.deepEqual(afterReload.ids, [first.id]);
  assert.equal(afterReload.typed, true);
});
