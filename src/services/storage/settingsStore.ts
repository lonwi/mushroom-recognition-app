import { asyncStorageStore, type KeyValueStore } from './keyValueStore';

/** Existing keys. A newer prefix would hide settings already stored on devices. */
export const LANGUAGE_STORAGE_KEY = 'app_language';
export const DISCLAIMER_STORAGE_KEY = '@grzybobranie_ai:disclaimer_accepted_v1';

export type StoredLanguage = 'pl' | 'en';

/** Disclaimer acceptance and app language. Not part of the journal. */
export class SettingsStore {
  constructor(private readonly store: KeyValueStore) {}

  async getLanguage(): Promise<StoredLanguage | null> {
    try {
      const storedLang = await this.store.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang === 'pl' || storedLang === 'en') return storedLang;
      return null;
    } catch (error) {
      console.error('Failed to load language', error);
      return null;
    }
  }

  async setLanguage(lang: StoredLanguage): Promise<void> {
    try {
      await this.store.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('Failed to save language', error);
    }
  }

  async hasAcceptedDisclaimer(): Promise<boolean> {
    try {
      const val = await this.store.getItem(DISCLAIMER_STORAGE_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  async setAcceptedDisclaimer(accepted: boolean): Promise<void> {
    try {
      await this.store.setItem(DISCLAIMER_STORAGE_KEY, accepted ? 'true' : 'false');
    } catch (error) {
      console.error('Błąd zapisu statusu disclaimer:', error);
    }
  }
}

export const settingsStore = new SettingsStore(asyncStorageStore);
