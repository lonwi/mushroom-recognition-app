import { requireOptionalNativeModule } from 'expo';

export class PhotoDecoderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PhotoDecoderError';
    this.code = code;
  }
}

/** RGB, 3 bajty na piksel, wierszami, bez paddingu. Bitmapa natywna jest już zwolniona. */
export type DecodedPhoto = {
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

export type ProcessMemory = {
  pssKb: number;
  nativeHeapKb: number;
  javaHeapKb: number;
};

type NativePhotoDecoder = {
  decode(uri: string, minShortSide: number): Promise<DecodedPhoto>;
  readProcessMemory(): Promise<ProcessMemory>;
};

function nativeModule(): NativePhotoDecoder {
  const loaded = requireOptionalNativeModule<NativePhotoDecoder>('PhotoDecoder');
  if (!loaded) {
    throw new PhotoDecoderError('unsupported', 'Dekoder zdjęć nie jest dostępny w tym środowisku.');
  }
  return loaded;
}

function asDecoderError(error: unknown): PhotoDecoderError {
  if (error instanceof PhotoDecoderError) return error;
  const message = error instanceof Error ? error.message : 'Nie udało się zdekodować zdjęcia.';
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return new PhotoDecoderError(code, message);
  }
  return new PhotoDecoderError('decode_failed', message);
}

function asRgb(value: Uint8Array | ArrayBuffer): Uint8Array {
  if (value instanceof Uint8Array) return value;
  return new Uint8Array(value);
}

export async function decodePhoto(uri: string, minShortSide: number): Promise<DecodedPhoto> {
  try {
    const decoded = await nativeModule().decode(uri, minShortSide);
    return { ...decoded, rgb: asRgb(decoded.rgb) };
  } catch (error) {
    throw asDecoderError(error);
  }
}

export async function readProcessMemory(): Promise<ProcessMemory> {
  try {
    return await nativeModule().readProcessMemory();
  } catch (error) {
    throw asDecoderError(error);
  }
}
