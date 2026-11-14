import { measurePhotos, formatDecoderSpikeReport, type DecodedRgb } from '@/core/ai/decoder-spike';
import type { PreprocessingSpec } from '@/core/ai/image-preprocessing';

const spec: PreprocessingSpec = {
  inputSize: { width: 2, height: 2 },
  colorOrder: 'RGB',
  resize: { steps: [{ op: 'to_size', filter: 'nearest' }] },
  crop: 'none_stretch',
  rounding: 'half_up_uint8',
  normalization: { type: 'scale_offset', scale: 1, offset: 0 },
};

function decoded(tag: number, peakPssKb: number): DecodedRgb {
  return {
    width: 2,
    height: 2,
    rgb: Uint8Array.from([tag, 0, 0, tag, 0, 0, tag, 0, 0, tag, 0, 0]),
    sampleSize: 1,
    usedTargetSize: true,
    sourceWidth: 1000,
    sourceHeight: 800,
    exifOrientation: 1,
    peakPssKb,
    peakNativeHeapKb: 1000,
    peakJavaHeapKb: 2000,
  };
}

test('three photos run one after another and the report keeps the peak', async () => {
  const order: string[] = [];
  let clock = 0;
  const measurement = await measurePhotos(['a', 'b', 'c'], {
    minShortSide: 448,
    spec,
    startedAt: '2026-11-14T12:00:00.000Z',
    now: () => clock,
    readMemory: async () => ({ pssKb: 3000, nativeHeapKb: 1000, javaHeapKb: 2000 }),
    decode: async (uri) => {
      order.push(`start ${uri}`);
      clock += 10;
      order.push(`end ${uri}`);
      const peaks = { a: 10_000, b: 400_000, c: 20_000 };
      return decoded(1, peaks[uri as 'a' | 'b' | 'c'] ?? 0);
    },
  });

  expect(order).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  expect(measurement.photos.every((photo) => photo.ok)).toBe(true);
  expect(measurement.decodeSumMilliseconds).toBe(30);
  expect(measurement.peakPssKb).toBe(400_000);
  expect(measurement.photos[0]?.byteLength).toBe(12);
  expect(measurement.photos[0]?.tensorWidth).toBe(2);

  const report = formatDecoderSpikeReport(measurement);
  expect(report).toContain('400000 kB');
  expect(report).toContain('390.6 MB');
  expect(report).toContain('OOM: nie zgłoszono.');
  expect(report).toContain('To nie jest werdykt');
  expect(report).toContain('Xiaomi Mi 11');
  expect(report).toContain('Huawei P smart 2019');
});

test('an OOM on the second photo does not stop the third', async () => {
  const measurement = await measurePhotos(['a', 'b', 'c'], {
    minShortSide: 448,
    spec,
    startedAt: '2026-11-14T12:00:00.000Z',
    now: () => 0,
    readMemory: async () => ({ pssKb: 1, nativeHeapKb: 1, javaHeapKb: 1 }),
    decode: async (uri) => {
      if (uri === 'b') {
        const error = new Error('Brak pamięci przy dekodowaniu zdjęcia.');
        throw Object.assign(error, { code: 'oom' });
      }
      return decoded(2, 5);
    },
  });

  expect(measurement.photos.map((photo) => photo.ok)).toEqual([true, false, true]);
  expect(measurement.photos[1]?.errorCode).toBe('oom');
  expect(formatDecoderSpikeReport(measurement)).toContain('OOM: tak');
});

test('a missing memory reader is reported and decoding still finishes', async () => {
  const measurement = await measurePhotos(['a'], {
    minShortSide: 448,
    spec,
    startedAt: '2026-11-14T12:00:00.000Z',
    now: () => 0,
    readMemory: async () => {
      throw Object.assign(new Error('Dekoder zdjęć nie jest jeszcze dostępny na iOS.'), {
        code: 'unsupported',
      });
    },
    decode: async () => decoded(3, 8),
  });

  expect(measurement.photos[0]?.ok).toBe(true);
  expect(measurement.memoryError).toContain('iOS');
  expect(measurement.peakPssKb).toBe(8);
});
