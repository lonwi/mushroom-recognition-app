import AsyncStorage from '@react-native-async-storage/async-storage';
import { isUsableCoordinate } from './journalLocation';
import { deleteManagedJournalPhoto, journalPhotoFileName } from './journalPhotos';
import {
  JournalCandidate,
  JournalRecognition,
  SightingRecord,
} from '../types/mushroom';

export const SIGHTINGS_STORAGE_KEY = '@grzybobranie_ai:sightings_v1';
/** Earlier single-key backup. Read when looking for a duplicate. Never overwritten. */
export const SIGHTINGS_BACKUP_KEY = '@grzybobranie_ai:sightings_v1_backup';
export const SIGHTINGS_BACKUP_INDEX_KEY = '@grzybobranie_ai:sightings_v1_backups';
/**
 * Newest indexed raw copies kept after a backup is confirmed.
 * Older indexed copies are removed. The legacy single-key backup is never rotated.
 */
export const MAX_JOURNAL_BACKUPS = 8;
const BACKUP_KEY_PREFIX = '@grzybobranie_ai:sightings_v1_backup:';
const SAFE_BACKUP_ID = /^[A-Za-z0-9_-]+$/;
const DISCLAIMER_KEY = '@grzybobranie_ai:disclaimer_accepted_v1';

export function journalBackupStorageKey(id: string): string {
  if (!SAFE_BACKUP_ID.test(id)) {
    throw new Error('unsafe backup id');
  }
  return `${BACKUP_KEY_PREFIX}${id}`;
}

function isReadableJournal(raw: string | null): boolean {
  if (raw == null) return true;
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
}

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
  if (
    record.status === 'rejected' &&
    (record.reason === 'not_a_mushroom' || record.reason === 'unknown_mushroom' || record.reason === 'unclear')
  ) {
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

  private async readBackupIndex(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
    if (raw == null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Lista kopii dziennika jest uszkodzona');
    }
    if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string' || !SAFE_BACKUP_ID.test(id))) {
      throw new Error('Lista kopii dziennika jest uszkodzona');
    }
    return parsed;
  }

  /** Ids embedded in `…_backup:*` keys. Order follows the id, which starts with the creation time. */
  private async backupIdsFromStorageKeys(): Promise<string[]> {
    const keys = await AsyncStorage.getAllKeys();
    const ids = keys.flatMap((key) => {
      if (!key.startsWith(BACKUP_KEY_PREFIX)) return [];
      const id = key.slice(BACKUP_KEY_PREFIX.length);
      return SAFE_BACKUP_ID.test(id) ? [id] : [];
    });
    ids.sort();
    return ids;
  }

  /**
   * A damaged index must not block a fresh journal.
   * When `readBackupIndex` throws, the index is treated as [] and rebuilt from backup keys.
   * If those keys cannot be listed either, the result stays [] so a new backup can still be written.
   */
  private async loadBackupIds(): Promise<string[]> {
    try {
      return await this.readBackupIndex();
    } catch (error) {
      console.error('Lista kopii dziennika jest uszkodzona. Odtwarzam ją z kluczy.', error);
      let recovered: string[] = [];
      try {
        recovered = await this.backupIdsFromStorageKeys();
      } catch (scanError) {
        console.error('Nie udało się odczytać kluczy kopii dziennika.', scanError);
      }
      try {
        await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify(recovered));
      } catch (writeError) {
        console.error('Nie udało się zapisać odtworzonej listy kopii.', writeError);
      }
      return recovered;
    }
  }

  private async writeConfirmedIndex(ids: string[]): Promise<void> {
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify(ids));
    const indexRaw = await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
    let confirmed: unknown;
    try {
      confirmed = indexRaw == null ? null : JSON.parse(indexRaw);
    } catch {
      throw new Error('Nie udało się potwierdzić listy kopii dziennika');
    }
    if (
      !Array.isArray(confirmed) ||
      confirmed.length !== ids.length ||
      ids.some((id, index) => confirmed[index] !== id)
    ) {
      throw new Error('Nie udało się potwierdzić listy kopii dziennika');
    }
  }

  /**
   * Id of an existing copy of this exact text.
   * Also checks backup keys missing from the index, so a failed index write does not
   * leave an orphan that the next backup stores again.
   * The legacy key is returned as `SIGHTINGS_BACKUP_KEY` and is not an indexed id.
   */
  private async matchingBackupId(raw: string, ids: string[]): Promise<string | null> {
    const legacy = await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY);
    if (legacy === raw) return SIGHTINGS_BACKUP_KEY;

    const ordered = [...ids];
    try {
      for (const id of await this.backupIdsFromStorageKeys()) {
        if (!ordered.includes(id)) ordered.push(id);
      }
    } catch (error) {
      console.error('Nie udało się sprawdzić osieroconych kopii dziennika.', error);
    }

    for (const id of ordered) {
      const stored = await AsyncStorage.getItem(journalBackupStorageKey(id));
      if (stored === raw) return id;
    }
    return null;
  }

  /**
   * Drops the oldest indexed copies once a newer list is already confirmed.
   * `protectId` stays in the kept set. A failed trim keeps the extra copies.
   */
  private async rotateBackups(ids: string[], protectId?: string): Promise<void> {
    const ordered =
      protectId && ids.includes(protectId) ? [...ids.filter((id) => id !== protectId), protectId] : ids;
    if (ordered.length <= MAX_JOURNAL_BACKUPS) return;
    const dropped = ordered.slice(0, ordered.length - MAX_JOURNAL_BACKUPS);
    const kept = ordered.slice(ordered.length - MAX_JOURNAL_BACKUPS);
    try {
      await this.writeConfirmedIndex(kept);
    } catch (error) {
      console.error('Nie udało się skrócić listy kopii dziennika.', error);
      return;
    }
    for (const id of dropped) {
      try {
        await AsyncStorage.removeItem(journalBackupStorageKey(id));
      } catch (error) {
        console.error('Nie udało się usunąć starszej kopii dziennika.', error);
      }
    }
  }

  /**
   * Stores this exact raw text under a new backup key when no earlier backup
   * already contains it. Keeps at most `MAX_JOURNAL_BACKUPS` indexed copies.
   * If the index cannot be confirmed after the backup key is written, that key is removed.
   * Throws unless the written value can be read back unchanged and a confirmed copy exists.
   * Does not modify the journal.
   */
  private async backupRawJournal(raw: string): Promise<void> {
    const ids = await this.loadBackupIds();
    const existing = await this.matchingBackupId(raw, ids);
    if (existing) {
      if (existing !== SIGHTINGS_BACKUP_KEY && !ids.includes(existing)) {
        try {
          await this.writeConfirmedIndex([...ids, existing]);
        } catch (error) {
          console.error('Nie udało się dopisać osieroconej kopii do listy.', error);
        }
      }
      return;
    }

    const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const key = journalBackupStorageKey(id);
    await AsyncStorage.setItem(key, raw);
    const readBack = await AsyncStorage.getItem(key);
    if (readBack !== raw) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error('Nie udało się wycofać kopii dziennika.', error);
      }
      throw new Error('Kopia dziennika nie zgadza się z oryginałem');
    }

    try {
      const latest = await this.loadBackupIds();
      if (latest.includes(id)) {
        await this.rotateBackups(latest, id);
        return;
      }
      const nextIds = [...latest, id];
      await this.writeConfirmedIndex(nextIds);
      await this.rotateBackups(nextIds, id);
    } catch (error) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (rollbackError) {
        console.error('Nie udało się wycofać kopii dziennika.', rollbackError);
      }
      throw error;
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
      await this.rememberCorruptJournal(data);
      throw new JournalReadError('Dziennik jest uszkodzony i nie został nadpisany', 'corrupt');
    }
    if (!Array.isArray(parsed)) {
      await this.rememberCorruptJournal(data);
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
   * A failed backup on read must not change the journal. The error is logged so the
   * damaged-journal screen can still open; clearing waits for startFreshJournal.
   */
  private async rememberCorruptJournal(raw: string): Promise<void> {
    try {
      await this.backupRawJournal(raw);
    } catch (error) {
      console.error('Błąd kopii zapasowej dziennika:', error);
    }
  }

  /**
   * Replaces a journal that still cannot be parsed with an empty list.
   * Aborts without writing when the stored value is already a list, or when
   * a verified backup of that exact text cannot be confirmed.
   * A damaged backup index is rebuilt from backup keys and does not block this.
   * Success requires reading the written `[]` back.
   */
  public startFreshJournal(): Promise<void> {
    return this.enqueue(async () => {
      const raw = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      if (isReadableJournal(raw)) return;
      await this.backupRawJournal(raw as string);
      const current = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      if (current !== raw || isReadableJournal(current)) return;
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '[]');
      const cleared = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
      if (cleared !== '[]') {
        throw new Error('Nie udało się potwierdzić wyczyszczenia dziennika');
      }
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
