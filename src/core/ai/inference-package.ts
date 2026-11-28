/**
 * Paczka pomiarowa 0.2.0-rc1-test. Adresy są publiczne, tokenu tu nie ma.
 * Pobranie jest tylko w skrypcie builda, z sekretu HF_TOKEN_READONLY.
 */

const INFERENCE_MODEL_REPO = 'lonwi/grzybobranie-ai-models';
export const INFERENCE_REVISION = '0.2.0-rc1-test';
const INFERENCE_DATASET_REPO = 'lonwi/grzybobranie-zdjecia';
const INFERENCE_DATASET_REVISION = 'main';

export const INFERENCE_MODEL_FILE = 'mobilenetv4_hybrid_medium_r256_fp16.tflite';
export const INFERENCE_MODEL_SHA256 =
  '77fb25ddff9cef6395732785897763d8c281568d1ad479eb3989a89a0f50a9ed';
export const INFERENCE_MODEL_BYTES = 20_216_416;

export const INFERENCE_MANIFEST_PATH = 'model-manifest.json';
export const INFERENCE_MANIFEST_SHA256 =
  'e0980337462f6bea0d798f9e5e69c42caab8afaeb0387871e1914e5d554603fd';

export const INFERENCE_GOLDEN_PATH = 'p7_parity/golden_images.json';
export const INFERENCE_GOLDEN_SHA256 =
  '394297a4102432228ce54ac5de7fe510058149011bea1cf9b7bdf1e1cb16284c';
export const INFERENCE_GOLDEN_COUNT = 240;

export const INFERENCE_PARITY_SHA256 =
  'e5f77af0b9036bb86006964f6ac22d896b984dd7dddc5d5a05d6954c89ea4b54';

export const P1_IMAGE_SHA256 = {
  'exif_orient6_96x64.png': '8059c0562564db58e4ad316e10c4262a76c95e3a5ba0f0362d35b004e400ff2a',
  'gray_48x40.png': 'baf7475f8f69ec84cf6f166fed534cc047c6ae0f5ec0dab76cf81f23c1154d37',
  'pattern_64x48.png': 'a6415229734d88779fd5c826758e2dafb116979dfe2e4ab95c55e4345b6b0c98',
  'rgba_48x40.png': '18f5509c73d76ab8518e957afeedd277b26b10692e3f74daa52ad6a8cad433e3',
  'wide_640x320.png': '285d28b5298edc9d0ff3ac1b211e746cd23e18c66fe2b062ca1fcb111d33f313',
} as const;

/** p95 czasu preprocessingu i inferencji jednego zdjęcia. Tylko Mi 11 Lite 5G. */
export const SINGLE_P95_BUDGET_MS = 2000;
/** p95 sesji: preprocessing trzech zdjęć, trzy inferencje i fuzja. Tylko Mi 11 Lite 5G. */
export const SESSION_P95_BUDGET_MS = 5000;
/** Zgodność top-1 urządzenia z TFLite FP16 na 240 złotych zdjęciach. */
export const DEVICE_PARITY_MIN = 0.99;

export const INFERENCE_SERIES_COUNTS = [1, 5, 10, 20] as const;
export const DEFAULT_INFERENCE_SERIES_COUNT = 10;

class InferencePackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InferencePackageError';
  }
}

/** Ścieżka względna z manifestu albo golden_images.json. Odrzuca wyjście z katalogu. */
export function assertSafeRelativePath(value: string): string {
  if (value.length === 0 || value.startsWith('/') || value.includes('\\') || value.includes('\0')) {
    throw new InferencePackageError('Ścieżka pliku jest pusta albo bezwzględna.');
  }
  if (value.split('/').some((part) => part === '..' || part === '')) {
    throw new InferencePackageError('Ścieżka pliku wychodzi poza katalog paczki.');
  }
  return value;
}

export function modelResolveUrl(relativePath: string): string {
  const path = assertSafeRelativePath(relativePath);
  return `https://huggingface.co/${INFERENCE_MODEL_REPO}/resolve/${INFERENCE_REVISION}/${path}`;
}

export function datasetResolveUrl(relativePath: string): string {
  const path = assertSafeRelativePath(relativePath);
  return `https://huggingface.co/datasets/${INFERENCE_DATASET_REPO}/resolve/${INFERENCE_DATASET_REVISION}/${path}`;
}

export type FetchPlan = 'skip-production' | 'skip-no-token' | 'fetch';

/**
 * Produkcja nie pobiera wag ani złotych zdjęć. Brak sekretu nie wywraca builda:
 * ekran pokaże, że modelu nie ma. Niezgodność sha256 jest osobno i przerywa build.
 */
export function planInferenceFetch(env: NodeJS.ProcessEnv): FetchPlan {
  if (env.EXPO_PUBLIC_DEV_TOOLS !== '1') return 'skip-production';
  const token = env.HF_TOKEN_READONLY;
  if (typeof token !== 'string' || token.trim().length === 0) return 'skip-no-token';
  return 'fetch';
}
