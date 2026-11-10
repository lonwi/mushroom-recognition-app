import { formatCount, pluralCategory } from '@/core/i18n';
import { pl } from '@/core/i18n/pl';

test('uses CLDR categories without Intl', () => {
  expect(pluralCategory('pl', 1)).toBe('one');
  expect(pluralCategory('pl', 2)).toBe('few');
  expect(pluralCategory('pl', 4)).toBe('few');
  expect(pluralCategory('pl', 5)).toBe('many');
  expect(pluralCategory('pl', 12)).toBe('many');
  expect(pluralCategory('pl', 22)).toBe('few');
  expect(pluralCategory('pl', 21)).toBe('many');
  expect(pluralCategory('pl', 0)).toBe('many');
  expect(pluralCategory('pl', 1.5)).toBe('other');
  expect(pluralCategory('en', 1)).toBe('one');
  expect(pluralCategory('en', 0)).toBe('other');
  expect(pluralCategory('en', 2)).toBe('other');
});

test('fills the count into the Polish few form', () => {
  expect(formatCount(pl.plurals.photos, 'pl', 2)).toBe('2 zdjęcia');
});
