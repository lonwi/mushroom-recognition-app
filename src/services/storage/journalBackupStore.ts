import {
  BACKUP_KEY_PREFIX,
  MAX_JOURNAL_BACKUPS,
  SAFE_BACKUP_ID,
  SIGHTINGS_BACKUP_INDEX_KEY,
  SIGHTINGS_BACKUP_KEY,
  journalBackupStorageKey,
} from './keys';
import type { KeyValueStore } from './keyValueStore';

/**
 * Indexed raw copies of a journal that could not be parsed, plus the legacy single-key backup.
 * Does not read or write the live journal key.
 */
export class JournalBackupStore {
  constructor(private readonly store: KeyValueStore) {}

  private async readBackupIndex(): Promise<string[]> {
    const raw = await this.store.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
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
    const keys = await this.store.getAllKeys();
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
        await this.store.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify(recovered));
      } catch (writeError) {
        console.error('Nie udało się zapisać odtworzonej listy kopii.', writeError);
      }
      return recovered;
    }
  }

  private async writeConfirmedIndex(ids: string[]): Promise<void> {
    await this.store.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify(ids));
    const indexRaw = await this.store.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
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
    const legacy = await this.store.getItem(SIGHTINGS_BACKUP_KEY);
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
      const stored = await this.store.getItem(journalBackupStorageKey(id));
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
        await this.store.removeItem(journalBackupStorageKey(id));
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
  async backupRawJournal(raw: string): Promise<void> {
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
    await this.store.setItem(key, raw);
    const readBack = await this.store.getItem(key);
    if (readBack !== raw) {
      try {
        await this.store.removeItem(key);
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
        await this.store.removeItem(key);
      } catch (rollbackError) {
        console.error('Nie udało się wycofać kopii dziennika.', rollbackError);
      }
      throw error;
    }
  }
}
