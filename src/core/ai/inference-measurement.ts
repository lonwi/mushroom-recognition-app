/**
 * Pomiar spike'a B: czas ładowania, jedno zdjęcie, sesja trzech zdjęć i parytet P3.
 * Nie orzeka o jadalności. Progi czasu i parytetu dotyczą tylko Xiaomi Mi 11 Lite 5G.
 */

import type { RgbImage } from '@/core/ai/image-preprocessing';
import {
  DEVICE_PARITY_MIN,
  SESSION_P95_BUDGET_MS,
  SINGLE_P95_BUDGET_MS,
  assertSafeRelativePath,
} from '@/core/ai/inference-package';
import {
  decideLogits,
  fuseLogits,
  type DecisionStatus,
  type GateThresholds,
  type TemperaturePair,
} from '@/core/ai/logit-decision';
import { durationStats, type DurationStats } from '@/core/measure/duration-stats';

const DELEGATE_DUMP_KIND = 'grzybobranie.delegate-dump';
const DELEGATE_DUMP_VERSION = 1;

type MemoryReading = {
  pssKb: number;
  nativeHeapKb: number;
  javaHeapKb: number;
};

type DecodedFrame = {
  width: number;
  height: number;
  rgb: Uint8Array;
  exifOrientation: number;
  peakPssKb: number;
  peakNativeHeapKb: number;
  peakJavaHeapKb: number;
};

export type GoldenFrame = {
  index: number;
  photoId: string;
  relativePath: string;
  imageSha256: string;
  uri: string;
  referenceLogits: readonly number[];
  expectedStatus: DecisionStatus;
};

type DumpImage = {
  index: number;
  photoId: string;
  relativePath: string;
  imageSha256: string;
  deviceLogits: number[] | null;
  decodeMilliseconds: number | null;
  preprocessMilliseconds: number | null;
  inferenceMilliseconds: number | null;
  top1Index: number | null;
  top1ClassId: string | null;
  decisionStatus: DecisionStatus | null;
  expectedStatus: DecisionStatus;
  top1Match: boolean;
  decisionMatch: boolean;
  maxAbsLogitDiff: number | null;
  error: string | null;
};

type LatencyStats = {
  preprocess: DurationStats;
  inference: DurationStats;
  fusion: DurationStats | null;
  total: DurationStats;
};

type ThresholdMark = 'pass' | 'fail';

export type DelegateDump = {
  kind: typeof DELEGATE_DUMP_KIND;
  formatVersion: typeof DELEGATE_DUMP_VERSION;
  startedAt: string;
  modelVersion: string;
  tfliteSha256: string;
  classes: readonly string[];
  delegate: 'cpu';
  nnapi: false;
  device: {
    platform: string;
    brand: string | null;
    modelName: string | null;
    osVersion: string | null;
  };
  build: {
    profile: string;
  };
  loadColdMilliseconds: number | null;
  warmupMilliseconds: number | null;
  single: LatencyStats | null;
  session3: LatencyStats | null;
  parity: {
    count: number;
    scored: number;
    top1Agreement: number;
    decisionStatusAgreement: number;
    /** Ułamek top-1 zgodny z referencyjnym TFLite FP16. Mianownik to liczba złotych zdjęć. */
    deviceParityP3: number;
    maxAbsLogitDiff: number | null;
    meanAbsLogitDiff: number | null;
    complete: boolean;
  } | null;
  thresholds: {
    singleP95Ms: number;
    sessionP95Ms: number;
    deviceParityMin: number;
    single: ThresholdMark | null;
    session: ThresholdMark | null;
    parity: ThresholdMark | null;
    decision: ThresholdMark | null;
  };
  memory: {
    peakPssKb: number | null;
    peakNativeHeapKb: number | null;
    peakJavaHeapKb: number | null;
    error?: string;
  };
  failures: { phase: string; message: string }[];
  cancelled: boolean;
  images: DumpImage[];
  p1Exif: { status: 'pass' | 'fail' | 'unavailable'; detail: string };
};

export type MeasureInferenceInput = {
  startedAt: string;
  modelVersion: string;
  tfliteSha256: string;
  classIds: readonly string[];
  temperatures: TemperaturePair;
  singleThresholds: GateThresholds;
  fusionThresholds: { readonly 2: GateThresholds; readonly 3: GateThresholds };
  frames: readonly GoldenFrame[];
  latencyRuns: number;
  device: DelegateDump['device'];
  buildProfile: string;
  now: () => number;
  shouldCancel: () => boolean;
  afterEach: () => Promise<void>;
  load: () => Promise<void>;
  preprocess: (image: RgbImage) => Float32Array;
  run: (input: Float32Array) => Promise<Float32Array>;
  decode: (uri: string) => Promise<DecodedFrame>;
  readMemory: () => Promise<MemoryReading>;
  onProgress?: (phase: string, completed: number, total: number) => void;
};

type Peak = { pss: number; native: number; java: number } | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Pomiar nie doszedł do końca.';
}

function consider(peak: Peak, sample: MemoryReading): Peak {
  return {
    pss: Math.max(peak?.pss ?? sample.pssKb, sample.pssKb),
    native: Math.max(peak?.native ?? sample.nativeHeapKb, sample.nativeHeapKb),
    java: Math.max(peak?.java ?? sample.javaHeapKb, sample.javaHeapKb),
  };
}

function argmax(values: readonly number[]): number {
  let index = 0;
  let best = values[0] ?? Number.NEGATIVE_INFINITY;
  for (let cursor = 1; cursor < values.length; cursor += 1) {
    const value = values[cursor] ?? Number.NEGATIVE_INFINITY;
    if (value > best) {
      best = value;
      index = cursor;
    }
  }
  return index;
}

function logitDiff(
  device: readonly number[],
  reference: readonly number[],
): { max: number; sum: number; count: number } | null {
  if (device.length !== reference.length || device.length === 0) return null;
  let max = 0;
  let sum = 0;
  for (let index = 0; index < device.length; index += 1) {
    const delta = Math.abs((device[index] ?? 0) - (reference[index] ?? 0));
    sum += delta;
    if (delta > max) max = delta;
  }
  return { max, sum, count: device.length };
}

function emptyDump(input: MeasureInferenceInput): DelegateDump {
  return {
    kind: DELEGATE_DUMP_KIND,
    formatVersion: DELEGATE_DUMP_VERSION,
    startedAt: input.startedAt,
    modelVersion: input.modelVersion,
    tfliteSha256: input.tfliteSha256,
    classes: input.classIds,
    delegate: 'cpu',
    nnapi: false,
    device: input.device,
    build: { profile: input.buildProfile },
    loadColdMilliseconds: null,
    warmupMilliseconds: null,
    single: null,
    session3: null,
    parity: null,
    thresholds: {
      singleP95Ms: SINGLE_P95_BUDGET_MS,
      sessionP95Ms: SESSION_P95_BUDGET_MS,
      deviceParityMin: DEVICE_PARITY_MIN,
      single: null,
      session: null,
      parity: null,
      decision: null,
    },
    memory: { peakPssKb: null, peakNativeHeapKb: null, peakJavaHeapKb: null },
    failures: [],
    cancelled: false,
    images: [],
    p1Exif: { status: 'unavailable', detail: 'Dekoder EXIF nie był sprawdzany.' },
  };
}

type TimedPhoto = {
  preprocessMilliseconds: number;
  inferenceMilliseconds: number;
  logits: number[];
};

async function timePhoto(rgb: RgbImage, input: MeasureInferenceInput): Promise<TimedPhoto> {
  const preprocessStarted = input.now();
  const tensor = input.preprocess(rgb);
  const preprocessMilliseconds = input.now() - preprocessStarted;
  const inferenceStarted = input.now();
  const output = await input.run(tensor);
  const inferenceMilliseconds = input.now() - inferenceStarted;
  return { preprocessMilliseconds, inferenceMilliseconds, logits: Array.from(output) };
}

function latencyFrom(
  rows: readonly {
    preprocessMilliseconds: number;
    inferenceMilliseconds: number;
    fusionMilliseconds: number;
    totalMilliseconds: number;
  }[],
  withFusion: boolean,
): LatencyStats | null {
  const preprocess = durationStats(rows.map((row) => row.preprocessMilliseconds));
  const inference = durationStats(rows.map((row) => row.inferenceMilliseconds));
  const total = durationStats(rows.map((row) => row.totalMilliseconds));
  if (preprocess === null || inference === null || total === null) return null;
  const fusion = withFusion ? durationStats(rows.map((row) => row.fusionMilliseconds)) : null;
  return { preprocess, inference, fusion, total };
}

function markAtMost(p95: number | undefined, budget: number): ThresholdMark | null {
  if (p95 === undefined) return null;
  return p95 <= budget ? 'pass' : 'fail';
}

function markAtLeast(value: number | undefined, minimum: number): ThresholdMark | null {
  if (value === undefined) return null;
  return value >= minimum ? 'pass' : 'fail';
}

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

function statsLine(label: string, stats: DurationStats | null): string {
  if (stats === null) return `${label}: brak`;
  const digit = (value: number) => value.toFixed(1);
  return `${label}: n=${stats.count}, średnia ${digit(stats.mean)}, p50 ${digit(stats.p50)}, p95 ${digit(stats.p95)}, min ${digit(stats.min)}, max ${digit(stats.max)}`;
}

/** Tekst na ekran. Plik do oceny w repozytorium ML to JSON, nie ten skrót. */
export function formatInferenceSummary(dump: DelegateDump): string {
  const lines = [
    'Spike B — inferencja',
    `Start: ${dump.startedAt}`,
    `Model: ${dump.modelVersion}`,
    `SHA-256 TFLite: ${dump.tfliteSha256}`,
    'Delegat: CPU. NNAPI wyłączone. Bibliotek GPU nie ma w tym buildzie.',
    `Telefon: ${dump.device.brand ?? 'brak'} ${dump.device.modelName ?? 'brak'}, ${dump.device.platform}, Android ${dump.device.osVersion ?? 'brak'}`,
    `Profil builda: ${dump.build.profile}`,
    '',
    dump.loadColdMilliseconds === null
      ? 'Ładowanie modelu (zimne): brak'
      : `Ładowanie modelu (zimne): ${oneDecimal(dump.loadColdMilliseconds)} ms`,
    dump.warmupMilliseconds === null
      ? 'Rozgrzewka: brak'
      : `Rozgrzewka (poza p50/p95): ${oneDecimal(dump.warmupMilliseconds)} ms`,
    statsLine('Jedno zdjęcie, preprocessing (ms)', dump.single?.preprocess ?? null),
    statsLine('Jedno zdjęcie, inferencja (ms)', dump.single?.inference ?? null),
    statsLine('Jedno zdjęcie, suma (ms)', dump.single?.total ?? null),
    statsLine('Sesja 3 zdjęć, preprocessing (ms)', dump.session3?.preprocess ?? null),
    statsLine('Sesja 3 zdjęć, inferencja (ms)', dump.session3?.inference ?? null),
    statsLine('Sesja 3 zdjęć, fuzja (ms)', dump.session3?.fusion ?? null),
    statsLine('Sesja 3 zdjęć, suma (ms)', dump.session3?.total ?? null),
  ];
  if (dump.parity === null) {
    lines.push('Parytet P3: brak');
  } else {
    lines.push(
      `Parytet P3: ${dump.parity.scored}/${dump.parity.count}, top-1 ${dump.parity.top1Agreement.toFixed(4)}, status ${dump.parity.decisionStatusAgreement.toFixed(4)}, deviceParityP3 ${dump.parity.deviceParityP3.toFixed(4)}`,
    );
    lines.push(
      `Różnica logitów: max ${dump.parity.maxAbsLogitDiff ?? 'brak'}, średnia ${dump.parity.meanAbsLogitDiff ?? 'brak'}`,
    );
    lines.push(`Parytet kompletny: ${dump.parity.complete ? 'tak' : 'nie'}`);
  }
  const memory = dump.memory.peakPssKb;
  lines.push(
    memory === null
      ? 'Szczyt PSS: brak odczytu'
      : `Szczyt PSS: ${memory} kB (${(memory / 1024).toFixed(1)} MB)`,
  );
  if (dump.memory.error) lines.push(`Odczyt pamięci: ${dump.memory.error}`);
  lines.push(`Nieudane: ${dump.failures.length}`);
  for (const failure of dump.failures) lines.push(`  ${failure.phase}: ${failure.message}`);
  lines.push(dump.cancelled ? 'Przerwane: tak' : 'Przerwane: nie');
  lines.push('');
  lines.push(
    'Progi p95 ≤ 2000 ms (jedno zdjęcie), p95 ≤ 5000 ms (sesja) i deviceParityP3 ≥ 0,99 oraz zgodność statusu ≥ 0,99 dotyczą tylko Xiaomi Mi 11 Lite 5G.',
  );
  lines.push(
    'Samsung S23 jest dymem, bez progu. To nie jest werdykt z telefonu, na którym stoisz.',
  );
  lines.push(
    'Suma jednego zdjęcia to preprocessing i inferencja. Suma sesji dokłada fuzję trzech zdjęć.',
  );
  lines.push('Dekodowanie JPEG jest w zrzucie przy zdjęciu i nie wchodzi do tych progów.');
  lines.push('Model nie ocenia jadalności.');
  lines.push(`P1 EXIF: ${dump.p1Exif.status}. ${dump.p1Exif.detail}`);
  return lines.join('\n');
}

/**
 * Jedno przejście: zimne ładowanie, seria jednego zdjęcia, seria sesji, potem 240 zdjęć.
 * Anulowanie jest sprawdzane między przebiegami. Bieżące wywołanie natywne dobiega końca.
 */
export async function measureInference(input: MeasureInferenceInput): Promise<DelegateDump> {
  const dump = emptyDump(input);
  let peak: Peak = null;
  let memoryOk = true;

  async function sample(extra?: MemoryReading): Promise<void> {
    if (extra) peak = consider(peak, extra);
    if (!memoryOk) return;
    try {
      peak = consider(peak, await input.readMemory());
    } catch (error) {
      memoryOk = false;
      dump.memory.error = errorMessage(error);
    }
  }

  await sample();
  if (input.shouldCancel()) {
    dump.cancelled = true;
    return finish(dump, peak);
  }

  const loadStarted = input.now();
  input.onProgress?.('ładowanie', 0, 1);
  try {
    await input.load();
    dump.loadColdMilliseconds = input.now() - loadStarted;
  } catch (error) {
    dump.failures.push({ phase: 'load', message: errorMessage(error) });
    return finish(dump, peak);
  }
  await sample();

  const anchor = input.frames[0];
  const sessionFrames = input.frames.slice(0, 3);
  if (!anchor || sessionFrames.length < 3) {
    dump.failures.push({
      phase: 'latency',
      message: 'Do serii czasu potrzeba co najmniej trzech złotych zdjęć.',
    });
  } else {
    let anchorRgb: RgbImage | null = null;
    const sessionRgb: RgbImage[] = [];
    try {
      const decoded = await input.decode(anchor.uri);
      anchorRgb = { width: decoded.width, height: decoded.height, rgb: decoded.rgb };
      await sample({
        pssKb: decoded.peakPssKb,
        nativeHeapKb: decoded.peakNativeHeapKb,
        javaHeapKb: decoded.peakJavaHeapKb,
      });
      for (const frame of sessionFrames) {
        if (frame === anchor && anchorRgb) {
          sessionRgb.push(anchorRgb);
          continue;
        }
        const next = await input.decode(frame.uri);
        sessionRgb.push({ width: next.width, height: next.height, rgb: next.rgb });
        await sample({
          pssKb: next.peakPssKb,
          nativeHeapKb: next.peakNativeHeapKb,
          javaHeapKb: next.peakJavaHeapKb,
        });
      }
    } catch (error) {
      dump.failures.push({ phase: 'latency-decode', message: errorMessage(error) });
      anchorRgb = null;
    }

    if (anchorRgb && sessionRgb.length === 3) {
      const warmupStarted = input.now();
      try {
        await timePhoto(anchorRgb, input);
        dump.warmupMilliseconds = input.now() - warmupStarted;
      } catch (error) {
        dump.failures.push({ phase: 'warmup', message: errorMessage(error) });
      }
      await input.afterEach();

      const runs = Math.max(0, Math.floor(input.latencyRuns));
      input.onProgress?.('jedno zdjęcie', 0, runs);
      const singleRows: {
        preprocessMilliseconds: number;
        inferenceMilliseconds: number;
        fusionMilliseconds: number;
        totalMilliseconds: number;
      }[] = [];
      for (let index = 0; index < runs; index += 1) {
        if (input.shouldCancel()) {
          dump.cancelled = true;
          break;
        }
        try {
          const timed = await timePhoto(anchorRgb, input);
          singleRows.push({
            preprocessMilliseconds: timed.preprocessMilliseconds,
            inferenceMilliseconds: timed.inferenceMilliseconds,
            fusionMilliseconds: 0,
            totalMilliseconds: timed.preprocessMilliseconds + timed.inferenceMilliseconds,
          });
        } catch (error) {
          dump.failures.push({ phase: 'single', message: errorMessage(error) });
        }
        await sample();
        await input.afterEach();
      }
      dump.single = latencyFrom(singleRows, false);

      const sessionRows: typeof singleRows = [];
      if (!dump.cancelled) {
        input.onProgress?.('sesja', 0, runs);
        for (let index = 0; index < runs; index += 1) {
          if (input.shouldCancel()) {
            dump.cancelled = true;
            break;
          }
          try {
            let preprocessSum = 0;
            let inferenceSum = 0;
            const logits: number[][] = [];
            for (const rgb of sessionRgb) {
              const timed = await timePhoto(rgb, input);
              preprocessSum += timed.preprocessMilliseconds;
              inferenceSum += timed.inferenceMilliseconds;
              logits.push(timed.logits);
            }
            const fusionStarted = input.now();
            fuseLogits(
              logits,
              input.classIds,
              input.temperatures,
              input.singleThresholds,
              input.fusionThresholds,
            );
            const fusionMilliseconds = input.now() - fusionStarted;
            sessionRows.push({
              preprocessMilliseconds: preprocessSum,
              inferenceMilliseconds: inferenceSum,
              fusionMilliseconds,
              totalMilliseconds: preprocessSum + inferenceSum + fusionMilliseconds,
            });
          } catch (error) {
            dump.failures.push({ phase: 'session', message: errorMessage(error) });
          }
          await sample();
          await input.afterEach();
        }
      }
      dump.session3 = latencyFrom(sessionRows, true);
    }
  }

  let top1Matches = 0;
  let decisionMatches = 0;
  let diffSum = 0;
  let diffCount = 0;
  let diffMax = 0;
  let scored = 0;
  let parityFailed = false;

  for (const frame of input.frames) {
    if (input.shouldCancel()) {
      dump.cancelled = true;
      parityFailed = true;
      break;
    }
    input.onProgress?.('parytet', dump.images.length, input.frames.length);
    const row = await scoreFrame(frame, input, sample);
    dump.images.push(row.image);
    if (row.image.error) {
      parityFailed = true;
      dump.failures.push({ phase: `parity:${frame.index}`, message: row.image.error });
    } else {
      scored += 1;
      if (row.image.top1Match) top1Matches += 1;
      if (row.image.decisionMatch) decisionMatches += 1;
      if (row.diff) {
        diffSum += row.diff.sum;
        diffCount += row.diff.count;
        if (row.diff.max > diffMax) diffMax = row.diff.max;
      } else {
        parityFailed = true;
      }
    }
    await input.afterEach();
  }

  const count = input.frames.length;
  if (count > 0) {
    const complete = !dump.cancelled && !parityFailed && scored === count;
    dump.parity = {
      count,
      scored,
      top1Agreement: top1Matches / count,
      decisionStatusAgreement: decisionMatches / count,
      deviceParityP3: top1Matches / count,
      maxAbsLogitDiff: diffCount === 0 ? null : diffMax,
      meanAbsLogitDiff: diffCount === 0 ? null : diffSum / diffCount,
      complete,
    };
  }

  const latencyClean = !dump.failures.some((failure) =>
    ['single', 'session', 'latency', 'latency-decode', 'load'].includes(failure.phase),
  );
  if (!dump.cancelled && latencyClean && dump.single && dump.session3 && dump.parity?.complete) {
    dump.thresholds.single = markAtMost(dump.single.total.p95, SINGLE_P95_BUDGET_MS);
    dump.thresholds.session = markAtMost(dump.session3.total.p95, SESSION_P95_BUDGET_MS);
    dump.thresholds.parity = markAtLeast(dump.parity.deviceParityP3, DEVICE_PARITY_MIN);
    dump.thresholds.decision = markAtLeast(dump.parity.decisionStatusAgreement, DEVICE_PARITY_MIN);
  }

  return finish(dump, peak);
}

function finish(dump: DelegateDump, peak: Peak): DelegateDump {
  dump.memory.peakPssKb = peak?.pss ?? null;
  dump.memory.peakNativeHeapKb = peak?.native ?? null;
  dump.memory.peakJavaHeapKb = peak?.java ?? null;
  return dump;
}

async function scoreFrame(
  frame: GoldenFrame,
  input: MeasureInferenceInput,
  sample: (extra?: MemoryReading) => Promise<void>,
): Promise<{ image: DumpImage; diff: { max: number; sum: number; count: number } | null }> {
  const base: DumpImage = {
    index: frame.index,
    photoId: frame.photoId,
    relativePath: frame.relativePath,
    imageSha256: frame.imageSha256,
    deviceLogits: null,
    decodeMilliseconds: null,
    preprocessMilliseconds: null,
    inferenceMilliseconds: null,
    top1Index: null,
    top1ClassId: null,
    decisionStatus: null,
    expectedStatus: frame.expectedStatus,
    top1Match: false,
    decisionMatch: false,
    maxAbsLogitDiff: null,
    error: null,
  };
  const decodeStarted = input.now();
  let decoded: DecodedFrame;
  try {
    decoded = await input.decode(frame.uri);
  } catch (error) {
    return { image: { ...base, error: errorMessage(error) }, diff: null };
  }
  base.decodeMilliseconds = input.now() - decodeStarted;
  await sample({
    pssKb: decoded.peakPssKb,
    nativeHeapKb: decoded.peakNativeHeapKb,
    javaHeapKb: decoded.peakJavaHeapKb,
  });
  try {
    const timed = await timePhoto(
      { width: decoded.width, height: decoded.height, rgb: decoded.rgb },
      input,
    );
    const decision = decideLogits(
      timed.logits,
      input.classIds,
      input.temperatures,
      input.singleThresholds,
    );
    const diff = logitDiff(timed.logits, frame.referenceLogits);
    const top1 = argmax(timed.logits);
    const referenceTop1 = argmax(frame.referenceLogits);
    return {
      image: {
        ...base,
        deviceLogits: timed.logits,
        preprocessMilliseconds: timed.preprocessMilliseconds,
        inferenceMilliseconds: timed.inferenceMilliseconds,
        top1Index: top1,
        top1ClassId: input.classIds[top1] ?? null,
        decisionStatus: decision.status,
        top1Match: diff !== null && top1 === referenceTop1,
        decisionMatch: decision.status === frame.expectedStatus,
        maxAbsLogitDiff: diff?.max ?? null,
        error: diff === null ? 'Długość logitów nie zgadza się z referencją.' : null,
      },
      diff,
    };
  } catch (error) {
    return { image: { ...base, error: errorMessage(error) }, diff: null };
  }
}

export type GoldenRecord = Omit<GoldenFrame, 'uri'>;

const STATUSES: readonly DecisionStatus[] = ['ok', 'unclear', 'out_of_distribution'];

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} musi być obiektem.`);
  }
  return value as Record<string, unknown>;
}

/** Czyta golden_images.json paczki. URI dopina dopiero adapter na telefonie. */
export function readGoldenRecords(value: unknown): GoldenRecord[] {
  const record = asRecord(value, 'golden_images');
  if (!Array.isArray(record.images)) throw new Error('golden_images.images musi być listą.');
  if (record.count !== undefined && record.count !== record.images.length) {
    throw new Error('Liczba zdjęć nie zgadza się z polem count.');
  }
  return record.images
    .map((item, position) => {
      const image = asRecord(item, `images[${position}]`);
      const status = asRecord(
        image.expectedDecision,
        `images[${position}].expectedDecision`,
      ).status;
      if (typeof status !== 'string' || !STATUSES.includes(status as DecisionStatus)) {
        throw new Error(`images[${position}] ma nieznany status decyzji.`);
      }
      if (!Array.isArray(image.tfliteFp16Logits) || image.tfliteFp16Logits.length === 0) {
        throw new Error(`images[${position}] nie ma logitów TFLite.`);
      }
      const logits = image.tfliteFp16Logits.map((logit, logitIndex) => {
        if (typeof logit !== 'number' || !Number.isFinite(logit)) {
          throw new Error(`images[${position}] logit ${logitIndex} nie jest liczbą.`);
        }
        return logit;
      });
      if (typeof image.photoId !== 'string' || typeof image.imageSha256 !== 'string') {
        throw new Error(`images[${position}] nie ma photoId albo imageSha256.`);
      }
      if (typeof image.relativePath !== 'string' || typeof image.index !== 'number') {
        throw new Error(`images[${position}] nie ma indeksu albo ścieżki.`);
      }
      return {
        index: image.index,
        photoId: image.photoId,
        relativePath: assertSafeRelativePath(image.relativePath),
        imageSha256: image.imageSha256,
        referenceLogits: logits,
        expectedStatus: status as DecisionStatus,
      };
    })
    .sort((left, right) => left.index - right.index);
}

export type GridExpectation = {
  coords: readonly (readonly [number, number])[];
  values: readonly number[];
};

/** coords to [wiersz, kolumna]. Tolerancja jest maksymalną różnicą bezwzględną. */
export function gridMaxAbsDiff(
  data: ArrayLike<number>,
  width: number,
  expected: GridExpectation,
): number {
  let max = 0;
  expected.coords.forEach((coord, index) => {
    const y = coord[0];
    const x = coord[1];
    const base = (y * width + x) * 3;
    for (let channel = 0; channel < 3; channel += 1) {
      const actual = data[base + channel];
      const wanted = expected.values[index * 3 + channel];
      if (actual === undefined || wanted === undefined || !Number.isFinite(actual)) {
        max = Number.POSITIVE_INFINITY;
        return;
      }
      const delta = Math.abs(actual - wanted);
      if (delta > max) max = delta;
    }
  });
  return max;
}

export function assessExifParity(input: {
  exifOrientation: number;
  tensor: ArrayLike<number>;
  tensorWidth: number;
  expected: GridExpectation;
  tolerance: number;
}): { status: 'pass' | 'fail'; detail: string } {
  const diff = gridMaxAbsDiff(input.tensor, input.tensorWidth, input.expected);
  if (input.exifOrientation !== 6) {
    return {
      status: 'fail',
      detail: `Orientacja EXIF ${input.exifOrientation}, oczekiwano 6. Różnica próbki ${diff}.`,
    };
  }
  if (diff > input.tolerance) {
    return {
      status: 'fail',
      detail: `Różnica próbki tensora ${diff} przekracza ${input.tolerance}.`,
    };
  }
  return { status: 'pass', detail: `Orientacja 6, różnica próbki ${diff}.` };
}
