import {
  createSettingsStore,
  defaultSettings,
  SETTINGS_KEY,
  type SyncKeyValue,
} from '@/core/settings/create-settings-store';

function memoryStore(initial?: string): SyncKeyValue & { raw(): string | null } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(SETTINGS_KEY, initial);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    raw: () => values.get(SETTINGS_KEY) ?? null,
  };
}

test('reads the theme synchronously and defaults to Polish', () => {
  const storage = memoryStore();
  const store = createSettingsStore(storage);
  expect(store.getState().theme).toBe('light');
  expect(store.getState().englishEnabled).toBe(false);
  expect(storage.raw()).toBe(JSON.stringify(defaultSettings()));
});

test('keeps a saved theme for the next launch', () => {
  const storage = memoryStore();
  createSettingsStore(storage).getState().setTheme('dark');
  expect(createSettingsStore(storage).getState().theme).toBe('dark');
});

test('drops an unknown theme and keeps English behind an explicit flag', () => {
  const storage = memoryStore(JSON.stringify({ theme: 'neon', englishEnabled: 'yes' }));
  const store = createSettingsStore(storage);
  expect(store.getState().theme).toBe('light');
  expect(store.getState().englishEnabled).toBe(false);
  store.getState().setEnglishEnabled(true);
  expect(createSettingsStore(storage).getState().englishEnabled).toBe(true);
});
