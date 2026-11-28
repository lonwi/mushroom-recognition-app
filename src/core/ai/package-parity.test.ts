import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import parity from '../../../fixtures/p1/parity.json';
import { gridMaxAbsDiff } from '@/core/ai/inference-measurement';
import {
  preprocessImage,
  readPreprocessingSpec,
  type RgbImage,
} from '@/core/ai/image-preprocessing';
import { INFERENCE_PARITY_SHA256, P1_IMAGE_SHA256 } from '@/core/ai/inference-package';

const TOLERANCE = 1e-5;

type Sample = {
  coords: [number, number][];
  values: number[];
};

type ParityCase = {
  id: string;
  image: string;
  imageSha256: string;
  preprocessing: unknown;
  expected: {
    uint8: { sha256: string; sample: Sample };
    float: { shape: number[]; sha256: string; sample: Sample };
  };
};

const file = parity as unknown as { tolerance: number; cases: ParityCase[] };
const imageDir = path.join('fixtures', 'p1', 'images');

function sha256(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function decodeRgb(filePath: string): Promise<RgbImage> {
  const { data, info } = await sharp(filePath)
    .rotate()
    .toColorspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`${filePath} ma ${info.channels} kanałów.`);
  return { width: info.width, height: info.height, rgb: new Uint8Array(data) };
}

test('parity.json paczki ma sumę z manifestu i tolerancję 1e-5', () => {
  const digest = sha256(readFileSync('fixtures/p1/parity.json'));
  expect(digest).toBe(INFERENCE_PARITY_SHA256);
  expect(file.tolerance).toBe(TOLERANCE);
  expect(file.cases.length).toBeGreaterThan(0);
});

test('każdy przypadek P1 ma specyfikację preprocessingu i próbkę siatki', () => {
  for (const entry of file.cases) {
    const spec = readPreprocessingSpec(entry.preprocessing);
    expect(spec.inputSize.width).toBe(entry.expected.float.shape[1]);
    expect(spec.inputSize.height).toBe(entry.expected.float.shape[0]);
    expect(entry.expected.float.sample.values).toHaveLength(
      entry.expected.float.sample.coords.length * 3,
    );
    expect(P1_IMAGE_SHA256[path.basename(entry.image) as keyof typeof P1_IMAGE_SHA256]).toBe(
      entry.imageSha256,
    );
  }
  const modelCase = file.cases.find((entry) => entry.id === 'baseline_256_pattern_64x48');
  const spec = readPreprocessingSpec(modelCase?.preprocessing);
  expect(spec.normalization).toEqual({
    type: 'scale_offset',
    scale: 0.00784313725490196,
    offset: -1,
  });
  expect(spec.resize.steps.map((step) => step.op)).toEqual(['to_width', 'to_size']);
  expect(spec.crop).toBe('none_stretch');
  expect(spec.rounding).toBe('half_up_uint8');
});

const imagesReady = Object.keys(P1_IMAGE_SHA256).every((name) =>
  existsSync(path.join(imageDir, name)),
);

// Pięć PNG jest w paczce modelu, nie w gicie (małe, ale binarne i przypięte sha256).
// Gdy leżą w fixtures/p1/images, test porównuje tensor z fixture. Na telefonie
// ten sam przypadek EXIF liczy ekran po pobraniu buildowym.
(imagesReady ? test.each : test.skip.each)(file.cases.map((entry) => [entry.id, entry] as const))(
  'P1 tensor %s',
  async (_id, entry) => {
    const filePath = path.join(imageDir, path.basename(entry.image));
    const digest = sha256(readFileSync(filePath));
    expect(digest).toBe(entry.imageSha256);
    const image = await decodeRgb(filePath);
    const spec = readPreprocessingSpec(entry.preprocessing);
    const tensor = preprocessImage(image, spec);
    expect(tensor.dtype).toBe('float32');
    if (!(tensor.data instanceof Float32Array)) throw new Error('oczekiwano float32');
    const bytes = Buffer.from(tensor.data.buffer, tensor.data.byteOffset, tensor.data.byteLength);
    expect(sha256(bytes)).toBe(entry.expected.float.sha256);
    const diff = gridMaxAbsDiff(tensor.data, tensor.width, entry.expected.float.sample);
    expect(diff).toBeLessThanOrEqual(TOLERANCE);
  },
);

test('siatka P1 czyta NHWC po współrzędnych wiersz-kolumna', () => {
  const data = Float32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const diff = gridMaxAbsDiff(data, 2, {
    coords: [
      [0, 1],
      [1, 0],
    ],
    values: [3, 4, 5, 6, 7, 8],
  });
  expect(diff).toBe(0);
});
