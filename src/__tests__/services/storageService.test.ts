import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { isManagedJournalPhoto, journalPhotoFileName, resolveJournalPhotoUri } from '../../services/journalPhotos';
import {
  JournalReadError,
  SIGHTINGS_BACKUP_KEY,
  SIGHTINGS_STORAGE_KEY,
  storageService,
} from '../../services/storageService';
import type { SightingRecord } from '../../types/mushroom';

const photoFile = 'sighting_photo.jpg';
const resolvedPhoto = 'file:///mock/document/journal-photos/sighting_photo.jpg';

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
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe('not-json');

    await expect(storageService.saveSighting(unclearEntry('new'))).rejects.toBeInstanceOf(JournalReadError);
    await expect(storageService.updateSightingNotes('new', 'notatka')).rejects.toBeInstanceOf(JournalReadError);
    await expect(storageService.deleteSighting('new')).rejects.toBeInstanceOf(JournalReadError);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
  });

  it('keeps the first raw backup when a later read is also corrupt', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);

    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '{"no":"list"}');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);

    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe('not-json');
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('{"no":"list"}');
  });

  it('starts an empty journal and leaves the raw backup in place', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);

    await storageService.startFreshJournal();

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe('not-json');
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('backs up a journal that is not a list and does not replace it', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, '{"no":"list"}');

    await expect(storageService.getSightings()).rejects.toBeInstanceOf(JournalReadError);
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe('{"no":"list"}');
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
