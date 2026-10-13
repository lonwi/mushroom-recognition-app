/** Journal and backup keys. Values are part of the on-device format — do not rename them. */
export const SIGHTINGS_STORAGE_KEY = '@grzybobranie_ai:sightings_v1';
/** Earlier single-key backup. Read when looking for a duplicate. Never overwritten. */
export const SIGHTINGS_BACKUP_KEY = '@grzybobranie_ai:sightings_v1_backup';
export const SIGHTINGS_BACKUP_INDEX_KEY = '@grzybobranie_ai:sightings_v1_backups';
/**
 * Newest indexed raw copies kept after a backup is confirmed.
 * Older indexed copies are removed. The legacy single-key backup is never rotated.
 */
export const MAX_JOURNAL_BACKUPS = 8;
export const BACKUP_KEY_PREFIX = '@grzybobranie_ai:sightings_v1_backup:';
export const SAFE_BACKUP_ID = /^[A-Za-z0-9_-]+$/;

export function journalBackupStorageKey(id: string): string {
  if (!SAFE_BACKUP_ID.test(id)) {
    throw new Error('unsafe backup id');
  }
  return `${BACKUP_KEY_PREFIX}${id}`;
}
