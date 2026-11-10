import Storage from 'expo-sqlite/kv-store';
import { useStore } from 'zustand';

import {
  createSettingsStore,
  type SettingsState,
  type SyncKeyValue,
} from '@/core/settings/create-settings-store';

const sqliteStorage: SyncKeyValue = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => {
    Storage.setItemSync(key, value);
  },
};

export const settingsStore = createSettingsStore(sqliteStorage);

export function useSettings<T>(selector: (state: SettingsState) => T): T {
  return useStore(settingsStore, selector);
}
