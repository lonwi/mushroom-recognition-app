/**
 * Pomiar spike'a B: trzy zdjęcia po kolei, czas i szczyt pamięci.
 * Nie trzyma buforów RGB po zakończeniu zdjęcia.
 */

import { preprocessImage, type PreprocessingSpec } from '@/core/ai/image-preprocessing';

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
  lines.push(
    'To nie jest werdykt z telefonu. Liczby są z tego uruchomienia. Kryteria do wpisania ręcznie w docs/spikes/F0-raport.md:',
  );
  lines.push(
    '- Xiaomi Mi 11: szczyt PSS ≤ 400 MB na trzy zdjęcia; czas wchodzi w budżet sesji ≤ 5 s p95.',
  );
  lines.push('- Huawei P smart 2019: bez OOM i bez ubicia procesu; czas bez progu.');
  lines.push('Ubicia procesu ten raport nie widzi: jeśli aplikacja zniknie, zapisz to osobno.');
  return lines.join('\n');
}
