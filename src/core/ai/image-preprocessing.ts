/**
 * Resampling i normalizacja pod tensor modelu.
 *
 * Wartości biorą się z sekcji `preprocessing` manifestu (rozmiar, kolejność
 * kanałów, skala albo średnia i odchylenie, filtr). Rozmiar wejścia nie jest
 * tu wybrany. Przyjdzie z manifestu, gdy bot treningowy zamknie M0.
 *
 * Piksele wejściowe są już po orientacji EXIF. Obrót robi dekoder albo
 * `ml/preprocess.py` po stronie treningu. Ten plik nie czyta JPEGa.
 *
 * Filtr `box` i `area` to ten sam rozdzielny filtr pudełkowy co w organie
 * prototypu: najpierw wysokość, potem szerokość. Krok `to_size` tym filtrem,
 * gdy któraś oś jest mniejsza od celu, przechodzi na bilinear z centrami
 * połowy piksela. Tak robi `model_rgb_uint8`. Krok `to_width` tylko zmniejsza:
 * obraz już węższy zostaje bez zmian.
 */

export class PreprocessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreprocessError';
  }
}

type ResizeFilter = 'box' | 'area' | 'bilinear' | 'bicubic' | 'nearest';
type ResizeOp = 'to_width' | 'to_size' | 'shorter_side';

type ResizeStep = {
  op: ResizeOp;
  value?: number;
  filter: ResizeFilter;
  antialias?: boolean;
};

type Normalization =
  | { type: 'scale_offset'; scale: number; offset: number }
  | {
      type: 'mean_std';
      mean: readonly [number, number, number];
      std: readonly [number, number, number];
      pixelScale?: number;
    }
  | { type: 'none_uint8' };

export type PreprocessingSpec = {
  inputSize: { width: number; height: number };
  colorOrder: 'RGB' | 'BGR';
  /** Próg dekodera (krótszy bok). Preprocessing go nie stosuje. */
  decodeMinWidth?: number;
  resize: { steps: readonly ResizeStep[] };
  crop: 'none_stretch' | 'center' | 'letterbox';
  letterboxFill?: readonly [number, number, number];
  rounding: 'half_up_uint8' | 'none_float';
  normalization: Normalization;
};

export type RgbImage = {
  width: number;
  height: number;
  rgb: Uint8Array;
};

export type PreprocessedTensor = {
  width: number;
  height: number;
  channels: 3;
  layout: 'NHWC';
  dtype: 'float32' | 'uint8';
  data: Float32Array | Uint8Array;
};

type FloatImage = {
  width: number;
  height: number;
  data: Float64Array;
};

type BoxUpsample = 'box' | 'bilinear';

const FILTERS = ['box', 'area', 'bilinear', 'bicubic', 'nearest'] as const;
const OPS = ['to_width', 'to_size', 'shorter_side'] as const;

function px(data: Float64Array, index: number): number {
  return data[index] ?? 0;
}

function copyPixel(from: Float64Array, src: number, to: Float64Array, dst: number): void {
  to[dst] = px(from, src);
  to[dst + 1] = px(from, src + 1);
  to[dst + 2] = px(from, src + 2);
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function clipByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

function coverage(
  index: number,
  scale: number,
  oldSize: number,
): { start: number; end: number; low: number; high: number } {
  const start = index * scale;
  const end = (index + 1) * scale;
  const low = Math.floor(start);
  const high = Math.min(Math.max(Math.ceil(end - 1e-12), low + 1), oldSize);
  return { start, end, low, high };
}

function resizeAxis(image: FloatImage, newSize: number, axis: 0 | 1): FloatImage {
  const oldSize = axis === 0 ? image.height : image.width;
  if (oldSize === newSize) return image;
  const scale = oldSize / newSize;
  const height = axis === 0 ? newSize : image.height;
  const width = axis === 1 ? newSize : image.width;
  const output = new Float64Array(height * width * 3);

  if (axis === 0) {
    const rowWidth = image.width * 3;
    for (let index = 0; index < newSize; index += 1) {
      const { start, end, low, high } = coverage(index, scale, oldSize);
      let covered = 0;
      const dst = index * rowWidth;
      for (let source = low; source < high; source += 1) {
        const overlap = Math.min(end, source + 1) - Math.max(start, source);
        if (overlap <= 0) continue;
        const src = source * rowWidth;
        for (let i = 0; i < rowWidth; i += 1) {
          output[dst + i] = px(output, dst + i) + px(image.data, src + i) * overlap;
        }
        covered += overlap;
      }
      if (covered <= 0) throw new PreprocessError('Filtr pudełkowy nie objął piksela.');
      for (let i = 0; i < rowWidth; i += 1) output[dst + i] = px(output, dst + i) / covered;
    }
    return { width: image.width, height: newSize, data: output };
  }

  for (let y = 0; y < image.height; y += 1) {
    for (let index = 0; index < newSize; index += 1) {
      const { start, end, low, high } = coverage(index, scale, oldSize);
      let covered = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let source = low; source < high; source += 1) {
        const overlap = Math.min(end, source + 1) - Math.max(start, source);
        if (overlap <= 0) continue;
        const src = (y * image.width + source) * 3;
        red += px(image.data, src) * overlap;
        green += px(image.data, src + 1) * overlap;
        blue += px(image.data, src + 2) * overlap;
        covered += overlap;
      }
      if (covered <= 0) throw new PreprocessError('Filtr pudełkowy nie objął piksela.');
      const dst = (y * newSize + index) * 3;
      output[dst] = red / covered;
      output[dst + 1] = green / covered;
      output[dst + 2] = blue / covered;
    }
  }
  return { width: newSize, height: image.height, data: output };
}

function resizeBox(image: FloatImage, width: number, height: number): FloatImage {
  return resizeAxis(resizeAxis(image, height, 0), width, 1);
}

function resizeBilinear(image: FloatImage, width: number, height: number): FloatImage {
  if (image.width === width && image.height === height) return image;
  const output = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    let sy = ((y + 0.5) * image.height) / height - 0.5;
    if (sy < 0) sy = 0;
    if (sy > image.height - 1) sy = image.height - 1;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, image.height - 1);
    const ty = sy - y0;
    for (let x = 0; x < width; x += 1) {
      let sx = ((x + 0.5) * image.width) / width - 0.5;
      if (sx < 0) sx = 0;
      if (sx > image.width - 1) sx = image.width - 1;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, image.width - 1);
      const tx = sx - x0;
      const dst = (y * width + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const top =
          px(image.data, (y0 * image.width + x0) * 3 + channel) * (1 - tx) +
          px(image.data, (y0 * image.width + x1) * 3 + channel) * tx;
        const bottom =
          px(image.data, (y1 * image.width + x0) * 3 + channel) * (1 - tx) +
          px(image.data, (y1 * image.width + x1) * 3 + channel) * tx;
        output[dst + channel] = top * (1 - ty) + bottom * ty;
      }
    }
  }
  return { width, height, data: output };
}

function resizeNearest(image: FloatImage, width: number, height: number): FloatImage {
  if (image.width === width && image.height === height) return image;
  const output = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const sy = ((y + 0.5) * image.height) / height - 0.5;
    const iy = Math.min(Math.max(Math.floor(sy + 0.5), 0), image.height - 1);
    for (let x = 0; x < width; x += 1) {
      const sx = ((x + 0.5) * image.width) / width - 0.5;
      const ix = Math.min(Math.max(Math.floor(sx + 0.5), 0), image.width - 1);
      copyPixel(image.data, (iy * image.width + ix) * 3, output, (y * width + x) * 3);
    }
  }
  return { width, height, data: output };
}

function cubicWeight(distance: number): number {
  const a = -0.5;
  const x = Math.abs(distance);
  if (x <= 1) return (a + 2) * x * x * x - (a + 3) * x * x + 1;
  if (x < 2) return a * x * x * x - 5 * a * x * x + 8 * a * x - 4 * a;
  return 0;
}

function sampleClamped(image: FloatImage, x: number, y: number, channel: number): number {
  const xx = x < 0 ? 0 : x > image.width - 1 ? image.width - 1 : x;
  const yy = y < 0 ? 0 : y > image.height - 1 ? image.height - 1 : y;
  return px(image.data, (yy * image.width + xx) * 3 + channel);
}

function resizeBicubic(image: FloatImage, width: number, height: number): FloatImage {
  if (image.width === width && image.height === height) return image;
  const output = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const sy = ((y + 0.5) * image.height) / height - 0.5;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    for (let x = 0; x < width; x += 1) {
      const sx = ((x + 0.5) * image.width) / width - 0.5;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      const dst = (y * width + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        let acc = 0;
        for (let ky = -1; ky <= 2; ky += 1) {
          const wy = cubicWeight(fy - ky);
          for (let kx = -1; kx <= 2; kx += 1) {
            acc += sampleClamped(image, x0 + kx, y0 + ky, channel) * cubicWeight(fx - kx) * wy;
          }
        }
        output[dst + channel] = acc;
      }
    }
  }
  return { width, height, data: output };
}

function resizeTo(
  image: FloatImage,
  width: number,
  height: number,
  filter: ResizeFilter,
  boxUpsample: BoxUpsample,
): FloatImage {
  if (image.width === width && image.height === height) return image;
  const shrinking = image.height >= height && image.width >= width;
  if ((filter === 'box' || filter === 'area') && !(shrinking || boxUpsample === 'box')) {
    return resizeBilinear(image, width, height);
  }
  if (filter === 'box' || filter === 'area') return resizeBox(image, width, height);
  if (filter === 'bilinear') return resizeBilinear(image, width, height);
  if (filter === 'nearest') return resizeNearest(image, width, height);
  return resizeBicubic(image, width, height);
}

function cropCenter(image: FloatImage, width: number, height: number): FloatImage {
  const left = Math.floor((image.width - width) / 2);
  const top = Math.floor((image.height - height) / 2);
  const output = new Float64Array(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const src = ((top + y) * image.width + left) * 3;
    output.set(image.data.subarray(src, src + width * 3), y * width * 3);
  }
  return { width, height, data: output };
}

function letterbox(
  image: FloatImage,
  width: number,
  height: number,
  fill: readonly [number, number, number],
): FloatImage {
  const output = new Float64Array(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    output[i * 3] = fill[0];
    output[i * 3 + 1] = fill[1];
    output[i * 3 + 2] = fill[2];
  }
  const left = Math.floor((width - image.width) / 2);
  const top = Math.floor((height - image.height) / 2);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      copyPixel(
        image.data,
        (y * image.width + x) * 3,
        output,
        ((top + y) * width + (left + x)) * 3,
      );
    }
  }
  return { width, height, data: output };
}

function applySteps(image: FloatImage, spec: PreprocessingSpec): FloatImage {
  let current = image;
  for (const step of spec.resize.steps) {
    if ((step.filter === 'box' || step.filter === 'area') && step.antialias === false) {
      throw new PreprocessError('Filtr box bez antyaliasingu nie jest zaimplementowany.');
    }
    if (step.op === 'to_width') {
      if (step.value === undefined) throw new PreprocessError('Krok to_width wymaga value.');
      if (current.width <= step.value) continue;
      const targetHeight = Math.max(
        1,
        Math.floor((current.height * step.value) / current.width + 0.5),
      );
      current = resizeTo(current, step.value, targetHeight, step.filter, 'box');
      continue;
    }
    if (step.op === 'shorter_side') {
      if (step.value === undefined) throw new PreprocessError('Krok shorter_side wymaga value.');
      const shortSide = Math.min(current.width, current.height);
      if (shortSide === step.value) continue;
      const scale = step.value / shortSide;
      current = resizeTo(
        current,
        Math.max(1, Math.round(current.width * scale)),
        Math.max(1, Math.round(current.height * scale)),
        step.filter,
        'box',
      );
      continue;
    }
    current = resizeTo(
      current,
      spec.inputSize.width,
      spec.inputSize.height,
      step.filter,
      'bilinear',
    );
  }
  return current;
}

function applyCrop(image: FloatImage, spec: PreprocessingSpec): FloatImage {
  const targetWidth = spec.inputSize.width;
  const targetHeight = spec.inputSize.height;
  if (image.width === targetWidth && image.height === targetHeight) return image;
  if (spec.crop === 'none_stretch') {
    return resizeTo(image, targetWidth, targetHeight, 'bilinear', 'bilinear');
  }
  if (spec.crop === 'center') {
    const scale = Math.max(targetWidth / image.width, targetHeight / image.height);
    const resized = resizeTo(
      image,
      Math.max(targetWidth, Math.round(image.width * scale)),
      Math.max(targetHeight, Math.round(image.height * scale)),
      'bilinear',
      'bilinear',
    );
    return cropCenter(resized, targetWidth, targetHeight);
  }
  const scale = Math.min(targetWidth / image.width, targetHeight / image.height);
  const resized = resizeTo(
    image,
    Math.min(targetWidth, Math.max(1, Math.round(image.width * scale))),
    Math.min(targetHeight, Math.max(1, Math.round(image.height * scale))),
    'bilinear',
    'bilinear',
  );
  const fill = spec.letterboxFill ?? [0, 0, 0];
  return letterbox(resized, targetWidth, targetHeight, fill);
}

function normalize(value: number, channel: number, spec: Normalization): number {
  if (spec.type === 'scale_offset') return value * spec.scale + spec.offset;
  if (spec.type === 'mean_std') {
    const scale = spec.pixelScale ?? 1;
    return (value * scale - (spec.mean[channel] ?? 0)) / (spec.std[channel] ?? 1);
  }
  return value;
}

function emit(image: FloatImage, spec: PreprocessingSpec): PreprocessedTensor {
  const count = image.width * image.height;
  const bgr = spec.colorOrder === 'BGR';
  if (spec.normalization.type === 'none_uint8') {
    if (spec.rounding !== 'half_up_uint8') {
      throw new PreprocessError('Normalizacja none_uint8 wymaga rounding half_up_uint8.');
    }
    const data = new Uint8Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const source = bgr ? 2 - channel : channel;
        data[i * 3 + channel] = clipByte(roundHalfUp(px(image.data, i * 3 + source)));
      }
    }
    return {
      width: image.width,
      height: image.height,
      channels: 3,
      layout: 'NHWC',
      dtype: 'uint8',
      data,
    };
  }

  const data = new Float32Array(count * 3);
  const round = spec.rounding === 'half_up_uint8';
  for (let i = 0; i < count; i += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const source = bgr ? 2 - channel : channel;
      let value = px(image.data, i * 3 + source);
      if (round) value = clipByte(roundHalfUp(value));
      data[i * 3 + channel] = normalize(value, channel, spec.normalization);
    }
  }
  return {
    width: image.width,
    height: image.height,
    channels: 3,
    layout: 'NHWC',
    dtype: 'float32',
    data,
  };
}

function fromUint8(image: RgbImage): FloatImage {
  if (!Number.isInteger(image.width) || image.width < 1) {
    throw new PreprocessError('Szerokość obrazu musi być dodatnia.');
  }
  if (!Number.isInteger(image.height) || image.height < 1) {
    throw new PreprocessError('Wysokość obrazu musi być dodatnia.');
  }
  const expected = image.width * image.height * 3;
  if (image.rgb.length !== expected) {
    throw new PreprocessError('Bufor RGB nie zgadza się z wymiarami.');
  }
  const data = new Float64Array(expected);
  for (let i = 0; i < expected; i += 1) data[i] = image.rgb[i] ?? 0;
  return { width: image.width, height: image.height, data };
}

export function preprocessImage(image: RgbImage, spec: PreprocessingSpec): PreprocessedTensor {
  const raster = applyCrop(applySteps(fromUint8(image), spec), spec);
  return emit(raster, spec);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PreprocessError(`${label} musi być obiektem.`);
  }
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new PreprocessError(`${label} musi być skończoną liczbą.`);
  }
  return value;
}

function intAtLeast(value: unknown, label: string, minimum: number): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < minimum) {
    throw new PreprocessError(`${label} musi być liczbą całkowitą od ${minimum}.`);
  }
  return number;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value))
    return value as T;
  throw new PreprocessError(`${label} ma niedozwoloną wartość.`);
}

function triple(value: unknown, label: string, bytes = false): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new PreprocessError(`${label} musi mieć trzy liczby.`);
  }
  return [0, 1, 2].map((index) => {
    const item = bytes ? intAtLeast(value[index], label, 0) : finiteNumber(value[index], label);
    if (bytes && item > 255) throw new PreprocessError(`${label} mieści się w bajcie.`);
    return item;
  }) as [number, number, number];
}

function readNormalization(value: unknown): Normalization {
  const record = asRecord(value, 'normalization');
  const type = oneOf(
    record.type,
    ['scale_offset', 'mean_std', 'none_uint8'] as const,
    'normalization.type',
  );
  if (type === 'none_uint8') return { type };
  if (type === 'scale_offset') {
    return {
      type,
      scale: finiteNumber(record.scale, 'normalization.scale'),
      offset: finiteNumber(record.offset, 'normalization.offset'),
    };
  }
  const std = triple(record.std, 'normalization.std');
  if (std.some((item) => item <= 0)) {
    throw new PreprocessError('normalization.std musi być dodatnie.');
  }
  const parsed: Normalization = {
    type,
    mean: triple(record.mean, 'normalization.mean'),
    std,
  };
  if (record.pixelScale !== undefined) {
    return { ...parsed, pixelScale: finiteNumber(record.pixelScale, 'normalization.pixelScale') };
  }
  return parsed;
}

function readSteps(value: unknown): ResizeStep[] {
  const record = asRecord(value, 'resize');
  if (!Array.isArray(record.steps) || record.steps.length < 1) {
    throw new PreprocessError('resize.steps musi mieć co najmniej jeden krok.');
  }
  return record.steps.map((step, index) => {
    const item = asRecord(step, `resize.steps[${index}]`);
    const op = oneOf(item.op, OPS, 'op');
    const filter = oneOf(item.filter, FILTERS, 'filter');
    const parsed: ResizeStep = { op, filter };
    if (item.value !== undefined) parsed.value = intAtLeast(item.value, 'value', 1);
    if (op !== 'to_size' && parsed.value === undefined) {
      throw new PreprocessError(`Krok ${op} wymaga value.`);
    }
    if (item.antialias !== undefined) {
      if (typeof item.antialias !== 'boolean') {
        throw new PreprocessError('antialias musi być wartością logiczną.');
      }
      parsed.antialias = item.antialias;
    }
    return parsed;
  });
}

/**
 * Czyta sekcję `preprocessing`. Domyślny próg rozmiaru to 32, jak w schemacie.
 * Testy fixture'ów podają `minimumSize: 1`, bo organ prototypu ma małe rastry.
 */
export function readPreprocessingSpec(
  value: unknown,
  options?: { minimumSize?: number },
): PreprocessingSpec {
  const minimumSize = options?.minimumSize ?? 32;
  const record = asRecord(value, 'preprocessing');
  if (record.exifOrientation !== undefined && record.exifOrientation !== 'apply') {
    throw new PreprocessError('exifOrientation musi być apply.');
  }
  const inputSize = asRecord(record.inputSize, 'inputSize');
  const spec: PreprocessingSpec = {
    inputSize: {
      width: intAtLeast(inputSize.width, 'inputSize.width', minimumSize),
      height: intAtLeast(inputSize.height, 'inputSize.height', minimumSize),
    },
    colorOrder: oneOf(record.colorOrder, ['RGB', 'BGR'] as const, 'colorOrder'),
    resize: { steps: readSteps(record.resize) },
    crop: oneOf(record.crop, ['none_stretch', 'center', 'letterbox'] as const, 'crop'),
    rounding: oneOf(record.rounding, ['half_up_uint8', 'none_float'] as const, 'rounding'),
    normalization: readNormalization(record.normalization),
  };
  if (record.decodeMinWidth !== undefined) {
    spec.decodeMinWidth = intAtLeast(record.decodeMinWidth, 'decodeMinWidth', 1);
  }
  if (record.letterboxFill !== undefined) {
    spec.letterboxFill = triple(record.letterboxFill, 'letterboxFill', true);
  }
  return spec;
}
