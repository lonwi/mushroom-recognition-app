/**
 * Geometria podpróbkowania dekodera (spike B).
 *
 * Kotlin w `modules/photo-decoder` liczy to samo. Testy przypinają wzór tutaj,
 * bo CI nie kompiluje Androida. To nie jest rozmiar wejścia modelu.
 *
 * `inSampleSize` jest potęgą dwójki: największą, przy której krótszy bok po
 * dzieleniu całkowitym nadal ma co najmniej `minShortSide`.
 * `targetSize` (ImageDecoder) trafia w krótszy bok równy progowi i zachowuje
 * proporcje, z zaokrągleniem połówkowym w stronę +∞.
 */

/** Próg spike'a B, gdy manifest nie podaje `decodeMinWidth`. */
export const SPIKE_MIN_SHORT_SIDE = 448;

export type TargetSize = {
  width: number;
  height: number;
  scaled: boolean;
};

function assertPositiveInt(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} musi być dodatnią liczbą całkowitą`);
  }
}

export function chooseInSampleSize(width: number, height: number, minShortSide: number): number {
  assertPositiveInt(width, 'width');
  assertPositiveInt(height, 'height');
  assertPositiveInt(minShortSide, 'minShortSide');
  const shortSide = Math.min(width, height);
  if (shortSide <= minShortSide) return 1;
  let sample = 1;
  while (Math.floor(shortSide / (sample * 2)) >= minShortSide) {
    sample *= 2;
  }
  return sample;
}

export function targetSizeForShortSide(
  width: number,
  height: number,
  minShortSide: number,
): TargetSize {
  assertPositiveInt(width, 'width');
  assertPositiveInt(height, 'height');
  assertPositiveInt(minShortSide, 'minShortSide');
  const shortSide = Math.min(width, height);
  if (shortSide <= minShortSide) {
    return { width, height, scaled: false };
  }
  const scale = minShortSide / shortSide;
  let targetWidth = Math.max(1, Math.round(width * scale));
  let targetHeight = Math.max(1, Math.round(height * scale));
  if (Math.min(targetWidth, targetHeight) < minShortSide) {
    if (targetWidth <= targetHeight) targetWidth = minShortSide;
    else targetHeight = minShortSide;
  }
  return { width: targetWidth, height: targetHeight, scaled: true };
}
