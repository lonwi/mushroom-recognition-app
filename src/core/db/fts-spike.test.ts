import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  defaultFtsSeriesCount,
  formatFtsSpikeReport,
  ftsSeriesCounts,
  ftsSpikeQueries,
  ftsSpikeSearchFilter,
  measureFtsSeries,
  referenceFtsThreshold,
} from '@/core/db/fts-spike';

test('lista zapytań ma polskie prefiksy i literówki z diakrytykami', () => {
  expect(ftsSpikeQueries).toEqual([
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
  ]);
  expect(ftsSeriesCounts).toEqual([1, 5, 10, 20, 50]);
  expect(defaultFtsSeriesCount).toBe(20);
  expect(ftsSpikeSearchFilter('borowik')).toEqual({ query: 'borowik', limit: 30 });
});

test('próg 50 ms jest ostry: równe 50 nie zalicza', () => {
  expect(referenceFtsThreshold(49.9)).toBe('pass');
  expect(referenceFtsThreshold(50)).toBe('fail');
  expect(referenceFtsThreshold(0)).toBe('pass');
});

test('pierwsze zapytanie jest zimne, reszta zasila statystyki, wyjątek jest osobno', async () => {
  let tick = 0;
  const seen: string[] = [];
  const series = await measureFtsSeries({
    runs: 1,
    queries: ['bor', 'kania', 'muchomor', 'zasłonak'],
    now: () => {
      const value = tick;
      tick += 10;
      return value;
    },
    search: (query) => {
      seen.push(query);
      if (query === 'kania') throw new Error('fts');
      return query.length;
    },
  });

  expect(seen).toEqual(['bor', 'kania', 'muchomor', 'zasłonak']);
  expect(series.cold).toEqual({ query: 'bor', milliseconds: 10, hitCount: 3 });
  expect(series.failures).toEqual([{ query: 'kania', message: 'fts' }]);
  expect(series.warm.map((sample) => sample.query)).toEqual(['muchomor', 'zasłonak']);
  expect(series.warmStats).toMatchObject({ count: 2, min: 10, max: 10, p95: 10 });
  expect(series.slowest).toMatchObject({ query: 'muchomor', milliseconds: 10 });
  expect(series.threshold).toBe('pass');
  expect(series.cancelled).toBe(false);
});

test('p95 równe 50 ms nie zalicza progu telefonu referencyjnego', async () => {
  const ticks = [0, 1, 1, 51];
  let index = 0;
  const series = await measureFtsSeries({
    runs: 1,
    queries: ['bor', 'zasłonak'],
    now: () => ticks[index++] ?? 0,
    search: () => 1,
  });
  expect(series.cold?.milliseconds).toBe(1);
  expect(series.warmStats?.p95).toBe(50);
  expect(series.threshold).toBe('fail');
});

test('nieudane pierwsze zapytanie nie wchodzi do zimnego czasu ani do p95', async () => {
  let tick = 0;
  const series = await measureFtsSeries({
    runs: 1,
    queries: ['bor', 'kania'],
    now: () => {
      tick += 5;
      return tick;
    },
    search: (query) => {
      if (query === 'bor') throw new Error('cold');
      return 2;
    },
  });
  expect(series.cold).toBeNull();
  expect(series.failures).toEqual([{ query: 'bor', message: 'cold' }]);
  expect(series.warm).toHaveLength(1);
  expect(series.warmStats?.count).toBe(1);
  expect(series.threshold).toBe('pass');
});

test('seria powtarza całą listę, a anulowanie staje przed kolejnym zapytaniem', async () => {
  let calls = 0;
  const series = await measureFtsSeries({
    runs: 3,
    queries: ['bor', 'kania'],
    now: () => calls,
    shouldCancel: () => calls >= 2,
    search: () => {
      calls += 1;
      return 1;
    },
  });
  expect(calls).toBe(2);
  expect(series.cancelled).toBe(true);
  expect(series.requestedRuns).toBe(3);
  expect(series.cold?.query).toBe('bor');
  expect(series.warm.map((sample) => sample.query)).toEqual(['kania']);
});

test('przy remisie najwolniejsze zostaje pierwsze', async () => {
  const ticks = [0, 10, 10, 20, 20, 30];
  let index = 0;
  const series = await measureFtsSeries({
    runs: 1,
    queries: ['bor', 'kania', 'muchomor'],
    now: () => ticks[index++] ?? 0,
    search: () => 1,
  });
  expect(series.slowest?.query).toBe('kania');
  expect(series.warmStats?.p95).toBeLessThan(50);
  expect(series.threshold).toBe('pass');
});

test('raport niesie źródło i próg tylko dla telefonu referencyjnego', () => {
  const text = formatFtsSpikeReport({
    startedAt: '2026-11-23T00:00:00.000Z',
    source: 'asset',
    speciesCount: null,
    ftsCount: 0,
    contentVersions: ['2026-11-11.1'],
    openMilliseconds: 12.34,
    importedAsset: true,
    series: {
      requestedRuns: 1,
      queries: ['bor'],
      cancelled: false,
      cold: { query: 'bor', milliseconds: 3, hitCount: 1 },
      warm: [],
      failures: [],
      warmStats: null,
      slowest: null,
      threshold: null,
    },
  });
  expect(text).toContain('Źródło: asset');
  expect(text).toContain('Gatunki: brak odczytu');
  expect(text).toContain('species_fts: 0');
  expect(text).toContain('Wersja treści: 2026-11-11.1');
  expect(text).toContain('Czas pierwszego otwarcia (ms): 12.3');
  expect(text).toContain('Xiaomi Mi 11 Lite 5G');
  expect(text).toContain('Samsung S23: dym, bez progu.');
  expect(text).not.toContain('Huawei');
});

test('ekran woła searchSpecies z limitem 30 i zegarem performance.now', () => {
  const source = readFileSync(join(process.cwd(), 'src/screens/fts-spike.tsx'), 'utf8');
  expect(source).toContain('searchSpecies(getSpeciesDb(), ftsSpikeSearchFilter(query))');
  expect(source).toContain('performance.now()');
});
