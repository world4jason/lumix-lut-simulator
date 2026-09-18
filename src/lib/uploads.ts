import type { Lut } from '../types';

const DATABASE_NAME = 'lumix-s9-uploads';
const DATABASE_VERSION = 1;
const STORE_NAME = 'uploads';
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MIN_LUT_SIZE = 2;
const MAX_LUT_SIZE = 65;
const MAX_TITLE_LENGTH = 160;
const MAX_FILE_NAME_LENGTH = 255;

type Vec3 = [number, number, number];

export interface UploadInputStyle {
  value: string;
  label: string;
  preview: boolean;
}

/**
 * DC-S9 Photo Style tags, plus REC709 for ordinary display-referred LUTs.
 * `preview` is true only where this project has the matching built-in input
 * image and can therefore render without guessing or shipping a conversion LUT.
 */
export const SUPPORTED_UPLOAD_INPUT_STYLES: readonly UploadInputStyle[] = Object.freeze([
  { value: 'VLOG', label: 'V-Log', preview: true },
  { value: 'REC709', label: 'Rec.709', preview: true },
  { value: '709L', label: 'Like709', preview: true },
  { value: 'CNED2', label: 'Cinelike D2', preview: true },
  { value: 'CNEV2', label: 'Cinelike V2', preview: true },
  { value: 'FLAT', label: 'Flat', preview: true },
  { value: 'STD', label: 'Standard', preview: false },
  { value: 'NAT', label: 'Natural', preview: false },
  { value: 'VIVD', label: 'Vivid', preview: false },
  { value: 'PORT', label: 'Portrait', preview: false },
  { value: 'LAND', label: 'Landscape', preview: false },
  { value: 'MONO', label: 'Monochrome', preview: false },
  { value: 'LMONO', label: 'L.Monochrome', preview: false },
  { value: 'LMONOD', label: 'L.Monochrome D', preview: false },
  { value: 'LMONOS', label: 'L.Monochrome S', preview: false },
  { value: 'LEICAMONO', label: 'LEICA Monochrome', preview: false },
  { value: 'LCLASN', label: 'L.ClassicNeo', preview: false },
]);

const INPUT_STYLES = new Map(SUPPORTED_UPLOAD_INPUT_STYLES.map((style) => [style.value, style]));
const SIGNAL_STYLES = new Set(['709L', 'CNED2', 'CNEV2', 'FLAT']);
const SAMPLE_IDS = new Set([
  'vlog-portrait', 's9', 'vlog-skin', 'vlog-interior', 'huts', 'mural', 'scooter',
  'sunwall', 'harbour', 'pier', 'phbl09', 'phbl10', 'phbl11', 'phbl21', 'phbl24',
  'phbl27', 'phbl29', 'phbl30', 'phbl33', 'phbl36', 'phbl37', 'phbl38', 'phbl39',
  'phbl40', 's9-street2', 's9-wide', 's9-wide2', 's1rii02', 's1rii11', 's1rii24',
  's1rii25', 's1rii28', 'reference',
]);

export interface UploadedLut {
  id: string;
  lut: Lut;
  inputStyle: string;
  declaredInputStyle: string | null;
  size: number;
  domainMin: Vec3;
  domainMax: Vec3;
  values: Float32Array;
  fileName: string;
  importedAt: string;
}

export interface UploadInspection {
  fileName: string;
  title: string;
  declaredInputStyle: string | null;
  inputStyleRequired: boolean;
  size: number;
  domainMin: Vec3;
  domainMax: Vec3;
  previewSupported: boolean;
}

interface ParsedCube {
  title: string | null;
  declaredInputStyle: string | null;
  size: number;
  domainMin: Vec3;
  domainMax: Vec3;
  values: Float32Array;
}

function displayFileName(file: File): string {
  const name = file.name.trim().slice(0, MAX_FILE_NAME_LENGTH);
  return name || 'untitled.cube';
}

function fallbackTitle(fileName: string): string {
  const title = fileName.replace(/\.cube$/i, '').trim();
  return (title || 'Untitled LUT').slice(0, MAX_TITLE_LENGTH);
}

function normalizeInputStyle(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return INPUT_STYLES.has(normalized) ? normalized : null;
}

function parseThree(parts: readonly string[], directive: string, lineNumber: number): Vec3 {
  if (parts.length !== 4) {
    throw new Error(`Line ${lineNumber}: ${directive} must contain exactly three numbers.`);
  }
  const values = parts.slice(1).map(Number);
  if (!values.every(Number.isFinite)) {
    throw new Error(`Line ${lineNumber}: ${directive} must use finite numbers.`);
  }
  return [values[0], values[1], values[2]];
}

function parseCube(text: string): ParsedCube {
  if (text.includes('\0')) throw new Error('This .cube file contains unparseable binary content.');

  let title: string | null = null;
  let declaredInputStyle: string | null = null;
  let size: number | null = null;
  let domainMin: Vec3 = [0, 0, 0];
  let domainMax: Vec3 = [1, 1, 1];
  let sawDomainMin = false;
  let sawDomainMax = false;
  const values: number[] = [];

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const raw = lines[index].replace(/^\uFEFF/, '').trim();
    if (!raw) continue;

    const styleMatch = /^#LUMIXPHOTOSTYLE[ \t]+([A-Za-z0-9_-]+)[ \t]*$/i.exec(raw);
    if (styleMatch) {
      const style = styleMatch[1].toUpperCase();
      if (declaredInputStyle !== null && declaredInputStyle !== style) {
        throw new Error('The file contains conflicting #LUMIXPHOTOSTYLE declarations.');
      }
      declaredInputStyle = style;
      continue;
    }
    if (raw.startsWith('#')) continue;

    const line = raw.replace(/[ \t]+#.*$/, '').trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const keyword = parts[0].toUpperCase();

    if (keyword === 'TITLE') {
      if (title === null) {
        const titleText = line.slice(parts[0].length).trim();
        const unquoted = titleText.length >= 2 &&
          ((titleText.startsWith('"') && titleText.endsWith('"')) ||
           (titleText.startsWith("'") && titleText.endsWith("'")))
          ? titleText.slice(1, -1)
          : titleText;
        title = unquoted.trim().slice(0, MAX_TITLE_LENGTH) || null;
      }
      continue;
    }
    if (keyword === 'LUT_1D_SIZE') {
      throw new Error('Only 3D .cube files are supported; 1D LUTs cannot be imported.');
    }
    if (keyword === 'LUT_3D_SIZE') {
      if (size !== null) throw new Error('The file contains duplicate LUT_3D_SIZE declarations.');
      if (parts.length !== 2 || !/^\d+$/.test(parts[1])) {
        throw new Error(`Line ${lineNumber}: LUT_3D_SIZE must be an integer.`);
      }
      const parsedSize = Number(parts[1]);
      if (!Number.isSafeInteger(parsedSize) || parsedSize < MIN_LUT_SIZE || parsedSize > MAX_LUT_SIZE) {
        throw new Error(`LUT_3D_SIZE must be between ${MIN_LUT_SIZE} and ${MAX_LUT_SIZE}.`);
      }
      size = parsedSize;
      continue;
    }
    if (keyword === 'DOMAIN_MIN') {
      if (sawDomainMin) throw new Error('The file contains duplicate DOMAIN_MIN declarations.');
      domainMin = parseThree(parts, 'DOMAIN_MIN', lineNumber);
      sawDomainMin = true;
      continue;
    }
    if (keyword === 'DOMAIN_MAX') {
      if (sawDomainMax) throw new Error('The file contains duplicate DOMAIN_MAX declarations.');
      domainMax = parseThree(parts, 'DOMAIN_MAX', lineNumber);
      sawDomainMax = true;
      continue;
    }

    if (keyword.startsWith('LUT_') || keyword.startsWith('DOMAIN_')) {
      throw new Error(`Line ${lineNumber} uses unsupported ${parts[0]} directive; the color input range cannot be determined.`);
    }

    const resemblesData = parts.length === 3 || /^(?:[-+.]?\d|nan|inf)/i.test(parts[0]);
    if (!resemblesData) continue;
    if (size === null) throw new Error(`Line ${lineNumber} contains color data before LUT_3D_SIZE.`);
    if (parts.length !== 3) throw new Error(`Line ${lineNumber}: color data must contain exactly three numbers.`);
    const row = parts.map(Number);
    if (!row.every(Number.isFinite)) {
      throw new Error(`Line ${lineNumber}: color data must contain three finite numbers.`);
    }
    values.push(row[0], row[1], row[2]);
    if (values.length > size ** 3 * 3) {
      throw new Error(`LUT color data exceeds the ${size ** 3} groups required by LUT_3D_SIZE ${size}.`);
    }
  }

  if (size === null) throw new Error('LUT_3D_SIZE is missing; this is not a valid 3D .cube file.');
  for (let channel = 0; channel < 3; channel += 1) {
    if (!(domainMax[channel] > domainMin[channel])) {
      throw new Error('Every DOMAIN_MAX value must be greater than the DOMAIN_MIN value for the same channel.');
    }
  }
  const expectedRows = size ** 3;
  const actualRows = values.length / 3;
  if (actualRows !== expectedRows) {
    throw new Error(`LUT_3D_SIZE ${size} should contain ${expectedRows} color data rows; found ${actualRows} rows.`);
  }
  const table = Float32Array.from(values);
  for (const value of table) {
    if (!Number.isFinite(value)) throw new Error('LUT contains color values that cannot be stored as finite numbers.');
  }
  return { title, declaredInputStyle, size, domainMin, domainMax, values: table };
}

async function readUploadFile(file: File): Promise<{ fileName: string; parsed: ParsedCube }> {
  const fileName = displayFileName(file);
  if (!/\.cube$/i.test(fileName)) throw new Error('Only 3D LUTs with a .cube extension are supported.');
  if (file.size === 0) throw new Error('This .cube file is empty.');
  if (file.size > MAX_FILE_BYTES) throw new Error('This .cube file exceeds 32 MB. Import stopped to avoid exhausting browser memory.');
  let text: string;
  try {
    text = await file.text();
  } catch (cause) {
    throw new Error('Unable to read this .cube file.', { cause });
  }
  return { fileName, parsed: parseCube(text) };
}

export async function inspectUpload(file: File): Promise<UploadInspection> {
  const { fileName, parsed } = await readUploadFile(file);
  const recognizedStyle = parsed.declaredInputStyle === null
    ? null
    : normalizeInputStyle(parsed.declaredInputStyle);
  return {
    fileName,
    title: parsed.title ?? fallbackTitle(fileName),
    declaredInputStyle: parsed.declaredInputStyle,
    inputStyleRequired: recognizedStyle === null,
    size: parsed.size,
    domainMin: [...parsed.domainMin],
    domainMax: [...parsed.domainMax],
    previewSupported: recognizedStyle !== null && INPUT_STYLES.get(recognizedStyle)?.preview === true,
  };
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support IndexedDB, so local LUTs cannot be saved.'));
  }
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => reject(new Error('Unable to open local LUT storage.', { cause: request.error }));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Local LUT storage is being updated by another page. Close other tabs and try again.'));
    };
  });
  databasePromise = pending.catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function validVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isUploadedLut(value: unknown): value is UploadedLut {
  if (!value || typeof value !== 'object') return false;
  const upload = value as Partial<UploadedLut>;
  if (typeof upload.id !== 'string' || !upload.id || typeof upload.fileName !== 'string' ||
      typeof upload.importedAt !== 'string' || !Number.isFinite(Date.parse(upload.importedAt)) ||
      typeof upload.inputStyle !== 'string' || !INPUT_STYLES.has(upload.inputStyle) ||
      !(upload.declaredInputStyle === null || typeof upload.declaredInputStyle === 'string') ||
      !Number.isSafeInteger(upload.size) || upload.size! < MIN_LUT_SIZE || upload.size! > MAX_LUT_SIZE ||
      !validVec3(upload.domainMin) || !validVec3(upload.domainMax) || !(upload.values instanceof Float32Array) ||
      upload.values.length !== upload.size! ** 3 * 3 || !upload.lut || typeof upload.lut !== 'object' ||
      upload.lut.code !== `upload:${upload.id}` || upload.lut.photoStyle !== upload.inputStyle) return false;
  for (let channel = 0; channel < 3; channel += 1) {
    if (!(upload.domainMax[channel] > upload.domainMin[channel])) return false;
  }
  for (const entry of upload.values) if (!Number.isFinite(entry)) return false;
  return true;
}

export async function loadUploads(): Promise<UploadedLut[]> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    const [records] = await Promise.all([requestResult(request), transactionComplete(transaction)]);
    if (!records.every(isUploadedLut)) {
      throw new Error('The local LUT data has an invalid format; the original data was preserved and not overwritten.');
    }
    return records.sort((a, b) => a.importedAt.localeCompare(b.importedAt) || a.id.localeCompare(b.id));
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes('original data was preserved')) throw cause;
    throw new Error('Unable to read local LUT data; the original data was preserved. Reload the page and try again.', { cause });
  }
}

function makeId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('The browser cannot create a secure local LUT identifier. Update the browser and try again.');
  }
  return crypto.randomUUID();
}

export async function importUpload(file: File, inputStyle?: string): Promise<UploadedLut> {
  const { fileName, parsed } = await readUploadFile(file);
  const declared = parsed.declaredInputStyle === null ? null : normalizeInputStyle(parsed.declaredInputStyle);
  let selected: string | null;
  if (inputStyle !== undefined) {
    selected = normalizeInputStyle(inputStyle);
    if (selected === null) throw new Error('The selected input color style is unsupported. Select another style.');
  } else {
    selected = declared;
  }
  if (selected === null) {
    throw new Error('This file has no recognizable #LUMIXPHOTOSTYLE declaration. Explicitly select an input color style before importing.');
  }

  const id = makeId();
  const title = parsed.title ?? fallbackTitle(fileName);
  const upload: UploadedLut = {
    id,
    inputStyle: selected,
    declaredInputStyle: parsed.declaredInputStyle,
    size: parsed.size,
    domainMin: [...parsed.domainMin],
    domainMax: [...parsed.domainMax],
    values: parsed.values,
    fileName,
    importedAt: new Date().toISOString(),
    lut: {
      code: `upload:${id}`,
      source: 'upload',
      sourceName: 'Local upload',
      inputProfileRaw: parsed.declaredInputStyle,
      title,
      overview: `Imported from ${fileName}; stored only in this browser.`,
      downloads: null,
      photoStyle: selected,
      photoStyleFromFile: declared === selected,
      inputProfileClaim: selected,
      usage: 'video',
      scene: 'other',
      gridSize: parsed.size,
      sourceGridSize: parsed.size,
      pack: null,
      productUrl: null,
      creator: { code: 'own', name: 'My LUT', icon: null },
      thumb: { after: null, before: null },
      cube: null,
    },
  };

  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).add(upload);
    await Promise.all([requestResult(request), transactionComplete(transaction)]);
  } catch (cause) {
    throw new Error('LUT storage failed; no changes were saved. Check that the browser still has available storage space and try again.', { cause });
  }
  return upload;
}

function samplePath(inputStyle: string, sampleId: string): string {
  if (inputStyle === 'VLOG') return `sample/_before/${sampleId}-log.webp`;
  if (inputStyle === 'REC709') return `sample/_before/${sampleId}-neutral.webp`;
  if (SIGNAL_STYLES.has(inputStyle)) {
    return `sample/_before/${sampleId}-${inputStyle.toLowerCase()}.webp`;
  }
  const label = INPUT_STYLES.get(inputStyle)?.label ?? inputStyle;
  throw new Error(`No correct built-in input image is available for ${label}; preview is not supported for this LUT.`);
}

function assetUrl(path: string): string {
  const environment = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
  const base = environment?.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`;
}

function coordinate(value: number, min: number, max: number, size: number): [number, number, number] {
  const position = Math.min(1, Math.max(0, (value - min) / (max - min))) * (size - 1);
  const low = Math.floor(position);
  const high = Math.min(size - 1, low + 1);
  return [low, high, position - low];
}

function tableValue(values: Float32Array, size: number, red: number, green: number, blue: number, channel: number): number {
  return values[(((blue * size + green) * size + red) * 3) + channel];
}

function interpolate(upload: UploadedLut, red: number, green: number, blue: number, channel: number): number {
  const [r0, r1, rt] = coordinate(red, upload.domainMin[0], upload.domainMax[0], upload.size);
  const [g0, g1, gt] = coordinate(green, upload.domainMin[1], upload.domainMax[1], upload.size);
  const [b0, b1, bt] = coordinate(blue, upload.domainMin[2], upload.domainMax[2], upload.size);
  const value = (r: number, g: number, b: number) => tableValue(upload.values, upload.size, r, g, b, channel);
  const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
  const z0 = mix(mix(value(r0, g0, b0), value(r1, g0, b0), rt),
    mix(value(r0, g1, b0), value(r1, g1, b0), rt), gt);
  const z1 = mix(mix(value(r0, g0, b1), value(r1, g0, b1), rt),
    mix(value(r0, g1, b1), value(r1, g1, b1), rt), gt);
  return mix(z0, z1, bt);
}

export async function renderUpload(upload: UploadedLut, sampleId: string): Promise<string> {
  if (!isUploadedLut(upload)) throw new Error("This local LUT's data is corrupted and cannot be previewed.");
  if (!SAMPLE_IDS.has(sampleId)) throw new Error('The specified built-in sample image was not found.');
  const path = samplePath(upload.inputStyle, sampleId);
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new Error('The current browser environment cannot generate a LUT preview.');
  }

  let response: Response;
  try {
    response = await fetch(assetUrl(path));
  } catch (cause) {
    throw new Error('Unable to read the built-in sample image required for the LUT preview.', { cause });
  }
  if (!response.ok) throw new Error(`Unable to read the built-in sample image required for the LUT preview (HTTP ${response.status}).`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(await response.blob());
  } catch (cause) {
    throw new Error('The built-in sample image could not be decoded. Reload the page and try again.', { cause });
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
    if (!context) throw new Error('The browser cannot create a 2D preview canvas.');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height, { colorSpace: 'srgb' });
    const pixels = image.data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset] / 255;
      const green = pixels[offset + 1] / 255;
      const blue = pixels[offset + 2] / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        const value = interpolate(upload, red, green, blue, channel);
        pixels[offset + channel] = Math.round(Math.min(1, Math.max(0, value)) * 255);
      }
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/webp', 0.9);
  } catch (cause) {
    if (cause instanceof Error && /preview canvas/.test(cause.message)) throw cause;
    throw new Error('An error occurred while applying the LUT; no preview was generated.', { cause });
  } finally {
    bitmap.close();
  }
}
