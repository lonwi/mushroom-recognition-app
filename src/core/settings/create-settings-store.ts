import { createStore, type StoreApi } from 'zustand/vanilla';

import { themeNames, type ThemeName } from '@/core/theme';

export const SETTINGS_KEY = 'settings.v1';

export interface SyncKeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Settings {
  theme: ThemeName;
  englishEnabled: boolean;
}

export interface SettingsState extends Settings {
  setTheme: (theme: ThemeName) => void;
  setEnglishEnabled: (enabled: boolean) => void;
}

export function defaultSettings(): Settings {
  return { theme: 'light', englishEnabled: false };
}

function isTheme(value: unknown): value is ThemeName {
  return themeNames.some((theme) => theme === value);
}

function parseSettings(raw: string | null): Settings {
  const fallback = defaultSettings();
  if (raw === null || raw.length === 0) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const record = parsed as Record<string, unknown>;
    return {
      theme: isTheme(record.theme) ? record.theme : fallback.theme,
      englishEnabled: record.englishEnabled === true,
    };
  } catch {
    return fallback;
  }
}

/** Odczyt motywu jest synchroniczny, zanim pierwsza klatka się narysuje (D-04). */
export function createSettingsStore(storage: SyncKeyValue): StoreApi<SettingsState> {
  const parsed = parseSettings(storage.getItem(SETTINGS_KEY));
  const serialized = JSON.stringify(parsed);
  if (storage.getItem(SETTINGS_KEY) !== serialized) {
    storage.setItem(SETTINGS_KEY, serialized);
  }
  return createStore<SettingsState>()((set, get) => ({
    theme: parsed.theme,
    englishEnabled: parsed.englishEnabled,
    setTheme: (theme) => {
      const next = { theme, englishEnabled: get().englishEnabled };
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
      set({ theme });
    },
    setEnglishEnabled: (englishEnabled) => {
      const next = { theme: get().theme, englishEnabled };
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
      set({ englishEnabled });
    },
  }));
}
