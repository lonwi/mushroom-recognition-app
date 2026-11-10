export type Locale = 'pl' | 'en';

export type PluralCategory = 'one' | 'few' | 'many' | 'other';

/**
 * Kategorie CLDR dla liczb całkowitych, bez `Intl`.
 * Polski: one / few / many. Angielski: one / other.
 * Ułamek i liczba ujemna spadają do `other` (w UI liczymy sztuki).
 */
export function pluralCategory(locale: Locale, value: number): PluralCategory {
  if (!Number.isInteger(value) || value < 0) return 'other';
  if (locale === 'en') return value === 1 ? 'one' : 'other';
  if (value === 1) return 'one';
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

export function formatCount(
  forms: Record<PluralCategory, string>,
  locale: Locale,
  value: number,
): string {
  return forms[pluralCategory(locale, value)].replaceAll('{n}', String(value));
}
