import { en } from '@/core/i18n/en';
import { pl } from '@/core/i18n/pl';
import { formatCount, pluralCategory, type Locale } from '@/core/i18n/plurals';

export { formatCount, pluralCategory, type Locale };

/** Angielski jest za flagą. Bez flagi zostaje polski, nawet jeśli ktoś kiedyś zapisze inny język. */
export function resolveLocale(englishEnabled: boolean): Locale {
  return englishEnabled ? 'en' : 'pl';
}

export function messagesFor(englishEnabled: boolean): typeof pl {
  return englishEnabled ? en : pl;
}

export function messageKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix.length === 0 ? key : `${prefix}.${key}`),
  );
}
