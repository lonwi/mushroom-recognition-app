function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Bake the capture's EXIF orientation into PNG bytes. The camera uses
 * skipProcessing, so the JPEG may still carry an orientation tag.
 * ImageManipulator applies that tag and does not resize: the antialiased
 * 224 resize lives in imagePreprocess.ts and matches training/preprocess.py.
 * Expo Go can run this; the TFLite runtime cannot.
 */
export async function readPhotoAsPngBytes(uri: string): Promise<Uint8Array> {
  const manipulator = require('expo-image-manipulator') as {
    manipulateAsync: (
      uri: string,
      actions: [],
      save: { compress: number; format: string; base64: boolean },
    ) => Promise<{ base64?: string }>;
    SaveFormat: { PNG: string };
  };
  const rendered = await manipulator.manipulateAsync(uri, [], {
    compress: 1,
    format: manipulator.SaveFormat.PNG,
    base64: true,
  });
  if (!rendered.base64) {
    throw new Error('photo_bytes_missing');
  }
  return base64ToBytes(rendered.base64);
}
