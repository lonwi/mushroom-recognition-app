import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import type { ClassificationResult } from '../../services/classifierService';
import { createJournalEntryFromScan } from '../../services/journalEntry';
import { mapsUrlForCoordinates, openSpotInMaps } from '../../services/mapsLink';
import { SIGHTINGS_STORAGE_KEY, storageService } from '../../services/storageService';

const unclear: ClassificationResult = {
  status: 'rejected',
  reason: 'unclear',
  processedImageUri: 'file://camera/blur.jpg',
  inferenceTimeMs: 11,
};

const notAMushroom: ClassificationResult = {
  status: 'rejected',
  reason: 'not_a_mushroom',
  processedImageUri: 'file://camera/leaf.jpg',
  inferenceTimeMs: 9,
};

const bolete: ClassificationResult = {
  status: 'candidates',
  processedImageUri: 'content://media/mushroom.jpg',
  inferenceTimeMs: 20,
  expertVerificationRequired: true,
  warningReasons: ['low_confidence'],
  top3: [
    {
      id: 'boletus_edulis',
      namePl: 'Borowik szlachetny',
      nameLatin: 'Boletus edulis',
      genus: 'Boletus',
      confidence: 0.5735153692074483,
      rank: 1,
    },
    {
      id: 'tylopilus_felleus',
      namePl: 'Goryczak żółciowy',
      nameLatin: 'Tylopilus felleus',
      genus: 'Tylopilus',
      confidence: 0.22,
      rank: 2,
    },
    {
      id: 'suillus_luteus',
      namePl: 'Maślak zwyczajny',
      nameLatin: 'Suillus luteus',
      genus: 'Suillus',
      confidence: 0.05,
      rank: 3,
    },
  ],
};

function resetLocation() {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 52.2297, longitude: 21.0122 },
  });
}

describe('journal entries from a scan', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetLocation();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockClear();
    (Location.getCurrentPositionAsync as jest.Mock).mockClear();
    (FileSystem.copyAsync as jest.Mock).mockReset();
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockReset();
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    resetLocation();
  });

  it('keeps an unclear scan as not sure, with a copied photo and real coordinates', async () => {
    const saved = await createJournalEntryFromScan(unclear, true);

    expect(saved.record.recognition).toEqual({ status: 'rejected', reason: 'unclear' });
    expect(saved.location).toEqual({ state: 'recorded', latitude: 52.2297, longitude: 21.0122 });
    expect(saved.photo.state).toBe('stored');
    expect(saved.record.photoUri).toBe(
      `file:///mock/document/journal-photos/${saved.record.id}.jpg`,
    );
    expect(saved.record.photoUri).not.toBe('file://camera/blur.jpg');
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file://camera/blur.jpg',
      to: saved.record.photoUri,
    });
    expect(JSON.stringify(saved.record)).not.toMatch(/speciesId|confidence|Borowik|JADALNY/);

    const reloaded = await storageService.getSightings();
    expect(reloaded).toEqual([saved.record]);
  });

  it('does not name a species for a non-mushroom and does not invent coordinates when GPS is refused', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const saved = await createJournalEntryFromScan(notAMushroom, true);

    expect(saved.record.recognition).toEqual({ status: 'rejected', reason: 'not_a_mushroom' });
    expect(saved.location).toEqual({ state: 'unavailable' });
    expect(saved.record.latitude).toBeUndefined();
    expect(saved.record.longitude).toBeUndefined();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();

    const raw = JSON.parse((await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)) ?? '[]');
    expect(raw[0].latitude).toBeUndefined();
    expect(raw[0].longitude).toBeUndefined();
    expect(JSON.stringify(raw[0])).not.toMatch(/Borowik|speciesId|confidence/);
  });

  it('skips the permission prompt when the forager saves without a location', async () => {
    const saved = await createJournalEntryFromScan(unclear, false);

    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(saved.location).toEqual({ state: 'skipped' });
    expect(saved.record.latitude).toBeUndefined();
  });

  it('saves the find when the position request fails, without placeholder coordinates', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('gps off'));

    const saved = await createJournalEntryFromScan(unclear, true);

    expect(saved.location).toEqual({ state: 'unavailable' });
    expect(saved.record).not.toHaveProperty('latitude');
    expect(saved.record).not.toHaveProperty('longitude');
    expect(saved.record.photoUri).toMatch(/journal-photos/);
  });

  it('drops an unusable fix instead of storing it', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: Number.NaN, longitude: 21 },
    });

    const saved = await createJournalEntryFromScan(unclear, true);

    expect(saved.location).toEqual({ state: 'unavailable' });
    expect(saved.record.latitude).toBeUndefined();
    expect(saved.record.longitude).toBeUndefined();
  });

  it('keeps candidate confidence unchanged and still stores the photo when copying fails', async () => {
    (FileSystem.copyAsync as jest.Mock).mockRejectedValue(new Error('disk full'));

    const saved = await createJournalEntryFromScan(bolete, false);

    expect(saved.photo).toEqual({ state: 'missing' });
    expect(saved.record.photoUri).toBeUndefined();
    expect(saved.record.recognition).toMatchObject({
      status: 'candidates',
      expertVerificationRequired: true,
      warningReasons: ['low_confidence'],
    });
    if (saved.record.recognition.status !== 'candidates') {
      throw new Error('expected candidates');
    }
    expect(saved.record.recognition.top3[0].confidence).toBe(0.5735153692074483);
    expect(saved.record).not.toHaveProperty('speciesId');
    expect(saved.record).not.toHaveProperty('confidence');
  });

  it('does not keep a remote image uri as the journal photo', async () => {
    const saved = await createJournalEntryFromScan(
      {
        status: 'unavailable',
        reason: 'model_missing',
        processedImageUri: 'https://images.example/stock.jpg',
      },
      false,
    );

    expect(saved.record.recognition).toEqual({ status: 'unavailable' });
    expect(saved.record.photoUri).toBeUndefined();
    expect(FileSystem.copyAsync).not.toHaveBeenCalled();
  });
});

describe('opening a spot in maps', () => {
  it('builds a maps link only for usable coordinates', () => {
    expect(mapsUrlForCoordinates(49.123456, 20.5, 'ios')).toBe(
      'http://maps.apple.com/?ll=49.123456,20.5&q=49.123456,20.5',
    );
    expect(mapsUrlForCoordinates(49.1, 20.2, 'android')).toBe('geo:49.1,20.2?q=49.1,20.2');
    expect(mapsUrlForCoordinates(49.1, 20.2, 'web')).toContain('query=49.1,20.2');
    expect(() => mapsUrlForCoordinates(Number.NaN, 20, 'web')).toThrow(/usable/);
  });

  it('falls back to a web maps link when the device cannot open the native one', async () => {
    const openURL = jest.fn(async () => undefined);
    const canOpenURL = jest.fn(async () => false);

    await openSpotInMaps(49.1, 20.2, 'android', { canOpenURL, openURL });

    expect(openURL).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=49.1,20.2');
  });
});
