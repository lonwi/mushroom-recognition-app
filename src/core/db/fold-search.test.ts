import { foldForSearch, speciesSearchSql, toFtsQuery } from '@/core/db/fold-search';

test('folds polish letters including ł', () => {
  expect(foldForSearch('Żółty łuskwiak')).toBe('zolty luskwiak');
  expect(foldForSearch('Gołąbek')).toBe('golabek');
  expect(toFtsQuery('żółty')).toBe('"zolty"*');
  expect(speciesSearchSql('')).toBeNull();
});
