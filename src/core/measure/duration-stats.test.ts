import { durationStats } from '@/core/measure/duration-stats';

test('an empty list has no stats', () => {
  expect(durationStats([])).toBeNull();
});

test('one sample is its own mean, median, min, max and p95', () => {
  expect(durationStats([12.5])).toEqual({
    count: 1,
    mean: 12.5,
    median: 12.5,
    min: 12.5,
    max: 12.5,
    p50: 12.5,
    p95: 12.5,
  });
});

test('p95 is nearest-rank, including a short series', () => {
  expect(durationStats([])).toBeNull();
  const twenty = Array.from({ length: 20 }, (_, index) => index + 1);
  expect(durationStats(twenty)?.p95).toBe(19);
  expect(durationStats([10, 20, 30])?.p95).toBe(30);
});

test('an odd count uses the middle sample as the median', () => {
  const stats = durationStats([160.7, 129, 129, 127.9, 141.5]);
  expect(stats).toMatchObject({
    count: 5,
    median: 129,
    min: 127.9,
    max: 160.7,
    p95: 160.7,
  });
  expect(stats?.mean).toBeCloseTo(137.62, 5);
});

test('an even count averages the two middle samples', () => {
  expect(durationStats([4, 1, 3, 2])).toEqual({
    count: 4,
    mean: 2.5,
    median: 2.5,
    min: 1,
    max: 4,
    p50: 2,
    p95: 4,
  });
});
