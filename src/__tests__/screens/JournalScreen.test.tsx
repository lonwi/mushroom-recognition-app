import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { JournalScreen } from '../../screens/JournalScreen';
import {
  SIGHTINGS_BACKUP_INDEX_KEY,
  SIGHTINGS_STORAGE_KEY,
  journalBackupStorageKey,
  storageService,
} from '../../services/storageService';
import { LanguageProvider } from '../../contexts/LanguageContext';
import type { SightingRecord } from '../../types/mushroom';

const unclear: SightingRecord = {
  id: 'sighting_unclear',
  timestamp: 1_720_000_000_000,
  recognition: { status: 'rejected', reason: 'unclear' },
};

const located: SightingRecord = {
  id: 'sighting_spot',
  timestamp: 1_720_000_100_000,
  photoFile: 'sighting_spot.jpg',
  latitude: 49.12345,
  longitude: 20.54321,
  notes: 'stary dukt',
  recognition: {
    status: 'candidates',
    expertVerificationRequired: true,
    warningReasons: ['low_confidence'],
    top3: [
      {
        id: 'boletus_edulis',
        namePl: 'Borowik szlachetny',
        nameLatin: 'Boletus edulis',
        confidence: 0.5735153692074483,
        rank: 1,
      },
    ],
  },
};

async function journalBackupValues(): Promise<string[]> {
  const indexRaw = await AsyncStorage.getItem(SIGHTINGS_BACKUP_INDEX_KEY);
  const ids = indexRaw ? (JSON.parse(indexRaw) as string[]) : [];
  const values: string[] = [];
  for (const id of ids) {
    values.push((await AsyncStorage.getItem(journalBackupStorageKey(id))) ?? '');
  }
  return values;
}

async function renderJournal() {
  return render(
    <LanguageProvider>
      <JournalScreen onOpenAtlasSpecies={jest.fn()} />
    </LanguageProvider>,
  );
}

describe('JournalScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockReset();
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows an unclear find without a species, a confidence, or a map', async () => {
    await storageService.saveSighting(unclear);
    const screen = await renderJournal();

    expect(await screen.findByTestId('journal-title-sighting_unclear')).toHaveTextContent('Niepewny wynik');
    expect(screen.getByTestId('journal-no-location-sighting_unclear')).toHaveTextContent(
      'Brak zapisanej lokalizacji',
    );
    expect(screen.queryByTestId('journal-open-map-sighting_unclear')).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/Borowik/)).toBeNull();
    expect(screen.queryByText('JADALNY')).toBeNull();
  });

  it('opens the saved spot in maps and keeps the candidate confidence', async () => {
    await storageService.saveSighting(located);
    const screen = await renderJournal();

    expect(await screen.findByTestId('journal-candidate-sighting_spot-1')).toHaveTextContent(/57\.4%/);
    expect(screen.getByTestId('journal-low-confidence-sighting_spot')).toBeTruthy();
    expect(screen.getByTestId('journal-not-edible-sighting_spot')).toBeTruthy();
    expect(screen.queryByText('JADALNY')).toBeNull();
    expect(screen.getByTestId('journal-notes-sighting_spot')).toHaveTextContent(/stary dukt/);
    expect(screen.getByTestId('journal-photo-sighting_spot').props.source).toEqual({
      uri: 'file:///mock/document/journal-photos/sighting_spot.jpg',
    });
    expect(screen.getByTestId('journal-coordinates-sighting_spot')).toHaveTextContent(
      /49\.123450, 20\.543210/,
    );

    await fireEvent.press(screen.getByTestId('journal-open-map-sighting_spot'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://maps.apple.com/?ll=49.123450,20.543210&q=49.123450,20.543210',
      );
    });
  });

  it('removes the stored photo when the entry is deleted', async () => {
    await storageService.saveSighting(located);
    const screen = await renderJournal();
    await screen.findByTestId('journal-delete-sighting_spot');

    await fireEvent.press(screen.getByTestId('journal-delete-sighting_spot'));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => Promise<void>;
    }>;
    await act(async () => {
      await buttons?.[1].onPress?.();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('journal-entry-sighting_spot')).toBeNull();
    });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///mock/document/journal-photos/sighting_spot.jpg',
      { idempotent: true },
    );
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('labels an older entry that has no recognition result', async () => {
    await storageService.saveSighting({
      id: 'sighting_old',
      timestamp: 1_720_000_200_000,
      recognition: {
        status: 'legacy',
        speciesNamePl: 'Borowik szlachetny',
        speciesNameLatin: 'Boletus edulis',
        confidence: 95,
      },
    });
    const screen = await renderJournal();

    expect(await screen.findByTestId('journal-legacy-sighting_old')).toHaveTextContent(
      /starszej wersji aplikacji/,
    );
    expect(screen.getByTestId('journal-title-sighting_old')).toHaveTextContent('Starszy wpis');
    expect(screen.getByTestId('journal-legacy-name-sighting_old')).toHaveTextContent(
      /Zachowana nazwa: Borowik szlachetny/,
    );
    expect(screen.queryByTestId('journal-legacy-confidence-sighting_old')).toBeNull();
    expect(screen.queryByText(/95/)).toBeNull();
    expect(screen.getByTestId('journal-legacy-name-notice-sighting_old')).toHaveTextContent(
      /nie pochodzi z rozpoznawania zdjęcia/i,
    );
    expect(screen.getByTestId('journal-legacy-name-notice-sighting_old')).toHaveTextContent(
      /nie jest oznaczeniem gatunku/i,
    );
    expect(screen.getByTestId('journal-legacy-edibility-sighting_old')).toHaveTextContent(
      /Nie jedz grzyba na podstawie tego wpisu\. Pokaż go do oceny grzyboznawcy, na przykład w stacji sanitarno-epidemiologicznej \(Sanepid\)\./,
    );
    expect(screen.queryByText('JADALNY')).toBeNull();
    expect(screen.queryByText(/Kandydaci ze skanu/)).toBeNull();
  });

  it('shows a missing timestamp as no date', async () => {
    await storageService.saveSighting({
      id: 'sighting_nodate',
      timestamp: 0,
      recognition: { status: 'unavailable' },
    });
    const screen = await renderJournal();

    expect(await screen.findByTestId('journal-date-sighting_nodate')).toHaveTextContent(/brak daty/i);
    expect(screen.queryByText(/1970/)).toBeNull();
  });

  it('starts an empty journal after confirmation and keeps the raw backup', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    const screen = await renderJournal();

    expect(await screen.findByTestId('journal-damaged-message')).toHaveTextContent(/uszkodzony/);
    expect(screen.queryByText('Twój koszyk jest jeszcze pusty')).toBeNull();
    expect(await journalBackupValues()).toEqual(['not-json']);

    await fireEvent.press(screen.getByTestId('journal-start-fresh'));
    const cancelButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      text?: string;
      onPress?: () => Promise<void>;
    }>;
    expect(cancelButtons?.[1]?.text).toBe('Zacznij nowy dziennik');
    await act(async () => {
      await cancelButtons?.[0].onPress?.();
    });
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
    expect(await journalBackupValues()).toEqual(['not-json']);
    expect(screen.getByTestId('journal-damaged')).toBeTruthy();

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(screen.getByTestId('journal-start-fresh'));
    const confirmButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => Promise<void>;
    }>;
    await act(async () => {
      await confirmButtons?.[1].onPress?.();
    });

    await waitFor(() => {
      expect(screen.getByText('Twój koszyk jest jeszcze pusty')).toBeTruthy();
    });
    expect(screen.queryByTestId('journal-damaged')).toBeNull();
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('[]');
    expect(await journalBackupValues()).toEqual(['not-json']);
    expect(await storageService.getSightings()).toEqual([]);
  });

  it('shows a message and keeps the damaged journal when the backup cannot be written', async () => {
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
      const screen = await renderJournal();
      expect(await screen.findByTestId('journal-damaged-message')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('journal-start-fresh'));
      const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
        onPress?: () => Promise<void>;
      }>;
      await act(async () => {
        await buttons?.[1].onPress?.();
      });

      expect((Alert.alert as jest.Mock).mock.calls.map((call) => String(call[1])).join(' ')).toMatch(
        /dziennik nie został wyczyszczony/i,
      );
      expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
      expect(screen.getByTestId('journal-damaged')).toBeTruthy();
    } finally {
      if (original) setItem.mockImplementation(original);
    }
  });

  it('tells the user when deleting an entry fails and leaves the card in place', async () => {
    await storageService.saveSighting(located);
    const screen = await renderJournal();
    await screen.findByTestId('journal-delete-sighting_spot');
    jest.spyOn(storageService, 'deleteSighting').mockRejectedValue(new Error('locked'));

    await fireEvent.press(screen.getByTestId('journal-delete-sighting_spot'));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      onPress?: () => Promise<void>;
    }>;
    await act(async () => {
      await buttons?.[1].onPress?.();
    });

    expect((Alert.alert as jest.Mock).mock.calls.map((call) => String(call[0])).join(' ')).toMatch(
      /Nie udało się usunąć wpisu/,
    );
    expect(screen.getByTestId('journal-entry-sighting_spot')).toBeTruthy();
    expect(await storageService.getSightings()).toHaveLength(1);
  });

  it('tells the user when a note cannot be saved and keeps the editor open', async () => {
    await storageService.saveSighting(located);
    const screen = await renderJournal();
    await screen.findByTestId('journal-edit-notes-sighting_spot');
    jest.spyOn(storageService, 'updateSightingNotes').mockRejectedValue(new Error('locked'));

    await fireEvent.press(screen.getByTestId('journal-edit-notes-sighting_spot'));
    await fireEvent.changeText(screen.getByTestId('journal-notes-input'), 'nowa notatka');
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-notes-save'));
    });

    await waitFor(() => {
      expect((Alert.alert as jest.Mock).mock.calls.map((call) => String(call[0])).join(' ')).toMatch(
        /Nie udało się zapisać notatki/,
      );
    });
    expect(screen.getByTestId('journal-notes-input').props.value).toBe('nowa notatka');
    const stored = await storageService.getSightings();
    expect(stored[0].notes).toBe('stary dukt');
  });

  it('keeps an edited note after the journal is opened again', async () => {
    await storageService.saveSighting(located);
    const screen = await renderJournal();
    await screen.findByTestId('journal-edit-notes-sighting_spot');

    await fireEvent.press(screen.getByTestId('journal-edit-notes-sighting_spot'));
    await fireEvent.changeText(screen.getByTestId('journal-notes-input'), 'pod dębami, 4 sztuki');
    await act(async () => {
      fireEvent.press(screen.getByTestId('journal-notes-save'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('journal-notes-sighting_spot')).toHaveTextContent(/pod dębami, 4 sztuki/);
    });

    screen.unmount();
    const reopened = await renderJournal();
    expect(await reopened.findByTestId('journal-notes-sighting_spot')).toHaveTextContent(
      /pod dębami, 4 sztuki/,
    );
    expect(reopened.getByTestId('journal-title-sighting_spot')).toHaveTextContent('Kandydaci ze skanu');
    expect(reopened.getByTestId('journal-candidate-sighting_spot-1')).toHaveTextContent(/57\.4%/);
  });
});
