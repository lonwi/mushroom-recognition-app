/**
 * Pomiar spike'a B: trzy zdjęcia po kolei, czas i szczyt pamięci.
 * Nie trzyma buforów RGB po zakończeniu zdjęcia.
 */

import { preprocessImage, type PreprocessingSpec } from '@/core/ai/image-preprocessing';
import { durationStats, formatDurationStats } from '@/core/measure/duration-stats';

export const decoderSeriesCounts = [1, 5, 10, 20] as const;
export const defaultDecoderSeriesCount = 10;

export type MemorySnapshot = {
  pssKb: number;
  nativeHeapKb: number;
  javaHeapKb: number;
};

export type DecodedRgb = {
  width: number;
  height: number;
  rgb: Uint8Array;
  sampleSize: number;
  usedTargetSize: boolean;
  sourceWidth: number;
  sourceHeight: number;
  exifOrientation: number;
  peakPssKb: number;
  peakNativeHeapKb: number;
  peakJavaHeapKb: number;
};

type PhotoMeasurement = {
  index: number;
  ok: boolean;
  decodeMilliseconds: number;
  preprocessMilliseconds: number | null;
  width?: number;
  height?: number;
  sampleSize?: number;
  usedTargetSize?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
  exifOrientation?: number;
  byteLength?: number;
  tensorWidth?: number;
  tensorHeight?: number;
  tensorDtype?: 'float32' | 'uint8';
  errorCode?: string;
  errorMessage?: string;
};

export type DecoderSpikeMeasurement = {
  startedAt: string;
  minShortSide: number;
  modelWidth: number;
  modelHeight: number;
  normalization: string;
  photos: PhotoMeasurement[];
  decodeSumMilliseconds: number;
  wallMilliseconds: number;
  peakPssKb: number | null;
  peakNativeHeapKb: number | null;
  peakJavaHeapKb: number | null;
  memoryError?: string;
};

type Peak = { pss: number; native: number; java: number };

function errorParts(error: unknown): { code: string; message: string } {
  const message = error instanceof Error ? error.message : 'Nie udało się zdekodować zdjęcia.';
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return { code, message };
  }
  return { code: 'decode_failed', message };
}

function consider(peak: Peak | null, sample: MemorySnapshot): Peak {
  if (peak === null) {
    return { pss: sample.pssKb, native: sample.nativeHeapKb, java: sample.javaHeapKb };
  }
  return {
    pss: Math.max(peak.pss, sample.pssKb),
    native: Math.max(peak.native, sample.nativeHeapKb),
    java: Math.max(peak.java, sample.javaHeapKb),
  };
}

function clock(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export async function measurePhotos(
  uris: readonly string[],
  options: {
    minShortSide: number;
    spec: PreprocessingSpec;
    decode: (uri: string, minShortSide: number) => Promise<DecodedRgb>;
    readMemory: () => Promise<MemorySnapshot>;
    startedAt: string;
    now?: () => number;
  },
): Promise<DecoderSpikeMeasurement> {
  const now = options.now ?? clock;
  const started = now();
  let peak: Peak | null = null;
  let memoryOk = true;
  let memoryError: string | undefined;
  const photos: PhotoMeasurement[] = [];

  async function sample(): Promise<void> {
    if (!memoryOk) return;
    try {
      peak = consider(peak, await options.readMemory());
    } catch (error) {
      memoryOk = false;
      memoryError = error instanceof Error ? error.message : 'Odczyt pamięci niedostępny.';
    }
  }

  await sample();

  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index] ?? '';
    const decodeStarted = now();
    let decoded: DecodedRgb;
    try {
      decoded = await options.decode(uri, options.minShortSide);
    } catch (error) {
      const parts = errorParts(error);
      photos.push({
        index: index + 1,
        ok: false,
        decodeMilliseconds: now() - decodeStarted,
        preprocessMilliseconds: null,
        errorCode: parts.code,
        errorMessage: parts.message,
      });
      continue;
    }
    const decodeMilliseconds = now() - decodeStarted;
    peak = consider(peak, {
      pssKb: decoded.peakPssKb,
      nativeHeapKb: decoded.peakNativeHeapKb,
      javaHeapKb: decoded.peakJavaHeapKb,
    });
    await sample();

    const preprocessStarted = now();
    try {
      const tensor = preprocessImage(
        { width: decoded.width, height: decoded.height, rgb: decoded.rgb },
        options.spec,
      );
      const preprocessMilliseconds = now() - preprocessStarted;
      await sample();
      photos.push({
        index: index + 1,
        ok: true,
        decodeMilliseconds,
        preprocessMilliseconds,
        width: decoded.width,
        height: decoded.height,
        sampleSize: decoded.sampleSize,
        usedTargetSize: decoded.usedTargetSize,
        sourceWidth: decoded.sourceWidth,
        sourceHeight: decoded.sourceHeight,
        exifOrientation: decoded.exifOrientation,
        byteLength: decoded.rgb.byteLength,
        tensorWidth: tensor.width,
        tensorHeight: tensor.height,
        tensorDtype: tensor.dtype,
      });
    } catch (error) {
      const parts = errorParts(error);
      photos.push({
        index: index + 1,
        ok: false,
        decodeMilliseconds,
        preprocessMilliseconds: null,
        width: decoded.width,
        height: decoded.height,
        sampleSize: decoded.sampleSize,
        usedTargetSize: decoded.usedTargetSize,
        sourceWidth: decoded.sourceWidth,
        sourceHeight: decoded.sourceHeight,
        exifOrientation: decoded.exifOrientation,
        byteLength: decoded.rgb.byteLength,
        errorCode: 'preprocess_failed',
        errorMessage: parts.message,
      });
    }
  }

  const decodeSumMilliseconds = photos.reduce((sum, photo) => sum + photo.decodeMilliseconds, 0);
  return {
    startedAt: options.startedAt,
    minShortSide: options.minShortSide,
    modelWidth: options.spec.inputSize.width,
    modelHeight: options.spec.inputSize.height,
    normalization: options.spec.normalization.type,
    photos,
    decodeSumMilliseconds,
    wallMilliseconds: now() - started,
    peakPssKb: peak?.pss ?? null,
    peakNativeHeapKb: peak?.native ?? null,
    peakJavaHeapKb: peak?.java ?? null,
    ...(memoryError === undefined ? {} : { memoryError }),
  };
}

type DecoderRunSummary = {
  index: number;
  ok: boolean;
  decodeSumMilliseconds: number;
  preprocessSumMilliseconds: number;
  wallMilliseconds: number;
  oom: boolean;
  errors: string[];
};

export type DecoderSeriesMeasurement = {
  startedAt: string;
  minShortSide: number;
  modelWidth: number;
  modelHeight: number;
  normalization: string;
  requestedRuns: number;
  runs: DecoderRunSummary[];
  cancelled: boolean;
  peakPssKb: number | null;
  peakNativeHeapKb: number | null;
  peakJavaHeapKb: number | null;
  memoryError?: string;
  oom: boolean;
};

function preprocessSum(measurement: DecoderSpikeMeasurement): number {
  return measurement.photos.reduce((sum, photo) => sum + (photo.preprocessMilliseconds ?? 0), 0);
}

function runHadOom(measurement: DecoderSpikeMeasurement): boolean {
  return measurement.photos.some((photo) => photo.errorCode === 'oom');
}

function runErrors(measurement: DecoderSpikeMeasurement): string[] {
  return measurement.photos
    .filter((photo) => !photo.ok)
    .map((photo) => {
      const code = photo.errorCode ?? 'decode_failed';
      const detail = photo.errorMessage ? ` — ${photo.errorMessage}` : '';
      return `zdjęcie ${photo.index}: ${code}${detail}`;
    });
}

function maxReading(current: number | null, next: number | null): number | null {
  if (next === null) return current;
  if (current === null) return next;
  return Math.max(current, next);
}

/** Te same trzy URI, N razy po kolei. Anulowanie jest sprawdzane między przebiegami. */
export async function measurePhotoSeries(
  uris: readonly string[],
  options: {
    runs: number;
    minShortSide: number;
    spec: PreprocessingSpec;
    decode: (uri: string, minShortSide: number) => Promise<DecodedRgb>;
    readMemory: () => Promise<MemorySnapshot>;
    startedAt: string;
    now?: () => number;
    shouldCancel?: () => boolean;
  },
): Promise<DecoderSeriesMeasurement> {
  const requestedRuns = Math.max(0, Math.floor(options.runs));
  const runs: DecoderRunSummary[] = [];
  let cancelled = false;
  let peakPssKb: number | null = null;
  let peakNativeHeapKb: number | null = null;
  let peakJavaHeapKb: number | null = null;
  let memoryError: string | undefined;
  let oom = false;

  for (let index = 0; index < requestedRuns; index += 1) {
    if (options.shouldCancel?.()) {
      cancelled = true;
      break;
    }
    const measurement = await measurePhotos(uris, options);
    const errors = runErrors(measurement);
    runs.push({
      index: index + 1,
      ok: errors.length === 0,
      decodeSumMilliseconds: measurement.decodeSumMilliseconds,
      preprocessSumMilliseconds: preprocessSum(measurement),
      wallMilliseconds: measurement.wallMilliseconds,
      oom: runHadOom(measurement),
      errors,
    });
    peakPssKb = maxReading(peakPssKb, measurement.peakPssKb);
    peakNativeHeapKb = maxReading(peakNativeHeapKb, measurement.peakNativeHeapKb);
    peakJavaHeapKb = maxReading(peakJavaHeapKb, measurement.peakJavaHeapKb);
    if (memoryError === undefined && measurement.memoryError !== undefined) {
      memoryError = measurement.memoryError;
    }
    oom = oom || runHadOom(measurement);
  }

  return {
    startedAt: options.startedAt,
    minShortSide: options.minShortSide,
    modelWidth: options.spec.inputSize.width,
    modelHeight: options.spec.inputSize.height,
    normalization: options.spec.normalization.type,
    requestedRuns,
    runs,
    cancelled,
    peakPssKb,
    peakNativeHeapKb,
    peakJavaHeapKb,
    ...(memoryError === undefined ? {} : { memoryError }),
    oom,
  };
}

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

function megabytes(kb: number): string {
  return (kb / 1024).toFixed(1);
}

function memoryLine(label: string, kb: number | null): string {
  if (kb === null) return `${label}: brak odczytu`;
  return `${label}: ${kb} kB (${megabytes(kb)} MB)`;
}

function criteriaFooter(): string[] {
  return [
    'To nie jest werdykt z telefonu. Liczby są z tego uruchomienia. Kryteria do wpisania ręcznie w docs/spikes/F0-raport.md:',
    '- Xiaomi Mi 11 Lite 5G: szczyt PSS ≤ 400 MB na trzy zdjęcia; p95 czasu ściany wchodzi w budżet sesji ≤ 5 s. Inferencja modelu nie jest w tym czasie.',
    '- Huawei P smart 2019: bez OOM i bez ubicia procesu; czas bez progu.',
    'Ubicia procesu ten raport nie widzi: jeśli aplikacja zniknie, zapisz to osobno.',
  ];
}

function statsLine(label: string, values: number[], empty: string): string {
  const stats = durationStats(values);
  if (stats === null) return `${label}: ${empty}`;
  return `${label}: ${formatDurationStats(stats)}`;
}

/** Tekst do skopiowania. Po polsku, bo trafia do raportu spike'a. */
export function formatDecoderSpikeReport(measurement: DecoderSpikeMeasurement): string {
  const lines = [
    'Spike B — dekoder zdjęć',
    `Start: ${measurement.startedAt}`,
    `Próg krótszego boku: ${measurement.minShortSide} px`,
    `Wejście modelu z manifestu: ${measurement.modelWidth}×${measurement.modelHeight}`,
    `Normalizacja: ${measurement.normalization}`,
    'Dekodowanie jest natywne (podpróbkowanie). Resampling i normalizacja są w TypeScript.',
    '',
  ];
  for (const photo of measurement.photos) {
    if (!photo.ok) {
      lines.push(
        `Zdjęcie ${photo.index}: BŁĄD ${photo.errorCode ?? 'decode_failed'} (${oneDecimal(photo.decodeMilliseconds)} ms)`,
      );
      if (photo.errorMessage) lines.push(`  ${photo.errorMessage}`);
      if (photo.width !== undefined && photo.height !== undefined) {
        lines.push(`  RGB przed błędem preprocessingu: ${photo.width}×${photo.height}`);
      }
      continue;
    }
    lines.push(
      `Zdjęcie ${photo.index}: OK, dekodowanie ${oneDecimal(photo.decodeMilliseconds)} ms, preprocessing ${oneDecimal(photo.preprocessMilliseconds ?? 0)} ms`,
    );
    lines.push(
      `  źródło ${photo.sourceWidth}×${photo.sourceHeight}, EXIF ${photo.exifOrientation}, sampleSize ${photo.sampleSize}, targetSize ${photo.usedTargetSize ? 'tak' : 'nie'}`,
    );
    lines.push(`  RGB ${photo.width}×${photo.height}, ${photo.byteLength} B`);
    lines.push(`  tensor ${photo.tensorWidth}×${photo.tensorHeight} ${photo.tensorDtype}`);
  }
  lines.push('');
  lines.push(`Suma dekodowania: ${oneDecimal(measurement.decodeSumMilliseconds)} ms`);
  lines.push(`Czas ściany przebiegu: ${oneDecimal(measurement.wallMilliseconds)} ms`);
  lines.push(memoryLine('Szczyt PSS', measurement.peakPssKb));
  lines.push(memoryLine('Szczyt sterty natywnej', measurement.peakNativeHeapKb));
  lines.push(memoryLine('Szczyt sterty Javy', measurement.peakJavaHeapKb));
  if (measurement.memoryError) lines.push(`Odczyt pamięci: ${measurement.memoryError}`);
  const oom = measurement.photos.some((photo) => photo.errorCode === 'oom');
  lines.push(oom ? 'OOM: tak, przy co najmniej jednym zdjęciu.' : 'OOM: nie zgłoszono.');
  lines.push('');
  lines.push(...criteriaFooter());
  return lines.join('\n');
}

/** Tekst serii do spike-b-dekoder.txt. Po polsku, jak raport jednego przebiegu. */
export function formatDecoderSeriesReport(series: DecoderSeriesMeasurement): string {
  const lines = [
    'Spike B — dekoder zdjęć',
    `Start: ${series.startedAt}`,
    `Seria: żądane ${series.requestedRuns}, ukończone ${series.runs.length}${series.cancelled ? ', przerwana' : ''}`,
    `Próg krótszego boku: ${series.minShortSide} px`,
    `Wejście modelu z manifestu: ${series.modelWidth}×${series.modelHeight}`,
    `Normalizacja: ${series.normalization}`,
    'Dekodowanie jest natywne (podpróbkowanie). Resampling i normalizacja są w TypeScript.',
    'Czas ściany przebiegu to dekodowanie i preprocessing. Inferencja modelu nie wchodzi w ten pomiar.',
    '',
  ];
  const okRuns = series.runs.filter((run) => run.ok);
  const failedRuns = series.runs.length - okRuns.length;
  lines.push(`Udane: ${okRuns.length}, nieudane: ${failedRuns}`);
  for (const run of series.runs) {
    if (!run.ok) {
      lines.push(`Przebieg ${run.index}: NIEUDANY${run.oom ? ', OOM' : ''}`);
      for (const error of run.errors) lines.push(`  ${error}`);
      continue;
    }
    lines.push(
      `Przebieg ${run.index}: dekodowanie ${oneDecimal(run.decodeSumMilliseconds)} ms, preprocessing ${oneDecimal(run.preprocessSumMilliseconds)} ms, ściana ${oneDecimal(run.wallMilliseconds)} ms`,
    );
  }
  lines.push('');
  const empty = series.runs.length === 0 ? 'brak przebiegów' : 'brak udanych przebiegów';
  lines.push(
    statsLine(
      'Czas ściany (ms)',
      okRuns.map((run) => run.wallMilliseconds),
      empty,
    ),
  );
  lines.push(
    statsLine(
      'Suma dekodowania (ms)',
      okRuns.map((run) => run.decodeSumMilliseconds),
      empty,
    ),
  );
  lines.push(
    statsLine(
      'Suma preprocessingu (ms)',
      okRuns.map((run) => run.preprocessSumMilliseconds),
      empty,
    ),
  );
  lines.push(memoryLine('Szczyt PSS', series.peakPssKb));
  lines.push(memoryLine('Szczyt sterty natywnej', series.peakNativeHeapKb));
  lines.push(memoryLine('Szczyt sterty Javy', series.peakJavaHeapKb));
  if (series.memoryError) lines.push(`Odczyt pamięci: ${series.memoryError}`);
  lines.push(series.oom ? 'OOM: tak, przy co najmniej jednym zdjęciu.' : 'OOM: nie zgłoszono.');
  lines.push('');
  lines.push(
    'Do budżetu sesji ≤ 5 s p95 bierz p95 czasu ściany. Inferencja nie jest w tym czasie.',
  );
  lines.push(...criteriaFooter());
  return lines.join('\n');
}
