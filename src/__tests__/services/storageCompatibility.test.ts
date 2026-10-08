import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SIGHTINGS_BACKUP_INDEX_KEY,
  SIGHTINGS_BACKUP_KEY,
  SIGHTINGS_STORAGE_KEY,
  journalBackupStorageKey,
  storageService,
} from '../../services/storageService';
import {
  DISCLAIMER_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  settingsStore,
} from '../../services/storage/settingsStore';

/**
 * Frozen on-disk shapes. A refactor may split modules, but these keys and
 * payloads are what already-installed copies of the app have stored.
 */
const STORED_JOURNAL = JSON.stringify([
  {
    id: 'current-candidates',
    timestamp: 1700000000000,
    photoFile: 'sighting_photo.jpg',
    latitude: 49.3,
    longitude: 20.1,
    notes: 'pod dębami',
    recognition: {
      status: 'candidates',
      top3: [
        {
          id: 'boletus_edulis',
          namePl: 'Borowik szlachetny',
          nameLatin: 'Boletus edulis',
          confidence: 0.574,
          rank: 1,
        },
      ],
      expertVerificationRequired: true,
      warningReasons: ['low_confidence'],
    },
  },
  {
    id: 'current-unknown',
    timestamp: 1700000001000,
    recognition: { status: 'rejected', reason: 'unknown_mushroom' },
  },
  {
    id: 'legacy-flat',
    timestamp: 10,
    speciesId: 'boletus_edulis',
    speciesNamePl: 'Borowik szlachetny',
    speciesNameLatin: 'Boletus edulis',
    confidence: 95,
    photoUri: 'file:///old/ios/container/journal-photos/legacy_flat.jpg',
  },
]);

const LEGACY_BACKUP = '{"legacy":true}';
const INDEXED_BACKUP_ID = 'bTESTBACKUP01';
const INDEXED_BACKUP = 'not-json-but-a-backup';

describe('stored journal format stays readable', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads the current journal, legacy flat rows, and backup keys without rewriting them', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, STORED_JOURNAL);
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_KEY, LEGACY_BACKUP);
    await AsyncStorage.setItem(SIGHTINGS_BACKUP_INDEX_KEY, JSON.stringify([INDEXED_BACKUP_ID]));
    await AsyncStorage.setItem(journalBackupStorageKey(INDEXED_BACKUP_ID), INDEXED_BACKUP);

    const loaded = await storageService.getSightings();

    expect(loaded).toEqual([
      {
        id: 'current-candidates',
        timestamp: 1700000000000,
        photoFile: 'sighting_photo.jpg',
        latitude: 49.3,
        longitude: 20.1,
        notes: 'pod dębami',
        recognition: {
          status: 'candidates',
          top3: [
            {
              id: 'boletus_edulis',
              namePl: 'Borowik szlachetny',
              nameLatin: 'Boletus edulis',
              confidence: 0.574,
              rank: 1,
            },
          ],
          expertVerificationRequired: true,
          warningReasons: ['low_confidence'],
        },
      },
      {
        id: 'current-unknown',
        timestamp: 1700000001000,
        recognition: { status: 'rejected', reason: 'unknown_mushroom' },
      },
      {
        id: 'legacy-flat',
        timestamp: 10,
        photoFile: 'legacy_flat.jpg',
        recognition: {
          status: 'legacy',
          speciesId: 'boletus_edulis',
          speciesNamePl: 'Borowik szlachetny',
          speciesNameLatin: 'Boletus edulis',
          confidence: 95,
        },
      },
    ]);

    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe(STORED_JOURNAL);
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_KEY)).toBe(LEGACY_BACKUP);
    expect(await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY)).toBe(JSON.stringify([INDEXED_BACKUP_ID]));
    expect(await AsyncStorage.getItem(journalBackupStorageKey(INDEXED_BACKUP_ID))).toBe(INDEXED_BACKUP);
    expect(SIGHTINGS_STORAGE_KEY).toBe('@grzybobranie_ai:sightings_v1');
    expect(SIGHTINGS_BACKUP_KEY).toBe('@grzybobranie_ai:sightings_v1_backup');
    expect(SIGHTINGS_BACKUP_INDEX_KEY).toBe('@grzybobranie_ai:sightings_v1_backups');
    expect(journalBackupStorageKey(INDEXED_BACKUP_ID)).toBe(
      '@grzybobranie_ai:sightings_v1_backup:bTESTBACKUP01',
    );
  });

  it('writes a journal entry with the same field names as before the split', async () => {
    const saved = await storageService.saveSighting({
      id: 'written',
      timestamp: 42,
      photoFile: 'sighting_photo.jpg',
      latitude: 52.1,
      longitude: 21.0,
      notes: 'notatka',
      recognition: { status: 'rejected', reason: 'unclear' },
    });

    expect(saved).toEqual({
      id: 'written',
      timestamp: 42,
      photoFile: 'sighting_photo.jpg',
      latitude: 52.1,
      longitude: 21.0,
      notes: 'notatka',
      recognition: { status: 'rejected', reason: 'unclear' },
    });
    const raw = await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY);
    expect(raw).toBe(JSON.stringify([saved]));
    expect(raw).not.toContain('photoUri');
    expect(await storageService.getSightings()).toEqual([saved]);
  });

  it('keeps the disclaimer and language keys that existing installs already use', async () => {
    await AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');

    expect(DISCLAIMER_STORAGE_KEY).toBe('@grzybobranie_ai:disclaimer_accepted_v1');
    expect(LANGUAGE_STORAGE_KEY).toBe('app_language');
    expect(await settingsStore.hasAcceptedDisclaimer()).toBe(true);
    expect(await settingsStore.getLanguage()).toBe('en');

    await settingsStore.setLanguage('pl');
    await settingsStore.setAcceptedDisclaimer(false);
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pl');
    expect(await AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY)).toBe('false');
    const keys = [...(await AsyncStorage.getAllKeys())];
    expect(keys.sort()).toEqual([DISCLAIMER_STORAGE_KEY, LANGUAGE_STORAGE_KEY].sort());
  });
});
