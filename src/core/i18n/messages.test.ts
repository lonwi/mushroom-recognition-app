import { en } from '@/core/i18n/en';
import { messageKeys, messagesFor, resolveLocale } from '@/core/i18n';
import { pl } from '@/core/i18n/pl';

test('english mirrors the polish key tree and stays behind the flag', () => {
  expect(messageKeys(en)).toEqual(messageKeys(pl));
  expect(resolveLocale(false)).toBe('pl');
  expect(resolveLocale(true)).toBe('en');
  expect(messagesFor(false).tabs.scanner).toBe('Skaner');
  expect(messagesFor(true).tabs.scanner).toBe('Scanner');
});
