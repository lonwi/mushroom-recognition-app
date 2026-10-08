function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Width cap before the shared area resize. 2× the 224 model input. Not a longest-side cap. */
export const NATIVE_PREVIEW_EDGE = 448;

/**
 * One object for the shutter and the width reader.
 * Android `skipProcessing` leaves the JPEG oriented and reports stored pixels.
 * iOS ignores the flag, so the same capture still reads EXIF instead of decoding.
 */
export const SKIP_PROCESSING_CAPTURE = { skipProcessing: true } as const;

const EXIF_WIDTH_KEYS = ['PixelXDimension', 'ImageWidth'] as const;
const EXIF_HEIGHT_KEYS = ['PixelYDimension', 'ImageLength', 'ImageHeight'] as const;

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (parsed >= 1) {
      return parsed;
    }
  }
  return undefined;
}

function readKeyedInteger(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const parsed = positiveInteger(record[key]);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function exifRecords(exif: object): Record<string, unknown>[] {
  const root = exif as Record<string, unknown>;
  const records = [root];
  for (const value of Object.values(root)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      records.push(value as Record<string, unknown>);
    }
  }
  return records;
}

/**
 * Upright pixel width from stored EXIF dimensions.
 *
 * `PixelXDimension` / `ImageWidth` are the JPEG's stored width, before the
 * orientation tag is applied. Orientations 5–8 transpose the axes (90° and
 * 270°, including the mirrored forms), so the upright width is the stored
 * height. Orientations 1–4 keep the stored width. This matches Android
 * `skipProcessing` (stored `TAG_IMAGE_WIDTH` plus the orientation tag) and
 * iOS, which puts `PixelXDimension` and `Orientation` on the capture exif
 * and does not implement `skipProcessing`.
 */
export function uprightWidthFromExif(exif: object | null | undefined): number | undefined {
  if (!exif) {
    return undefined;
  }
  let orientation: number | undefined;
  let storedWidth: number | undefined;
  let storedHeight: number | undefined;
  for (const record of exifRecords(exif)) {
    if (orientation === undefined) {
      const parsed = readKeyedInteger(record, ['Orientation']);
      if (parsed !== undefined && parsed >= 1 && parsed <= 8) {
        orientation = parsed;
      }
    }
    if (storedWidth === undefined) {
      storedWidth = readKeyedInteger(record, EXIF_WIDTH_KEYS);
    }
    if (storedHeight === undefined) {
      storedHeight = readKeyedInteger(record, EXIF_HEIGHT_KEYS);
    }
  }
  const swapsAxes = orientation !== undefined && orientation >= 5 && orientation <= 8;
  if (swapsAxes) {
    return storedHeight;
  }
  return storedWidth;
}

/**
 * expo-camera 57 `photo.width` is the upright width only after orientation is applied.
 *
 * Android `ResolveTakenPicture` writes `bitmap.width` after `decodeAndRotateBitmap`
 * when `skipProcessing` is false. With `skipProcessing` it writes
 * `ExifInterface.TAG_IMAGE_WIDTH`, the stored pixel width before that rotation.
 * A skipProcessing capture must use `uprightWidthFromExif` instead of this width.
 * Gallery widths from expo-image-picker already swap 90° and 270° EXIF.
 */
export function uprightCaptureWidth(
  width: number | undefined,
  options: { skipProcessing?: boolean },
): number | undefined {
  if (options.skipProcessing) {
    return undefined;
  }
  if (typeof width === 'number' && Number.isFinite(width) && width >= 1) {
    return width;
  }
  return undefined;
}

/** Width passed to the resizer. skipProcessing reads EXIF; otherwise the platform width. */
export function widthForCapture(
  photo: { width?: number; exif?: object | null },
  capture: { skipProcessing?: boolean },
): number | undefined {
  if (capture.skipProcessing) {
    return uprightWidthFromExif(photo.exif);
  }
  return uprightCaptureWidth(photo.width, capture);
}

/**
 * Widths to request from the platform scaler, each step at most 2×.
 *
 * A single resize from a 12–50 MP photo to 448 is more than 2× and the
 * Android bitmap path samples that poorly. Already-small photos are left
 * alone: this function does not upscale.
 */
export function previewResizeWidths(sourceWidth: number): number[] {
  if (!Number.isFinite(sourceWidth) || sourceWidth < 1) {
    throw new Error('photo width must be positive');
  }
  if (sourceWidth <= NATIVE_PREVIEW_EDGE) {
    return [];
  }
  const widths: number[] = [];
  let width = sourceWidth;
  while (width / 2 >= NATIVE_PREVIEW_EDGE) {
    width = Math.floor(width / 2);
    widths.push(width);
  }
  if (width !== NATIVE_PREVIEW_EDGE) {
    widths.push(NATIVE_PREVIEW_EDGE);
  }
  return widths;
}

/**
 * Bake EXIF orientation and downscale before the photo becomes a JS buffer.
 *
 * The camera uses skipProcessing, so the JPEG may still carry an orientation
 * tag. ImageManipulator loads through the platform decoder, which applies
 * that tag: UIImage / BitmapFactory on device, and HTMLImageElement's default
 * image-orientation (from-image) on web. The resize then runs on upright
 * pixels. We do not rotate a second time from a parsed EXIF tag.
 *
 * The resize target is the width, keeping aspect ratio. It is not the longest
 * side. A wide photo and a tall photo both end at 448px across when they
 * started wider than that. Steps stay at most 2×.
 */
type ManipulatorContext = {
  resize: (action: { width: number }) => ManipulatorContext;
  renderAsync: () => Promise<{
    width: number;
    height: number;
    saveAsync: (options: { compress: number; format: string; base64: boolean }) => Promise<{ base64?: string }>;
  }>;
};

/**
 * Width comes from the camera result when the caller has it. Otherwise one
 * renderAsync reads the decoded bitmap size. That path does not PNG-encode
 * the 12–50 MP original. The encode happens once, after the width steps.
 */
export async function readPhotoAsPngBytes(uri: string, knownWidth?: number): Promise<Uint8Array> {
  const manipulator = require('expo-image-manipulator') as {
    ImageManipulator: { manipulate: (uri: string) => ManipulatorContext };
    SaveFormat: { PNG: string };
  };
  let width = knownWidth;
  if (!width || !Number.isFinite(width) || width < 1) {
    const probed = await manipulator.ImageManipulator.manipulate(uri).renderAsync();
    width = probed.width;
  }
  if (!width) {
    throw new Error('photo_width_missing');
  }
  const chain = manipulator.ImageManipulator.manipulate(uri);
  for (const step of previewResizeWidths(width)) {
    chain.resize({ width: step });
  }
  const rendered = await chain.renderAsync();
  const saved = await rendered.saveAsync({
    compress: 1,
    format: manipulator.SaveFormat.PNG,
    base64: true,
  });
  if (!saved.base64) {
    throw new Error('photo_bytes_missing');
  }
  return base64ToBytes(saved.base64);
}
