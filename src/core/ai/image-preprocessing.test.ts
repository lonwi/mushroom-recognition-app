import { readFileSync } from 'node:fs';

import exampleManifest from '../../../fixtures/model-manifest.example.json';
import parity from '../../../ml/fixtures/p1/parity.json';
import {
  PreprocessError,
  preprocessImage,
  readPreprocessingSpec,
  type PreprocessingSpec,
  type RgbImage,
} from '@/core/ai/image-preprocessing';

type ParityCase = {
  name: string;
  guarantee: string;
  modelSize: number;
  width: number;
  height: number;
  rgbBase64: string;
  expectedFloat32Base64: string;
  absTolerance: number;
  spec: unknown;
};

type ParityFile = {
  description: string;
  absTolerance: number;
  cases: ParityCase[];
};

const file = parity as ParityFile;

function rgbFromCase(entry: ParityCase): RgbImage {
  const bytes = Uint8Array.from(Buffer.from(entry.rgbBase64, 'base64'));
  return { width: entry.width, height: entry.height, rgb: bytes };
}

function expectedFloats(entry: ParityCase): Float32Array {
  const bytes = Uint8Array.from(Buffer.from(entry.expectedFloat32Base64, 'base64'));
  const aligned = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(aligned).set(bytes);
  return new Float32Array(aligned);
}

function maxAbsDiff(actual: Float32Array, expected: Float32Array): number {
  let max = 0;
  for (let i = 0; i < actual.length; i += 1) {
    const left = actual[i];
    const right = expected[i];
    if (left === undefined || right === undefined) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(left) || !Number.isFinite(right)) return Number.POSITIVE_INFINITY;
    const delta = Math.abs(left - right);
    if (delta > max) max = delta;
  }
  return max;
}

test('niefinitywna wartość nie przechodzi porównania parytetu', () => {
  expect(maxAbsDiff(Float32Array.from([Number.NaN]), Float32Array.from([1]))).toBe(
    Number.POSITIVE_INFINITY,
  );
});

test('P1 opisuje zgodność z ml/preprocess.py, nie z dekoderem JPEG', () => {
  expect(file.description).toContain('ml.preprocess.preprocess_rgb_uint8');
  expect(file.description).toContain('podpróbkowania natywnego');
  const sizes = new Set(file.cases.map((entry) => entry.modelSize));
  expect(sizes.size).toBeGreaterThan(1);
  expect(file.cases.some((entry) => entry.guarantee === 'p1-preprocess-py')).toBe(true);
  expect(file.cases.some((entry) => entry.guarantee === 'p1-derived')).toBe(true);
});

test.each(file.cases.map((entry) => [entry.name, entry] as const))('parity %s', (_name, entry) => {
  const spec = readPreprocessingSpec(entry.spec, { minimumSize: 1 });
  const tensor = preprocessImage(rgbFromCase(entry), spec);
  expect(tensor.dtype).toBe('float32');
  expect(tensor.layout).toBe('NHWC');
  expect(tensor.width).toBe(spec.inputSize.width);
  expect(tensor.height).toBe(spec.inputSize.height);
  if (!(tensor.data instanceof Float32Array)) throw new Error('oczekiwano float32');
  const expected = expectedFloats(entry);
  expect(tensor.data.length).toBe(expected.length);
  const diff = maxAbsDiff(tensor.data, expected);
  expect(diff).toBeLessThanOrEqual(entry.absTolerance);
});

test('produkcyjny resampling nie wpisuje rozmiaru ani skali prototypu', () => {
  const source = readFileSync('src/core/ai/image-preprocessing.ts', 'utf8');
  expect(source).not.toMatch(/\b224\b/);
  expect(source).not.toMatch(/\b256\b/);
  expect(source).not.toContain('127.5');
});

test('przykładowy manifest steruje rozmiarem, nie stała w kodzie', () => {
  const spec = readPreprocessingSpec(exampleManifest.preprocessing);
  expect(spec.inputSize).toEqual(exampleManifest.preprocessing.inputSize);
  expect(spec.decodeMinWidth).toBe(exampleManifest.preprocessing.decodeMinWidth);
  const image: RgbImage = {
    width: 2,
    height: 2,
    rgb: Uint8Array.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]),
  };
  const tensor = preprocessImage(image, spec);
  expect(tensor.width).toBe(spec.inputSize.width);
  expect(tensor.height).toBe(spec.inputSize.height);
  expect(tensor.data.length).toBe(spec.inputSize.width * spec.inputSize.height * 3);
});

test('inny rozmiar i inna normalizacja zmieniają tensor', () => {
  const image: RgbImage = {
    width: 2,
    height: 2,
    rgb: Uint8Array.from([8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]),
  };
  const base: PreprocessingSpec = {
    inputSize: { width: 2, height: 2 },
    colorOrder: 'RGB',
    resize: { steps: [{ op: 'to_size', filter: 'nearest' }] },
    crop: 'none_stretch',
    rounding: 'half_up_uint8',
    normalization: { type: 'scale_offset', scale: 0.5, offset: 0.25 },
  };
  const tensor = preprocessImage(image, base);
  expect(Array.from(tensor.data).every((value) => value === 8 * 0.5 + 0.25)).toBe(true);

  const bigger = preprocessImage(image, {
    ...base,
    inputSize: { width: 3, height: 3 },
  });
  expect(bigger.data.length).toBe(27);

  const shifted = preprocessImage(image, {
    ...base,
    normalization: { type: 'scale_offset', scale: 0.5, offset: 1 },
  });
  expect(shifted.data[0]).not.toBe(tensor.data[0]);
});

test('kadrowanie środka i letterbox są liczone z manifestu', () => {
  const rows = Uint8Array.from([
    1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 0, 7, 0, 0, 8, 0, 0,
  ]);
  const center = preprocessImage(
    { width: 2, height: 4, rgb: rows },
    {
      inputSize: { width: 2, height: 2 },
      colorOrder: 'RGB',
      resize: { steps: [{ op: 'to_width', value: 10, filter: 'box' }] },
      crop: 'center',
      rounding: 'half_up_uint8',
      normalization: { type: 'scale_offset', scale: 1, offset: 0 },
    },
  );
  expect(Array.from(center.data)).toEqual([3, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 0]);

  const boxed = preprocessImage(
    { width: 2, height: 1, rgb: Uint8Array.from([9, 8, 7, 6, 5, 4]) },
    {
      inputSize: { width: 2, height: 2 },
      colorOrder: 'RGB',
      resize: { steps: [{ op: 'to_width', value: 10, filter: 'box' }] },
      crop: 'letterbox',
      letterboxFill: [0, 0, 0],
      rounding: 'half_up_uint8',
      normalization: { type: 'scale_offset', scale: 1, offset: 0 },
    },
  );
  expect(Array.from(boxed.data)).toEqual([9, 8, 7, 6, 5, 4, 0, 0, 0, 0, 0, 0]);
});

test('krótszy bok i stały obraz zostają przy filtrze box', () => {
  const rgb = new Uint8Array(4 * 2 * 3).fill(80);
  const tensor = preprocessImage(
    { width: 4, height: 2, rgb },
    {
      inputSize: { width: 2, height: 1 },
      colorOrder: 'RGB',
      resize: { steps: [{ op: 'shorter_side', value: 1, filter: 'box', antialias: true }] },
      crop: 'none_stretch',
      rounding: 'half_up_uint8',
      normalization: { type: 'none_uint8' },
    },
  );
  expect(tensor.dtype).toBe('uint8');
  expect(tensor.width).toBe(2);
  expect(tensor.height).toBe(1);
  expect(Array.from(tensor.data)).toEqual([80, 80, 80, 80, 80, 80]);
});

test('specyfikacja odrzuca filtr box bez antyaliasingu i zły bufor', () => {
  expect(() =>
    readPreprocessingSpec(
      {
        inputSize: { width: 8, height: 8 },
        colorOrder: 'RGB',
        resize: { steps: [{ op: 'to_size', filter: 'lanczos' }] },
        crop: 'none_stretch',
        rounding: 'half_up_uint8',
        normalization: { type: 'none_uint8' },
      },
      { minimumSize: 1 },
    ),
  ).toThrow(PreprocessError);

  const spec = readPreprocessingSpec(
    {
      inputSize: { width: 2, height: 2 },
      colorOrder: 'RGB',
      resize: { steps: [{ op: 'to_size', filter: 'box', antialias: false }] },
      crop: 'none_stretch',
      rounding: 'half_up_uint8',
      normalization: { type: 'none_uint8' },
    },
    { minimumSize: 1 },
  );
  expect(() => preprocessImage({ width: 2, height: 2, rgb: new Uint8Array(12) }, spec)).toThrow(
    PreprocessError,
  );
  expect(() => preprocessImage({ width: 2, height: 2, rgb: new Uint8Array(3) }, spec)).toThrow(
    PreprocessError,
  );
});
