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
export async function readPhotoAsPngBytes(uri: string): Promise<Uint8Array> {
  const manipulator = require('expo-image-manipulator') as {
    manipulateAsync: (
      uri: string,
      actions: Array<{ resize: { width: number } }>,
      save: { compress: number; format: string; base64: boolean },
    ) => Promise<{ base64?: string; uri?: string; width?: number }>;
    SaveFormat: { PNG: string };
  };
  const save = { compress: 1, format: manipulator.SaveFormat.PNG, base64: false };
  const probed = await manipulator.manipulateAsync(uri, [], save);
  if (!probed.width) {
    throw new Error('photo_width_missing');
  }
  const actions = previewResizeWidths(probed.width).map((width) => ({ resize: { width } }));
  const rendered = await manipulator.manipulateAsync(probed.uri || uri, actions, {
    ...save,
    base64: true,
  });
  if (!rendered.base64) {
    throw new Error('photo_bytes_missing');
  }
  return base64ToBytes(rendered.base64);
}
