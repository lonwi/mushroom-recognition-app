import AsyncStorage from '@react-native-async-storage/async-storage';
import { SightingRecord } from '../types/mushroom';

const SIGHTINGS_KEY = '@grzybobranie_ai:sightings_v1';
const DISCLAIMER_KEY = '@grzybobranie_ai:disclaimer_accepted_v1';

class StorageService {
  /**
   * Pobiera wszystkie zapisane znaleziska z pamięci lokalnej
   */
  public async getSightings(): Promise<SightingRecord[]> {
    try {
      const data = await AsyncStorage.getItem(SIGHTINGS_KEY);
      if (!data) return [];
      return JSON.parse(data) as SightingRecord[];
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      return [];
    }
  }

  /**
   * Zapisuje nowe znalezisko grzyba w dzienniku
   */
  public async saveSighting(record: Omit<SightingRecord, 'id'>): Promise<SightingRecord> {
    try {
      const existing = await this.getSightings();
      const newRecord: SightingRecord = {
        ...record,
        id: `sighting_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };

      const updated = [newRecord, ...existing];
      await AsyncStorage.setItem(SIGHTINGS_KEY, JSON.stringify(updated));
      return newRecord;
    } catch (error) {
      console.error('Błąd podczas zapisu znaleziska:', error);
      throw error;
    }
  }

  /**
   * Usuwa wpis z dziennika
   */
  public async deleteSighting(id: string): Promise<void> {
    try {
      const existing = await this.getSightings();
      const updated = existing.filter((item) => item.id !== id);
      await AsyncStorage.setItem(SIGHTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Błąd podczas usuwania znaleziska:', error);
      throw error;
    }
  }

  /**
   * Sprawdza czy użytkownik zaakceptował regulamin bezpieczeństwa
   */
  public async hasAcceptedDisclaimer(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(DISCLAIMER_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Zapisuje akceptację ostrzeżenia o bezpieczeństwie
   */
  public async setAcceptedDisclaimer(accepted: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, accepted ? 'true' : 'false');
    } catch (error) {
      console.error('Błąd zapisu statusu disclaimer:', error);
    }
  }
}

export const storageService = new StorageService();
