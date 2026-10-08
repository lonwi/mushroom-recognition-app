/**
 * Keras MobileNetV3 preprocessing. Must match training/preprocess.py.
 *
 * Downsampling (both sides at least the model size) is an antialiased box
 * filter. Each output pixel averages the source rectangle it covers, then
 * the result is rounded to uint8 so it matches the cached 224 PNG.
 * Height is resized first, then width.
 *
 * Upsampling keeps bilinear sampling with half-pixel centers:
 *   src = (dst + 0.5) * inSize / outSize - 0.5
 * The bilinear sample is rounded to uint8 with Math.round before normalize,
 * the same half-up rule as the area resize.
 *
 * Normalize: (pixel / 127.5) - 1
 * Layout: NHWC RGB, no batch dimension, values in [-1, 1].
 */

export const MODEL_INPUT_SIZE = 224;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resizeAxis(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  newSize: number,
  axis: 'y' | 'x',
): Float64Array {
  const oldSize = axis === 'y' ? height : width;
  const outHeight = axis === 'y' ? newSize : height;
  const outWidth = axis === 'x' ? newSize : width;
  if (oldSize === newSize) {
    const copy = new Float64Array(pixels.length);
    copy.set(pixels);
    return copy;
  }
  const scale = oldSize / newSize;
  const output = new Float64Array(outHeight * outWidth * 3);
  for (let index = 0; index < newSize; index += 1) {
    const start = index * scale;
    const end = (index + 1) * scale;
    const low = Math.floor(start);
    let high = Math.ceil(end - 1e-12);
    high = Math.min(Math.max(high, low + 1), oldSize);
    let covered = 0;
    for (let source = low; source < high; source += 1) {
      const overlap = Math.min(end, source + 1) - Math.max(start, source);
      if (overlap <= 0) {
        continue;
      }
      covered += overlap;
      if (axis === 'y') {
        const src = source * width * 3;
        const dest = index * width * 3;
        for (let offset = 0; offset < width * 3; offset += 1) {
          output[dest + offset] += pixels[src + offset] * overlap;
        }
      } else {
        for (let y = 0; y < height; y += 1) {
          const src = (y * oldSize + source) * 3;
          const dest = (y * newSize + index) * 3;
          output[dest] += pixels[src] * overlap;
          output[dest + 1] += pixels[src + 1] * overlap;
          output[dest + 2] += pixels[src + 2] * overlap;
        }
      }
    }
    if (axis === 'y') {
      const dest = index * width * 3;
      for (let offset = 0; offset < width * 3; offset += 1) {
        output[dest + offset] /= covered;
      }
    } else {
      for (let y = 0; y < height; y += 1) {
        const dest = (y * newSize + index) * 3;
        output[dest] /= covered;
        output[dest + 1] /= covered;
        output[dest + 2] /= covered;
      }
    }
  }
  return output;
}

function resizeAreaUint8(rgb: ArrayLike<number>, width: number, height: number, size: number): Uint8Array {
  const byHeight = resizeAxis(rgb, width, height, size, 'y');
  const byWidth = resizeAxis(byHeight, width, size, size, 'x');
  const output = new Uint8Array(size * size * 3);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Math.min(255, Math.max(0, Math.round(byWidth[index])));
  }
  return output;
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

  if (width >= size && height >= size) {
    const resized = resizeAreaUint8(rgb, width, height, size);
    const out = new Float32Array(resized.length);
    for (let index = 0; index < resized.length; index += 1) {
      out[index] = resized[index] / 127.5 - 1;
    }
    return out;
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
        const pixel = Math.min(255, Math.max(0, Math.round(top * (1 - ty) + bottom * ty)));
        out[base + channel] = pixel / 127.5 - 1;
      }
    }
  }
  return out;
}
