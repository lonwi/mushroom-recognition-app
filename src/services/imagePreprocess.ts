/**
 * Keras MobileNetV3 preprocessing. Must match training/preprocess.py.
 *
 * Resize: bilinear, half-pixel centers
 *   src = (dst + 0.5) * inSize / outSize - 0.5
 * Normalize: (pixel / 127.5) - 1
 * Layout: NHWC RGB, no batch dimension, values in [-1, 1].
 */

export const MODEL_INPUT_SIZE = 224;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function preprocessRgbToMobileNetV3(
  rgb: ArrayLike<number>,
  width: number,
  height: number,
  size: number = MODEL_INPUT_SIZE,
): Float32Array {
  if (width < 1 || height < 1 || size < 1) {
    throw new Error('image dimensions must be positive');
  }
  if (rgb.length !== width * height * 3) {
    throw new Error(`Expected ${width * height * 3} RGB bytes, received ${rgb.length}`);
  }

  const out = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    const srcY = clamp((y + 0.5) * (height / size) - 0.5, 0, height - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, height - 1);
    const ty = srcY - y0;
    for (let x = 0; x < size; x += 1) {
      const srcX = clamp((x + 0.5) * (width / size) - 0.5, 0, width - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, width - 1);
      const tx = srcX - x0;
      const i00 = (y0 * width + x0) * 3;
      const i10 = (y0 * width + x1) * 3;
      const i01 = (y1 * width + x0) * 3;
      const i11 = (y1 * width + x1) * 3;
      const base = (y * size + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const top = rgb[i00 + channel] * (1 - tx) + rgb[i10 + channel] * tx;
        const bottom = rgb[i01 + channel] * (1 - tx) + rgb[i11 + channel] * tx;
        out[base + channel] = (top * (1 - ty) + bottom * ty) / 127.5 - 1;
      }
    }
  }
  return out;
}
