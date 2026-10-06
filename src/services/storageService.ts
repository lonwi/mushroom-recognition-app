import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUsableCoordinate } from './journalLocation';
import { deleteManagedJournalPhoto, journalPhotoFileName } from './journalPhotos';
import {
  JournalCandidate,
  JournalRecognition,
  SightingRecord,
} from '../types/mushroom';

export const SIGHTINGS_STORAGE_KEY = '@grzybobranie_ai:sightings_v1';
export const SIGHTINGS_BACKUP_KEY = '@grzybobranie_ai:sightings_v1_backup';
const DISCLAIMER_KEY = '@grzybobranie_ai:disclaimer_accepted_v1';

export class JournalReadError extends Error {
  readonly kind: 'unavailable' | 'corrupt';

  constructor(message: string, kind: 'unavailable' | 'corrupt') {
    super(message);
    this.name = 'JournalReadError';
    this.kind = kind;
  }
}

function textField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function legacyFromFields(source: Record<string, unknown>): JournalRecognition | null {
  const speciesId = textField(source.speciesId);
  const speciesNamePl = textField(source.speciesNamePl);
  const speciesNameLatin = textField(source.speciesNameLatin);
  const confidence = finiteNumber(source.confidence);
  if (!speciesId && !speciesNamePl && !speciesNameLatin && confidence === undefined) {
    return null;
  }
  return {
    status: 'legacy',
    ...(speciesId ? { speciesId } : {}),
    ...(speciesNamePl ? { speciesNamePl } : {}),
    ...(speciesNameLatin ? { speciesNameLatin } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

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
  if (record.status === 'legacy') {
    return legacyFromFields(record) ?? { status: 'legacy' };
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
  const storedPhoto =
    typeof raw.photoFile === 'string' ? raw.photoFile : typeof raw.photoUri === 'string' ? raw.photoUri : undefined;
  const photoFile = journalPhotoFileName(storedPhoto);
  const coordinates =
    isUsableCoordinate(latitude, longitude) && typeof longitude === 'number'
      ? { latitude, longitude }
      : {};

  let recognition = sanitizeRecognition(raw.recognition);
  if (recognition.status === 'unavailable' || recognition.status === 'legacy') {
    const fromParent = legacyFromFields(raw);
    if (recognition.status === 'legacy') {
      recognition = recognition.speciesId || recognition.speciesNamePl || recognition.speciesNameLatin || recognition.confidence !== undefined
        ? recognition
        : fromParent ?? recognition;
    } else if (fromParent) {
      recognition = fromParent;
    }
  }

  return {
    id: raw.id,
    timestamp: typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : 0,
    recognition,
    ...(photoFile ? { photoFile } : {}),
    ...coordinates,
    ...(notes ? { notes } : {}),
  };
}

class StorageService {
  private tail: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Keeps the first raw copy. Later failed reads do not replace it.
   */
  private async backupRawJournal(raw: string): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY);
      if (existing != null) return;
      await AsyncStorage.setItem(SIGHTINGS_BACKUP_KEY, raw);
    } catch (error) {
      console.error('Błąd kopii zapasowej dziennika:', error);
    }
  }

  private async readSightings(): Promise<SightingRecord[]> {
    let data: string | null;
    try {
      data = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      throw new JournalReadError('Nie udało się odczytać dziennika', 'unavailable');
    }
    if (!data) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      await this.backupRawJournal(data);
      throw new JournalReadError('Dziennik jest uszkodzony i nie został nadpisany', 'corrupt');
    }
    if (!Array.isArray(parsed)) {
      await this.backupRawJournal(data);
      throw new JournalReadError('Dziennik ma nieprawidłowy kształt i nie został nadpisany', 'corrupt');
    }
    return parsed.flatMap((item) => {
      const sighting = sanitizeSighting(item);
      return sighting ? [sighting] : [];
    });
  }

  public getSightings(): Promise<SightingRecord[]> {
    return this.enqueue(() => this.readSightings());
  }

  /**
   * Replaces the journal with an empty list. An existing raw backup is left in place.
   * If no backup exists yet, the current raw value is stored first.
   */
  public startFreshJournal(): Promise<void> {
    return this.enqueue(async () => {
      const raw = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      if (raw) await this.backupRawJournal(raw);
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '[]');
    });
  }

  public saveSighting(record: SightingRecord): Promise<SightingRecord> {
    return this.enqueue(async () => {
      const sighting = sanitizeSighting(record);
      if (!sighting) {
        throw new Error('Nie można zapisać pustego wpisu dziennika');
      }
      const existing = await this.readSightings();
      const updated = [sighting, ...existing.filter((item) => item.id !== sighting.id)];
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
      return sighting;
    });
  }

  public updateSightingNotes(id: string, notes: string): Promise<SightingRecord | null> {
    return this.enqueue(async () => {
      const existing = await this.readSightings();
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
    });
  }

  public deleteSighting(id: string): Promise<void> {
    return this.enqueue(async () => {
      const existing = await this.readSightings();
      const target = existing.find((item) => item.id === id);
      const updated = existing.filter((item) => item.id !== id);
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
      if (target?.photoFile) {
        try {
          await deleteManagedJournalPhoto(target.photoFile);
        } catch (error) {
          console.error('Błąd podczas usuwania zdjęcia znaleziska:', error);
        }
      }
    });
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
