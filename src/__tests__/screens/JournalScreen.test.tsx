import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { JournalScreen } from '../../screens/JournalScreen';
import { storageService } from '../../services/storageService';
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
  photoUri: 'file:///mock/document/journal-photos/sighting_spot.jpg',
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
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
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
      uri: located.photoUri,
    });

    await fireEvent.press(screen.getByTestId('journal-open-map-sighting_spot'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        'http://maps.apple.com/?ll=49.12345,20.54321&q=49.12345,20.54321',
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
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(located.photoUri, { idempotent: true });
    expect(await storageService.getSightings()).toEqual([]);
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
