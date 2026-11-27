import type { SpeciesDbSource } from '@/core/db/species-db-source';
import {
  durationStats,
  formatDurationStats,
  type DurationStats,
} from '@/core/measure/duration-stats';

/** Ta sama ścieżka co Atlas: `searchSpecies` z `LIMIT 30`. */
const FTS_SPIKE_LIMIT = 30;

/** D13 l. 56. Dotyczy tylko Xiaomi Mi 11 Lite 5G, liczone z p95 ciepłych zapytań. */
const FTS_REFERENCE_BUDGET_MS = 50;

export const ftsSpikeQueries = [
  'bor',
  'borowik',
  'kania',
  'muśchomor',
  'muchomor',
  'pieprznik',
  'kł',
  'gaska',
  'czubajka',
  'zasłonak',
] as const;

export const ftsSeriesCounts = [1, 5, 10, 20, 50] as const;
export const defaultFtsSeriesCount = 20;

type FtsQuerySample = {
  query: string;
  milliseconds: number;
  hitCount: number;
};

type FtsQueryFailure = {
  query: string;
  message: string;
};

type FtsThreshold = 'pass' | 'fail';

export type FtsSeriesMeasurement = {
  requestedRuns: number;
  queries: readonly string[];
  cancelled: boolean;
  cold: FtsQuerySample | null;
  warm: FtsQuerySample[];
  failures: FtsQueryFailure[];
  warmStats: DurationStats | null;
  slowest: FtsQuerySample | null;
  threshold: FtsThreshold | null;
};

export function ftsSpikeSearchFilter(query: string): { query: string; limit: number } {
  return { query, limit: FTS_SPIKE_LIMIT };
}

/** p95 poniżej 50 ms zalicza próg telefonu referencyjnego. Równe 50 ms nie zalicza. */
export function referenceFtsThreshold(p95: number): FtsThreshold {
  return p95 < FTS_REFERENCE_BUDGET_MS ? 'pass' : 'fail';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Zapytanie nie doszło do końca.';
}

function slowestWarm(samples: readonly FtsQuerySample[]): FtsQuerySample | null {
  let slowest: FtsQuerySample | null = null;
  for (const sample of samples) {
    if (slowest === null || sample.milliseconds > slowest.milliseconds) slowest = sample;
  }
  return slowest;
}

/**
 * Powtarza stałą listę `runs` razy. Każde wywołanie `search` to jedno zapytanie.
 * Pierwsze jest zimne i nie wchodzi do statystyk. Reszta udanych to zapytania ciepłe.
 * Wyjątek nie wchodzi do czasów. `shouldCancel` jest sprawdzane przed kolejnym zapytaniem.
 */
export async function measureFtsSeries(options: {
  runs: number;
  queries?: readonly string[];
  search: (query: string) => number;
  now?: () => number;
  shouldCancel?: () => boolean;
  afterEach?: () => Promise<void>;
}): Promise<FtsSeriesMeasurement> {
  const queries = options.queries ?? ftsSpikeQueries;
  const now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());
  const plan: string[] = [];
  const runs = Math.max(0, Math.floor(options.runs));
  for (let run = 0; run < runs; run += 1) {
    for (const query of queries) plan.push(query);
  }

  let cold: FtsQuerySample | null = null;
  const warm: FtsQuerySample[] = [];
  const failures: FtsQueryFailure[] = [];
  let cancelled = false;
  let first = true;

  for (const query of plan) {
    if (options.shouldCancel?.()) {
      cancelled = true;
      break;
    }
    const started = now();
    try {
      const hitCount = options.search(query);
      const sample = { query, milliseconds: now() - started, hitCount };
      if (first) cold = sample;
      else warm.push(sample);
    } catch (error) {
      failures.push({ query, message: errorMessage(error) });
    }
    first = false;
    if (options.afterEach) await options.afterEach();
  }

  const warmStats = durationStats(warm.map((sample) => sample.milliseconds));
  return {
    requestedRuns: runs,
    queries,
    cancelled,
    cold,
    warm,
    failures,
    warmStats,
    slowest: slowestWarm(warm),
    threshold: warmStats === null ? null : referenceFtsThreshold(warmStats.p95),
  };
}

function countOrMissing(value: number | null): string {
  return value === null ? 'brak odczytu' : String(value);
}

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

/** Tekst do `spike-c-fts.txt`. Po polsku, jak raport dekodera. */
export function formatFtsSpikeReport(input: {
  startedAt: string;
  source: SpeciesDbSource;
  speciesCount: number | null;
  ftsCount: number | null;
  contentVersions: readonly string[];
  openMilliseconds: number | null;
  importedAsset: boolean;
  series: FtsSeriesMeasurement;
}): string {
  const lines = [
    'Spike C — species.db i FTS5',
    `Start: ${input.startedAt}`,
    `Źródło: ${input.source}`,
    `Import assetu przy tym otwarciu: ${input.importedAsset ? 'tak' : 'nie'}`,
    `Gatunki: ${countOrMissing(input.speciesCount)}`,
    `species_fts: ${countOrMissing(input.ftsCount)}`,
    `Wersja treści: ${input.contentVersions.length === 0 ? 'brak' : input.contentVersions.join(', ')}`,
    `Czas pierwszego otwarcia (ms): ${input.openMilliseconds === null ? 'brak' : oneDecimal(input.openMilliseconds)}`,
    `Seria: żądane ${input.series.requestedRuns}, zapytań na przebieg ${input.series.queries.length}${input.series.cancelled ? ', przerwana' : ''}`,
    `Zapytania: ${input.series.queries.join(', ')}`,
    `LIMIT: ${FTS_SPIKE_LIMIT}`,
    'Każde zapytanie to searchSpecies, ta sama ścieżka co Atlas. Czas ściany jest z performance.now.',
    'Pierwsze zapytanie jest zimne i nie wchodzi do statystyk. Reszta udanych to zapytania ciepłe.',
    '',
  ];
  if (input.series.cold) {
    lines.push(
      `Zimne: ${input.series.cold.query} ${oneDecimal(input.series.cold.milliseconds)} ms, trafienia ${input.series.cold.hitCount}`,
    );
  } else {
    lines.push('Zimne: brak udanego pierwszego zapytania');
  }
  lines.push(`Nieudane: ${input.series.failures.length}`);
  for (const failure of input.series.failures) {
    lines.push(`  ${failure.query}: ${failure.message}`);
  }
  lines.push(
    input.series.warmStats === null
      ? 'Ciepłe (ms): brak udanych zapytań ciepłych'
      : `Ciepłe (ms): ${formatDurationStats(input.series.warmStats)}`,
  );
  lines.push(
    input.series.slowest === null
      ? 'Najwolniejsze ciepłe: brak'
      : `Najwolniejsze ciepłe: ${input.series.slowest.query} ${oneDecimal(input.series.slowest.milliseconds)} ms`,
  );
  lines.push('');
  lines.push('Próg poniżej 50 ms to p95 ciepłych zapytań i dotyczy tylko Xiaomi Mi 11 Lite 5G.');
  if (input.series.threshold === 'pass') {
    lines.push('Względem progu: poniżej. Wpisz to tylko w kolumnie telefonu referencyjnego.');
  } else if (input.series.threshold === 'fail') {
    lines.push('Względem progu: nie poniżej. Wpisz to tylko w kolumnie telefonu referencyjnego.');
  } else {
    lines.push('Względem progu: brak p95.');
  }
  lines.push('Samsung S23: dym, bez progu.');
  lines.push(
    'To nie jest werdykt z telefonu. Liczby są z tego uruchomienia. Wpisz je ręcznie w docs/spikes/F0-raport.md.',
  );
  return lines.join('\n');
}
