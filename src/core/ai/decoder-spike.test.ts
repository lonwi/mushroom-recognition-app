import {
  measurePhotos,
  measurePhotoSeries,
  formatDecoderSpikeReport,
  formatDecoderSeriesReport,
  type DecodedRgb,
} from '@/core/ai/decoder-spike';
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
  expect(report).toContain('Xiaomi Mi 11 Lite 5G');
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

test('a series repeats the three photos and reports p95 plus the peak', async () => {
  let clock = 0;
  let run = 0;
  const series = await measurePhotoSeries(['a', 'b', 'c'], {
    runs: 2,
    minShortSide: 448,
    spec,
    startedAt: '2026-11-22T15:39:38.742Z',
    now: () => clock,
    readMemory: async () => ({ pssKb: 1000, nativeHeapKb: 100, javaHeapKb: 50 }),
    decode: async (uri) => {
      clock += 10;
      const peaks = run === 0 ? { a: 10_000, b: 20_000, c: 30_000 } : { a: 400_000, b: 1, c: 1 };
      if (uri === 'c') run += 1;
      return decoded(1, peaks[uri as 'a' | 'b' | 'c'] ?? 0);
    },
  });

  expect(series.runs).toHaveLength(2);
  expect(series.cancelled).toBe(false);
  expect(series.peakPssKb).toBe(400_000);
  expect(series.runs[0]?.preprocessSumMilliseconds).toBe(0);
  const report = formatDecoderSeriesReport(series);
  expect(report).toContain('Przebieg 1:');
  expect(report).toContain('Przebieg 2:');
  expect(report).toContain('Czas ściany (ms): n=2');
  expect(report).toContain('p95 30.0');
  expect(report).toContain('390.6 MB');
  expect(report).toContain('Inferencja');
  expect(report).toContain('Xiaomi Mi 11 Lite 5G');
});

test('a run with a failed photo stays out of the timing stats', async () => {
  let call = 0;
  const series = await measurePhotoSeries(['a', 'b'], {
    runs: 2,
    minShortSide: 448,
    spec,
    startedAt: '2026-11-22T15:39:38.742Z',
    now: () => 0,
    readMemory: async () => ({ pssKb: 1, nativeHeapKb: 1, javaHeapKb: 1 }),
    decode: async () => {
      call += 1;
      if (call <= 2) {
        throw Object.assign(new Error('plik uszkodzony'), { code: 'decode_failed' });
      }
      return decoded(1, 100);
    },
  });

  expect(series.runs.map((run) => run.ok)).toEqual([false, true]);
  const report = formatDecoderSeriesReport(series);
  expect(report).toContain('Udane: 1, nieudane: 1');
  expect(report).toContain('Przebieg 1: NIEUDANY');
  expect(report).toContain('zdjęcie 1: decode_failed — plik uszkodzony');
  expect(report).toContain('zdjęcie 2: decode_failed — plik uszkodzony');
  expect(report).toContain('Czas ściany (ms): n=1');
  expect(report).not.toContain('Czas ściany (ms): n=2');
});

test('cancel is checked between runs and keeps the finished one', async () => {
  let finished = 0;
  const series = await measurePhotoSeries(['a'], {
    runs: 5,
    minShortSide: 448,
    spec,
    startedAt: '2026-11-22T15:39:38.742Z',
    now: () => 0,
    shouldCancel: () => finished >= 1,
    readMemory: async () => ({ pssKb: 1, nativeHeapKb: 1, javaHeapKb: 1 }),
    decode: async () => {
      finished += 1;
      return decoded(1, 10);
    },
  });

  expect(finished).toBe(1);
  expect(series.runs).toHaveLength(1);
  expect(series.cancelled).toBe(true);
  expect(formatDecoderSeriesReport(series)).toContain('przerwana');
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
