import { decideLogits } from '@/core/ai/logit-decision';
import {
  formatInferenceSummary,
  measureInference,
  readGoldenRecords,
  type GoldenFrame,
  type MeasureInferenceInput,
} from '@/core/ai/inference-measurement';

const classIds = ['syn_a', 'syn_b'];
const temperatures = { probability: 1, energy: 1 };
const thresholds = { energyThreshold: 10, minTop1Prob: 0.1 };
const reference = [4, 0];

function frame(index: number, logits: readonly number[] = reference): GoldenFrame {
  const decision = decideLogits(logits, classIds, temperatures, thresholds);
  return {
    index,
    photoId: `p${index}`,
    relativePath: `images/syn/p${index}.jpg`,
    imageSha256: `sha-${index}`,
    uri: `file:///golden/${index}.jpg`,
    referenceLogits: logits,
    expectedStatus: decision.status,
  };
}

function harness(overrides: Partial<MeasureInferenceInput> = {}): MeasureInferenceInput {
  let clock = 0;
  return {
    startedAt: '2026-11-28T00:00:00.000Z',
    modelVersion: '0.2.0-rc1-test',
    tfliteSha256: 'abc',
    classIds,
    temperatures,
    singleThresholds: thresholds,
    fusionThresholds: { 2: thresholds, 3: thresholds },
    frames: [frame(0), frame(1), frame(2)],
    latencyRuns: 2,
    device: { platform: 'android', brand: 'Xiaomi', modelName: 'M2101K9AG', osVersion: '13' },
    buildProfile: 'preview',
    now: () => {
      clock += 5;
      return clock;
    },
    shouldCancel: () => false,
    afterEach: async () => undefined,
    load: async () => undefined,
    preprocess: () => Float32Array.from([0, 1, 2]),
    run: async () => Float32Array.from(reference),
    decode: async () => ({
      width: 2,
      height: 1,
      rgb: Uint8Array.from([1, 2, 3, 4, 5, 6]),
      exifOrientation: 1,
      peakPssKb: 1000,
      peakNativeHeapKb: 200,
      peakJavaHeapKb: 50,
    }),
    readMemory: async () => ({ pssKb: 1100, nativeHeapKb: 220, javaHeapKb: 60 }),
    ...overrides,
  };
}

test('seria czasu i parytet zapisują logity urządzenia oraz progi', async () => {
  const dump = await measureInference(harness());
  expect(dump.delegate).toBe('cpu');
  expect(dump.nnapi).toBe(false);
  expect(dump.loadColdMilliseconds).toBe(5);
  expect(dump.warmupMilliseconds).not.toBeNull();
  expect(dump.single?.total.count).toBe(2);
  expect(dump.single?.total.p50).toBeGreaterThan(0);
  expect(dump.single?.total.p95).toBeGreaterThan(0);
  expect(dump.session3?.total.count).toBe(2);
  expect(dump.session3?.fusion?.count).toBe(2);
  expect(dump.images).toHaveLength(3);
  expect(dump.images[0]?.deviceLogits).toEqual(reference);
  expect(dump.images[0]?.top1Match).toBe(true);
  expect(dump.images[0]?.decisionMatch).toBe(true);
  expect(dump.parity?.deviceParityP3).toBe(1);
  expect(dump.parity?.decisionStatusAgreement).toBe(1);
  expect(dump.parity?.maxAbsLogitDiff).toBe(0);
  expect(dump.parity?.complete).toBe(true);
  expect(dump.thresholds.single).toBe('pass');
  expect(dump.thresholds.session).toBe('pass');
  expect(dump.thresholds.parity).toBe('pass');
  expect(dump.memory.peakPssKb).toBe(1100);
  expect(dump.cancelled).toBe(false);
  expect(JSON.stringify(dump)).not.toMatch(/edib|jadaln|verdict/i);
  expect(formatInferenceSummary(dump)).toContain('nie ocenia jadalności');
  expect(formatInferenceSummary(dump)).toContain('Xiaomi Mi 11 Lite 5G');
  expect(formatInferenceSummary(dump)).not.toMatch(/Huawei/);
});

test('anulowanie między zdjęciami nie zostawia pomiaru w stanie, który blokuje kolejny start', async () => {
  let parityImages = 0;
  const first = await measureInference(
    harness({
      shouldCancel: () => parityImages >= 1,
      decode: async () => {
        parityImages += 1;
        return {
          width: 2,
          height: 1,
          rgb: Uint8Array.from([1, 2, 3, 4, 5, 6]),
          exifOrientation: 1,
          peakPssKb: 1,
          peakNativeHeapKb: 1,
          peakJavaHeapKb: 1,
        };
      },
    }),
  );
  expect(first.cancelled).toBe(true);
  expect(first.images.length).toBeLessThan(3);
  expect(first.thresholds.parity).toBeNull();

  const second = await measureInference(harness());
  expect(second.cancelled).toBe(false);
  expect(second.images).toHaveLength(3);
  expect(second.thresholds.single).toBe('pass');
});

test('błąd ładowania modelu nie udaje czasu ani parytetu', async () => {
  const dump = await measureInference(
    harness({
      load: async () => {
        throw new Error('brak pliku modelu');
      },
    }),
  );
  expect(dump.loadColdMilliseconds).toBeNull();
  expect(dump.single).toBeNull();
  expect(dump.images).toEqual([]);
  expect(dump.failures[0]?.phase).toBe('load');
  expect(dump.thresholds.single).toBeNull();
});

test('niezgodna długość logitów obniża deviceParityP3 i nie jest kompletnym parytetem', async () => {
  const dump = await measureInference(
    harness({
      run: async () => Float32Array.from([1, 2, 3]),
    }),
  );
  expect(dump.parity?.deviceParityP3).toBe(0);
  expect(dump.parity?.complete).toBe(false);
  expect(dump.images[0]?.error).toContain('Liczba logitów');
  expect(dump.thresholds.parity).toBeNull();
});

test('golden_images odrzuca ścieżkę wychodzącą z katalogu', () => {
  expect(() =>
    readGoldenRecords({
      count: 1,
      images: [
        {
          index: 0,
          photoId: 'a',
          relativePath: '../secret.jpg',
          imageSha256: 'aa',
          tfliteFp16Logits: [0],
          expectedDecision: { status: 'ok' },
        },
      ],
    }),
  ).toThrow(/ścieżk/i);
});
