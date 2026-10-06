import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUsableCoordinate } from './journalLocation';
import { deleteManagedJournalPhoto, isManagedJournalPhoto } from './journalPhotos';
import {
  JournalCandidate,
  JournalRecognition,
  SightingRecord,
} from '../types/mushroom';

export const SIGHTINGS_STORAGE_KEY = '@grzybobranie_ai:sightings_v1';
const DISCLAIMER_KEY = '@grzybobranie_ai:disclaimer_accepted_v1';

function sanitizeCandidate(value: unknown): JournalCandidate | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.namePl !== 'string' ||
    typeof candidate.nameLatin !== 'string' ||
    typeof candidate.confidence !== 'number' ||
    !Number.isFinite(candidate.confidence) ||
    typeof candidate.rank !== 'number' ||
    !Number.isFinite(candidate.rank)
  ) {
    return null;
  }
  return {
    id: candidate.id,
    namePl: candidate.namePl,
    nameLatin: candidate.nameLatin,
    confidence: candidate.confidence,
    rank: candidate.rank,
  };
}

export function sanitizeRecognition(value: unknown): JournalRecognition {
  if (!value || typeof value !== 'object') {
    return { status: 'unavailable' };
  }
  const record = value as Record<string, unknown>;
  if (record.status === 'rejected' && (record.reason === 'not_a_mushroom' || record.reason === 'unclear')) {
    return { status: 'rejected', reason: record.reason };
  }
  if (record.status === 'candidates' && Array.isArray(record.top3)) {
    const warningReasons = Array.isArray(record.warningReasons)
      ? record.warningReasons.filter(
          (reason): reason is 'dangerous_genus' | 'low_confidence' =>
            reason === 'dangerous_genus' || reason === 'low_confidence',
        )
      : [];
    return {
      status: 'candidates',
      top3: record.top3.flatMap((item) => {
        const candidate = sanitizeCandidate(item);
        return candidate ? [candidate] : [];
      }),
      expertVerificationRequired: record.expertVerificationRequired === true || warningReasons.length > 0,
      warningReasons,
    };
  }
  return { status: 'unavailable' };
}

export function sanitizeSighting(value: unknown): SightingRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;

  const latitude = raw.latitude;
  const longitude = raw.longitude;
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
  const photoUri = typeof raw.photoUri === 'string' ? raw.photoUri : undefined;
  const coordinates =
    isUsableCoordinate(latitude, longitude) && typeof longitude === 'number'
      ? { latitude, longitude }
      : {};

  return {
    id: raw.id,
    timestamp: typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now(),
    recognition: sanitizeRecognition(raw.recognition),
    ...(isManagedJournalPhoto(photoUri) ? { photoUri } : {}),
    ...coordinates,
    ...(notes ? { notes } : {}),
  };
}

class StorageService {
  public async getSightings(): Promise<SightingRecord[]> {
    try {
      const data = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item) => {
        const sighting = sanitizeSighting(item);
        return sighting ? [sighting] : [];
      });
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      return [];
    }
  }

  public async saveSighting(record: SightingRecord): Promise<SightingRecord> {
    const sighting = sanitizeSighting(record);
    if (!sighting) {
      throw new Error('Nie można zapisać pustego wpisu dziennika');
    }
    try {
      const existing = await this.getSightings();
      const updated = [sighting, ...existing.filter((item) => item.id !== sighting.id)];
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
      return sighting;
    } catch (error) {
      console.error('Błąd podczas zapisu znaleziska:', error);
      throw error;
    }
  }

  public async updateSightingNotes(id: string, notes: string): Promise<SightingRecord | null> {
    const existing = await this.getSightings();
    const index = existing.findIndex((item) => item.id === id);
    if (index < 0) return null;

    const trimmed = notes.trim();
    const next: SightingRecord = { ...existing[index] };
    if (trimmed) next.notes = trimmed;
    else delete next.notes;

    const updated = [...existing];
    updated[index] = next;
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
    return next;
  }

  public async deleteSighting(id: string): Promise<void> {
    const existing = await this.getSightings();
    const target = existing.find((item) => item.id === id);
    const updated = existing.filter((item) => item.id !== id);
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
    if (target?.photoUri) {
      try {
        await deleteManagedJournalPhoto(target.photoUri);
      } catch (error) {
        console.error('Błąd podczas usuwania zdjęcia znaleziska:', error);
      }
    }
  }

  public async hasAcceptedDisclaimer(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(DISCLAIMER_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  public async setAcceptedDisclaimer(accepted: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, accepted ? 'true' : 'false');
    } catch (error) {
      console.error('Błąd zapisu statusu disclaimer:', error);
    }
  }
}

export const storageService = new StorageService();
