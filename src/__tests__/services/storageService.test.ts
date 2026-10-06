import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SIGHTINGS_STORAGE_KEY, storageService } from '../../services/storageService';
import type { SightingRecord } from '../../types/mushroom';

const photoUri = 'file:///mock/document/journal-photos/sighting_photo.jpg';

function unclearEntry(id: string): SightingRecord {
  return {
    id,
    timestamp: 1_700_000_000_000,
    photoUri,
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
    expect(first?.photoUri).toBe(photoUri);

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
      photoUri: 'file://cache/camera.jpg',
      recognition: { status: 'unavailable' },
    });

    const loaded = await storageService.getSightings();
    expect(loaded.find((item) => item.id === 'sighting_cache')?.photoUri).toBeUndefined();

    await storageService.deleteSighting('sighting_cache');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

    await storageService.deleteSighting('sighting_photo');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(photoUri, { idempotent: true });
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('does not promote an old species label or empty coordinates into a find', async () => {
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
    expect(legacy.recognition).toEqual({ status: 'unavailable' });
    expect(legacy.photoUri).toBeUndefined();
    expect(legacy.latitude).toBeUndefined();
    expect(legacy.longitude).toBeUndefined();
    expect(JSON.stringify(legacy)).not.toMatch(/Borowik|boletus|confidence|speciesId/);
  });
});
