/**
 * Pobiera paczkę 0.2.0-rc1-test tylko dla buildów z EXPO_PUBLIC_DEV_TOOLS=1.
 * Token jest w nagłówku, nigdy w adresie, w logu i w pliku.
 * Niezgodność sha256 przerywa build. Brak sekretu zostawia ekran z brakiem modelu.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readGoldenRecords } from '../src/core/ai/inference-measurement';
import {
  INFERENCE_GOLDEN_COUNT,
  INFERENCE_GOLDEN_PATH,
  INFERENCE_GOLDEN_SHA256,
  INFERENCE_MANIFEST_PATH,
  INFERENCE_MANIFEST_SHA256,
  INFERENCE_MODEL_BYTES,
  INFERENCE_MODEL_FILE,
  INFERENCE_MODEL_SHA256,
  P1_IMAGE_SHA256,
  datasetResolveUrl,
  modelResolveUrl,
  planInferenceFetch,
} from '../src/core/ai/inference-package';
import { readHfToken, safeError } from './import-hf-photos';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'inference');
const ASSET_MODULE = path.join(OUT, 'package-asset.js');

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function matches(target: string, expectedSha: string, expectedBytes?: number): boolean {
  if (!existsSync(target)) return false;
  const bytes = readFileSync(target);
  if (sha256(bytes) !== expectedSha) return false;
  return expectedBytes === undefined || bytes.length === expectedBytes;
}

function writeVerified(
  target: string,
  bytes: Buffer,
  expectedSha: string,
  expectedBytes?: number,
): void {
  const actual = sha256(bytes);
  if (actual !== expectedSha) {
    throw new Error(`${path.basename(target)}: sha256 ${actual} różni się od ${expectedSha}.`);
  }
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new Error(
      `${path.basename(target)}: rozmiar ${bytes.length} B różni się od ${expectedBytes} B.`,
    );
  }
  mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.partial`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, target);
}

async function download(token: string, url: string, label: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Hugging Face odrzucił HF_TOKEN_READONLY przy ${label}. Wartość tokenu nie trafia do logu.`,
        );
      }
      if (!response.ok) {
        throw new Error(`Hugging Face zwrócił ${response.status} dla ${label}.`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('HF_TOKEN_READONLY')) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Nie udało się pobrać ${label}.`);
}

async function ensureFile(
  token: string,
  target: string,
  url: string,
  label: string,
  expectedSha: string,
  expectedBytes?: number,
): Promise<void> {
  if (matches(target, expectedSha, expectedBytes)) return;
  const bytes = await download(token, url, label);
  writeVerified(target, bytes, expectedSha, expectedBytes);
}

async function pooled<T>(items: readonly T[], worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(4, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) await worker(item);
    }
  });
  await Promise.all(runners);
}

function writeAssetModule(goldenCount: number): void {
  const requires = Array.from({ length: goldenCount }, (_, index) => {
    const name = `${String(index).padStart(4, '0')}.jpg`;
    return `    require('./golden/${name}'),`;
  });
  const source = [
    '// Generowane przez scripts/fetch-inference-package.ts. Katalog jest w .gitignore.',
    'const asset = {',
    `  model: require('./${INFERENCE_MODEL_FILE}'),`,
    "  manifest: require('./model-manifest.json'),",
    "  goldenIndex: require('./golden_images.json'),",
    '  golden: [',
    ...requires,
    '  ],',
    '  p1: {',
    "    exifOrient6: require('./p1/exif_orient6_96x64.png'),",
    '  },',
    '};',
    'export default asset;',
    '',
  ].join('\n');
  writeFileSync(ASSET_MODULE, source);
}

async function fetchPackage(token: string): Promise<void> {
  rmSync(ASSET_MODULE, { force: true });
  await ensureFile(
    token,
    path.join(OUT, INFERENCE_MODEL_FILE),
    modelResolveUrl(INFERENCE_MODEL_FILE),
    INFERENCE_MODEL_FILE,
    INFERENCE_MODEL_SHA256,
    INFERENCE_MODEL_BYTES,
  );
  await ensureFile(
    token,
    path.join(OUT, 'model-manifest.json'),
    modelResolveUrl(INFERENCE_MANIFEST_PATH),
    INFERENCE_MANIFEST_PATH,
    INFERENCE_MANIFEST_SHA256,
  );
  const goldenTarget = path.join(OUT, 'golden_images.json');
  await ensureFile(
    token,
    goldenTarget,
    modelResolveUrl(INFERENCE_GOLDEN_PATH),
    INFERENCE_GOLDEN_PATH,
    INFERENCE_GOLDEN_SHA256,
  );
  const records = readGoldenRecords(JSON.parse(readFileSync(goldenTarget, 'utf8')));
  if (records.length !== INFERENCE_GOLDEN_COUNT) {
    throw new Error(
      `Złotych zdjęć jest ${records.length}, a oczekiwano ${INFERENCE_GOLDEN_COUNT}.`,
    );
  }
  const indexes = new Set(records.map((record) => record.index));
  if (indexes.size !== records.length || records.some((record, index) => record.index !== index)) {
    throw new Error('Indeksy złotych zdjęć nie są ciągłe od zera.');
  }
  await pooled(records, async (record) => {
    const filename = `${String(record.index).padStart(4, '0')}.jpg`;
    await ensureFile(
      token,
      path.join(OUT, 'golden', filename),
      datasetResolveUrl(record.relativePath),
      record.relativePath,
      record.imageSha256,
    );
  });
  const p1Entries = Object.entries(P1_IMAGE_SHA256);
  await pooled(p1Entries, async ([name, digest]) => {
    await ensureFile(
      token,
      path.join(OUT, 'p1', name),
      modelResolveUrl(`fixtures/p1/images/${name}`),
      `fixtures/p1/images/${name}`,
      digest,
    );
  });
  writeAssetModule(records.length);
  const modelBytes = readFileSync(path.join(OUT, INFERENCE_MODEL_FILE)).length;
  console.log(
    `Paczka inferencji ${INFERENCE_MODEL_FILE} gotowa: model ${modelBytes} B, złote zdjęcia ${records.length}. Rewizja przypięta, sha256 zgodne.`,
  );
}

async function main(): Promise<void> {
  const plan = planInferenceFetch(process.env);
  if (plan === 'skip-production') {
    console.log('Paczka inferencji pominięta: build bez EXPO_PUBLIC_DEV_TOOLS=1.');
    return;
  }
  if (plan === 'skip-no-token') {
    console.warn(
      'Paczka inferencji pominięta: brak sekretu HF_TOKEN_READONLY. Ekran pokaże brak modelu. Wartość tokenu nie trafia do logu.',
    );
    return;
  }
  const token = readHfToken();
  if (!token) return;
  try {
    await fetchPackage(token);
  } catch (error) {
    rmSync(ASSET_MODULE, { force: true });
    console.error(safeError(error, token));
    process.exitCode = 1;
  }
}

void main();
