export interface DurationStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  /** Nearest-rank: ranga = ceil(0,50 × n), wartość na tej pozycji posortowanej listy (indeks od 1). */
  p50: number;
  /** Nearest-rank: ranga = ceil(0,95 × n), wartość na tej pozycji posortowanej listy (indeks od 1). */
  p95: number;
}

/**
 * Pusta lista nie ma średniej, mediany ani p95.
 * Mediana przy parzystej liczbie próbek jest średnią dwóch środkowych.
 * p95 nie interpoluje: dla n = 1 jest jedyną próbką, dla n = 20 jest 19. wartością.
 */
export function durationStats(values: readonly number[]): DurationStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const count = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mid = Math.floor(count / 2);
  const upper = sorted[mid];
  const lower = sorted[mid - 1];
  const min = sorted[0];
  const max = sorted[count - 1];
  const p50 = sorted[Math.ceil(0.5 * count) - 1];
  const p95 = sorted[Math.ceil(0.95 * count) - 1];
  if (
    upper === undefined ||
    min === undefined ||
    max === undefined ||
    p50 === undefined ||
    p95 === undefined
  ) {
    return null;
  }
  const median = count % 2 === 1 ? upper : ((lower ?? upper) + upper) / 2;
  return { count, mean: sum / count, median, min, max, p50, p95 };
}

/** Jedna linia do raportu spike'a. Kropka dziesiętna, jak w pozostałych czasach raportu. */
export function formatDurationStats(stats: DurationStats): string {
  const digit = (value: number) => value.toFixed(1);
  return `n=${stats.count}, średnia ${digit(stats.mean)}, mediana ${digit(stats.median)}, min ${digit(stats.min)}, max ${digit(stats.max)}, p95 ${digit(stats.p95)}`;
}
