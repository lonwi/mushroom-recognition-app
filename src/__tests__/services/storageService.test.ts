import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { isManagedJournalPhoto, journalPhotoFileName, resolveJournalPhotoUri } from '../../services/journalPhotos';
import {
  JournalReadError,
  MAX_JOURNAL_BACKUPS,
  SIGHTINGS_BACKUP_INDEX_KEY,
  SIGHTINGS_BACKUP_KEY,
  SIGHTINGS_STORAGE_KEY,
  journalBackupStorageKey,
  storageService,
} from '../../services/storageService';
import type { SightingRecord } from '../../types/mushroom';

const photoFile = 'sighting_photo.jpg';
const resolvedPhoto = 'file:///mock/document/journal-photos/sighting_photo.jpg';

async function journalBackupValues(): Promise<string[]> {
  const indexRaw = await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
  const ids = indexRaw ? (JSON.parse(indexRaw) as string[]) : [];
  const values: string[] = [];
  for (const id of ids) {
    values.push((await AsyncStorage.getItem(journalBackupStorageKey(id))) ?? '');
  }
  return values;
}

async function storedBackupKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.includes(':sightings_v1_backup:'));
}

function unclearEntry(id: string): SightingRecord {
  return {
    id,
    timestamp: 1_700_000_000_000,
    photoFile,
    latitude: 49.3,
    longitude: 20.1,
    recognition: { status: 'rejected', reason: 'unclear' },
  };
}

describe('storageService journal records', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (FileSystem.deleteAsync as jest.Mock).mockReset();
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('persists edited notes and leaves the scan result alone', async () => {
    await storageService.saveSighting(unclearEntry('sighting_notes'));

    const first = await storageService.updateSightingNotes('sighting_notes', '  pod dębami, 4 sztuki  ');
    expect(first?.notes).toBe('pod dębami, 4 sztuki');
    expect(first?.recognition).toEqual({ status: 'rejected', reason: 'unclear' });
    expect(first?.latitude).toBe(49.3);
    expect(first?.photoFile).toBe(photoFile);

    const reloaded = await storageService.getSightings();
    expect(reloaded[0].notes).toBe('pod dębami, 4 sztuki');

    await storageService.updateSightingNotes('sighting_notes', 'przy świerkach');
    const edited = await storageService.getSightings();
    expect(edited[0].notes).toBe('przy świerkach');
    expect(edited[0].recognition).toEqual({ status: 'rejected', reason: 'unclear' });

    await storageService.updateSightingNotes('sighting_notes', '   ');
    const cleared = await storageService.getSightings();
    expect(cleared[0].notes).toBeUndefined();
  });

  it('deletes the persistent photo with the entry and ignores a cache uri', async () => {
    await storageService.saveSighting(unclearEntry('sighting_photo'));
    await storageService.saveSighting({
      id: 'sighting_cache',
      timestamp: 1_700_000_000_001,
      photoFile: 'file://cache/camera.jpg',
      recognition: { status: 'unavailable' },
    });

    const loaded = await storageService.getSightings();
    expect(loaded.find((item) => item.id === 'sighting_cache')?.photoFile).toBeUndefined();

    await storageService.deleteSighting('sighting_cache');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

    await storageService.deleteSighting('sighting_photo');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(resolvedPhoto, { idempotent: true });
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('keeps an older species label as a legacy entry and writes it back without inventing a scan', async () => {
    await AsyncStorage.setItem(
      SIGHTINGS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy',
          timestamp: 10,
          speciesId: 'boletus_edulis',
          speciesNamePl: 'Borowik szlachetny',
          speciesNameLatin: 'Boletus edulis',
          confidence: 95,
          photoUri: 'file://cache/tmp.jpg',
          latitude: '',
          longitude: null,
        },
      ]),
    );

    const [legacy] = await storageService.getSightings();
    expect(legacy.recognition).toEqual({
      status: 'legacy',
      speciesId: 'boletus_edulis',
      speciesNamePl: 'Borowik szlachetny',
      speciesNameLatin: 'Boletus edulis',
      confidence: 95,
    });
    expect(legacy.photoFile).toBeUndefined();
    expect(legacy.latitude).toBeUndefined();
    expect(legacy.longitude).toBeUndefined();

    await storageService.updateSightingNotes('legacy', 'stary las');
    const raw = JSON.parse((await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)) ?? '[]');
    expect(raw[0].recognition.status).toBe('legacy');
    expect(raw[0].recognition.speciesNamePl).toBe('Borowik szlachetny');
    expect(raw[0].recognition.confidence).toBe(95);
    expect(raw[0].notes).toBe('stary las');
    expect(JSON.stringify(raw[0])).not.toMatch(/"photoUri"|"status":"candidates"|"status":"unavailable"/);
  });

  it('stores only the file name and rebuilds an older absolute path from the current document directory', async () => {
    await AsyncStorage.setItem(
      SIGHTINGS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'sighting_p',
          timestamp: 5,
          photoUri: 'file:///old/ios/container/journal-photos/sighting_p.jpg',
          recognition: { status: 'unavailable' },
        },
      ]),
    );

    const [entry] = await storageService.getSightings();
    expect(entry.photoFile).toBe('sighting_p.jpg');
    expect(entry.photoFile).not.toContain('/');
    expect(resolveJournalPhotoUri(entry.photoFile)).toBe(
      'file:///mock/document/journal-photos/sighting_p.jpg',
    );
    expect(resolveJournalPhotoUri(entry.photoFile, 'file:///new/container/')).toBe(
      'file:///new/container/journal-photos/sighting_p.jpg',
    );
  });

  it('rejects photo names that leave the journal folder', () => {
    expect(journalPhotoFileName('file:///mock/document/journal-photos/../../secret.jpg')).toBeNull();
    expect(journalPhotoFileName('..')).toBeNull();
    expect(journalPhotoFileName('sighting_p.jpg/../../secret.jpg')).toBeNull();
    expect(isManagedJournalPhoto('file:///mock/document/journal-photos/../secret.jpg')).toBe(false);
    expect(isManagedJournalPhoto('file:///mock/document/journal-photos/sighting_p.jpg')).toBe(true);
  });

  it('keeps a missing timestamp stable across reads', async () => {
    await AsyncStorage.setItem(
      SIGHTINGS_STORAGE_KEY,
      JSON.stringify([{ id: 'no-time', recognition: { status: 'unavailable' } }]),
    );

    const first = await storageService.getSightings();
    const second = await storageService.getSightings();
    expect(first[0].timestamp).toBe(0);
    expect(second[0].timestamp).toBe(0);
  });

  it('does not invent a species when an older rewrite already dropped the name', async () => {
    await AsyncStorage.setItem(
      SIGHTINGS_STORAGE_KEY,
      JSON.stringify([{ id: 'gone', timestamp: 1, recognition: { status: 'unavailable' } }]),
    );

    const [entry] = await storageService.getSightings();
    expect(entry.recognition).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(entry)).not.toMatch(/Borowik|speciesId|speciesNamePl/);
  });

  it('returns an empty journal when nothing has been saved', async () => {
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('backs up a broken journal and refuses to overwrite it', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');

    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
    expect(await journalBackupValues()).toEqual(['not-json']);

    await expect(storageService.saveSighting(unclearEntry('new'))).rejects.toBeInstanceOf(JournalReadError);
    await expect(storageService.updateSightingNotes('new', 'notatka')).rejects.toBeInstanceOf(JournalReadError);
    await expect(storageService.deleteSighting('new')).rejects.toBeInstanceOf(JournalReadError);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
  });

  it('keeps a separate backup for each distinct corruption and skips a duplicate raw value', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    expect(await journalBackupValues()).toEqual(['not-json']);

    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '{"no":"list"}');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);

    expect(await journalBackupValues()).toEqual(['not-json', '{"no":"list"}']);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('{"no":"list"}');
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBeNull();
  });

  it('starts an empty journal and leaves the raw backup in place', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await journalBackupValues()).toEqual(['not-json']);
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('leaves the journal untouched when the backup cannot be written', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const setItem = AsyncStorage.setItem as jest.Mock;
    const original = setItem.getMockImplementation();
    setItem.mockImplementation(async (key: string, value: string) => {
      if (String(key).includes('sightings_v1_backup')) {
        throw new Error('backup failed');
      }
      return original?.(key, value);
    });

    try {
      await expect(storageService.startFreshJournal()).rejects.toThrow(/backup failed/);
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
      expect(await journalBackupValues()).toEqual([]);
    } finally {
      if (original) setItem.mockImplementation(original);
    }
  });

  it('starts a fresh journal when the backup index is damaged and rebuilds it from backup keys', async () => {
    await AsyncStorage.setItem(journalBackupStorageKey('kept'), 'older-raw');
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, '{not-json');
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await AsyncStorage.getItem(journalBackupStorageKey('kept'))).toBe('older-raw');
    expect(await journalBackupValues()).toEqual(expect.arrayContaining(['older-raw', 'not-json']));
    const index = JSON.parse((await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY)) ?? 'null');
    expect(index).toEqual(expect.arrayContaining(['kept']));
    expect(index.every((id: string) => typeof id === 'string')).toBe(true);
  });

  it('rebuilds an index that lists an unsafe id and still clears the journal', async () => {
    await AsyncStorage.setItem(journalBackupStorageKey('safeid'), 'older-raw');
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify(['safeid', '../nope']));
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '{"no":"list"}');

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    const index = JSON.parse((await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY)) ?? '[]') as string[];
    expect(index).toContain('safeid');
    expect(index).not.toContain('../nope');
    expect(await journalBackupValues()).toEqual(expect.arrayContaining(['older-raw', '{"no":"list"}']));
  });

  it('starts a fresh journal when the damaged index cannot be rebuilt from keys', async () => {
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, '{not-json');
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const getAllKeys = AsyncStorage.getAllKeys as jest.Mock;
    const original = getAllKeys.getMockImplementation();
    getAllKeys.mockRejectedValue(new Error('keys unavailable'));

    try {
      await storageService.startFreshJournal();
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
      expect(await journalBackupValues()).toEqual(['not-json']);
    } finally {
      if (original) getAllKeys.mockImplementation(original);
    }
  });

  it('reuses one stored copy when the index is empty and does not write a second key', async () => {
    await AsyncStorage.setItem(journalBackupStorageKey('orphan1'), 'not-json');
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, '[]');
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await storedBackupKeys()).toEqual([journalBackupStorageKey('orphan1')]);
    expect(await journalBackupValues()).toEqual(['not-json']);
  });

  it('clears the journal from an orphan backup when the index cannot be updated', async () => {
    await AsyncStorage.setItem(journalBackupStorageKey('orphan1'), 'not-json');
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, '[]');
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const setItem = AsyncStorage.setItem as jest.Mock;
    const original = setItem.getMockImplementation();
    setItem.mockImplementation(async (key: string, value: string) => {
      if (key === SIGHTINGS_BACKUP_INDEX_KEY) throw new Error('index failed');
      return original?.(key, value);
    });

    try {
      await storageService.startFreshJournal();
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
      expect(await storedBackupKeys()).toEqual([journalBackupStorageKey('orphan1')]);
      expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY)).toBe('[]');
    } finally {
      if (original) setItem.mockImplementation(original);
    }
  });

  it('rolls back a backup key when the index write fails', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const setItem = AsyncStorage.setItem as jest.Mock;
    const original = setItem.getMockImplementation();
    setItem.mockImplementation(async (key: string, value: string) => {
      if (key === SIGHTINGS_BACKUP_INDEX_KEY) throw new Error('index failed');
      return original?.(key, value);
    });

    try {
      await expect(storageService.startFreshJournal()).rejects.toThrow(/index failed|listy kopii/);
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
      expect(await storedBackupKeys()).toEqual([]);
    } finally {
      if (original) setItem.mockImplementation(original);
    }
  });

  it('uses the leftover backup key after a failed rollback and does not store a second copy', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const setItem = AsyncStorage.setItem as jest.Mock;
    const removeItem = AsyncStorage.removeItem as jest.Mock;
    const originalSet = setItem.getMockImplementation();
    const originalRemove = removeItem.getMockImplementation();
    setItem.mockImplementation(async (key: string, value: string) => {
      if (key === SIGHTINGS_BACKUP_INDEX_KEY) throw new Error('index failed');
      return originalSet?.(key, value);
    });
    removeItem.mockImplementation(async (key: string) => {
      if (String(key).includes(':sightings_v1_backup:')) throw new Error('rollback failed');
      return originalRemove?.(key);
    });

    try {
      await expect(storageService.startFreshJournal()).rejects.toThrow(/index failed|listy kopii/);
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
      expect(await storedBackupKeys()).toHaveLength(1);
    } finally {
      if (originalSet) setItem.mockImplementation(originalSet);
      if (originalRemove) removeItem.mockImplementation(originalRemove);
    }

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await storedBackupKeys()).toHaveLength(1);
    expect(await journalBackupValues()).toEqual(['not-json']);
  });

  it('keeps only the newest backups and does not rotate the legacy key', async () => {
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_KEY, 'legacy-raw');

    for (let i = 0; i < MAX_JOURNAL_BACKUPS + 3; i += 1) {
      await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, `corrupt-${i}`);
      await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    }

    const values = await journalBackupValues();
    expect(values).toHaveLength(MAX_JOURNAL_BACKUPS);
    expect(values[0]).toBe(`corrupt-${3}`);
    expect(values[values.length - 1]).toBe(`corrupt-${MAX_JOURNAL_BACKUPS + 2}`);
    expect(values).not.toContain('corrupt-0');
    expect(await storedBackupKeys()).toHaveLength(MAX_JOURNAL_BACKUPS);
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe('legacy-raw');

    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    expect(await journalBackupValues()).toEqual(values);
  });

  it('does not report success when the cleared journal cannot be read back', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const getItem = AsyncStorage.getItem as jest.Mock;
    const setItem = AsyncStorage.setItem as jest.Mock;
    const originalGet = getItem.getMockImplementation();
    const originalSet = setItem.getMockImplementation();
    let sawClear = false;
    setItem.mockImplementation(async (key: string, value: string) => {
      if (key === SIGHTINGS_STORAGE_KEY && value === '[]') sawClear = true;
      return originalSet?.(key, value);
    });
    getItem.mockImplementation(async (key: string) => {
      if (sawClear && key === SIGHTINGS_STORAGE_KEY) return 'not-json';
      return originalGet?.(key);
    });

    try {
      await expect(storageService.startFreshJournal()).rejects.toThrow(/wyczyszczenia dziennika/);
    } finally {
      if (originalGet) getItem.mockImplementation(originalGet);
      if (originalSet) setItem.mockImplementation(originalSet);
    }
  });

  it('does nothing when start fresh is asked for a journal that can be read', async () => {
    await storageService.saveSighting(unclearEntry('keep-me'));

    await storageService.startFreshJournal();

    const ids = (await storageService.getSightings()).map((item) => item.id);
    expect(ids).toEqual(['keep-me']);
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY)).toBeNull();
  });

  it('backs up a journal that is not a list and does not replace it', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '{"no":"list"}');

    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    expect(await journalBackupValues()).toEqual(['{"no":"list"}']);
    await expect(storageService.saveSighting(unclearEntry('new'))).rejects.toBeInstanceOf(JournalReadError);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('{"no":"list"}');
  });

  it('keeps both entries when two saves overlap', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation();
    let held = false;
    getItem.mockImplementation(async (key: string) => {
      if (key === SIGHTINGS_STORAGE_KEY && !held) {
        held = true;
        await gate;
      }
      return original?.(key);
    });

    try {
      const first = storageService.saveSighting(unclearEntry('sighting_a'));
      const second = storageService.saveSighting({
        ...unclearEntry('sighting_b'),
        id: 'sighting_b',
        photoFile: undefined,
      });
      await Promise.resolve();
      release();
      await Promise.all([first, second]);

      const ids = (await storageService.getSightings()).map((item) => item.id).sort();
      expect(ids).toEqual(['sighting_a', 'sighting_b']);
    } finally {
      if (original) getItem.mockImplementation(original);
    }
  });
});
