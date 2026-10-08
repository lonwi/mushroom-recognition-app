function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Longest-side cap before the shared area resize. 2× the 224 model input. */
export const NATIVE_PREVIEW_EDGE = 448;

/**
 * Bake EXIF orientation and downscale before the photo becomes a JS buffer.
 *
 * The camera uses skipProcessing, so the JPEG may still carry an orientation
 * tag. ImageManipulator loads through the platform decoder, which applies
 * that tag: UIImage / BitmapFactory on device, and HTMLImageElement's default
 * image-orientation (from-image) on web. The resize then runs on upright
 * pixels. We do not rotate a second time from a parsed EXIF tag.
 *
 * Width 448 keeps the aspect ratio and keeps a 12–50 MP photo out of the
 * base64 string. imagePreprocess.ts area-resizes that result to 224.
 */
export async function readPhotoAsPngBytes(uri: string): Promise<Uint8Array> {
  const manipulator = require('expo-image-manipulator') as {
    manipulateAsync: (
      uri: string,
      actions: Array<{ resize: { width: number } }>,
      save: { compress: number; format: string; base64: boolean },
    ) => Promise<{ base64?: string }>;
    SaveFormat: { PNG: string };
  };
  const rendered = await manipulator.manipulateAsync(uri, [{ resize: { width: NATIVE_PREVIEW_EDGE } }], {
    compress: 1,
    format: manipulator.SaveFormat.PNG,
    base64: true,
  });
  if (!rendered.base64) {
    throw new Error('photo_bytes_missing');
  }
  return base64ToBytes(rendered.base64);
}
