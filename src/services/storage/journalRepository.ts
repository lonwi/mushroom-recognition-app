import { deleteManagedJournalPhoto } from '../journalPhotos';
import { SightingRecord } from '../../types/mushroom';
import { JournalBackupStore } from './journalBackupStore';
import { sanitizeSighting } from './journalSchema';
import { asyncStorageStore, type KeyValueStore } from './keyValueStore';
import { SIGHTINGS_STORAGE_KEY } from './keys';

export class JournalReadError extends Error {
  readonly kind: 'unavailable' | 'corrupt';

  constructor(message: string, kind: 'unavailable' | 'corrupt') {
    super(message);
    this.name = 'JournalReadError';
    this.kind = kind;
  }
}

function isReadableJournal(raw: string | null): boolean {
  if (raw == null) return true;
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
}

/** Journal CRUD. Writes are serialized. Backups and settings live elsewhere. */
export class JournalRepository {
  private tail: Promise<unknown> = Promise.resolve();
  private readonly backups: JournalBackupStore;

  constructor(private readonly store: KeyValueStore) {
    this.backups = new JournalBackupStore(store);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readSightings(): Promise<SightingRecord[]> {
    let data: string | null;
    try {
      data = await this.store.getItem(SIGHTINGS_STORAGE_KEY);
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
      await this.backups.backupRawJournal(raw);
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
      const raw = await this.store.getItem(SIGHTINGS_STORAGE_KEY);
      if (isReadableJournal(raw)) return;
      await this.backups.backupRawJournal(raw as string);
      const current = await this.store.getItem(SIGHTINGS_STORAGE_KEY);
      if (current !== raw || isReadableJournal(current)) return;
      await this.store.setItem(SIGHTINGS_STORAGE_KEY, '[]');
      const cleared = await this.store.getItem(SIGHTINGS_STORAGE_KEY);
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
      await this.store.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
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
      await this.store.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
      return next;
    });
  }

  public deleteSighting(id: string): Promise<void> {
    return this.enqueue(async () => {
      const existing = await this.readSightings();
      const target = existing.find((item) => item.id === id);
      const updated = existing.filter((item) => item.id !== id);
      await this.store.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(updated));
      if (target?.photoFile) {
        try {
          await deleteManagedJournalPhoto(target.photoFile);
        } catch (error) {
          console.error('Błąd podczas usuwania zdjęcia znaleziska:', error);
        }
      }
    });
  }
}

export const journalRepository = new JournalRepository(asyncStorageStore);
