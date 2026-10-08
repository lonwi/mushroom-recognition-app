import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ResultModal } from '../../components/ResultModal';
import { SIGHTINGS_STORAGE_KEY, storageService } from '../../services/storageService';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ClassificationResult } from '../../services/classifierService';
import { SpeciesCandidate } from '../../services/recognitionDecision';

// The first Paper modal render on a cold CI worker can exceed Jest's 5s default.
jest.setTimeout(15000);

function flatText(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map((part) => flatText(part)).join('');
  }
  return children == null ? '' : String(children);
}

const unavailable: ClassificationResult = {
  status: 'unavailable',
  reason: 'model_missing',
  processedImageUri: 'file://camera/capture.jpg',
};

function renderModal(
  result: ClassificationResult | null = unavailable,
  onOpenAtlasSpecies?: (speciesId: string) => void,
) {
  return render(
    <LanguageProvider>
      <ResultModal visible result={result} onClose={() => {}} onOpenAtlasSpecies={onOpenAtlasSpecies} />
    </LanguageProvider>
  );
}

describe('ResultModal when recognition is unavailable', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('says recognition is unavailable in Polish and shows no species or confidence', async () => {
    const { getByTestId, getByText, queryByText } = await renderModal();

    expect(getByTestId('recognition-unavailable-title').props.children).toBe(
      'Rozpoznawanie niedostępne'
    );
    expect(getByText(/Nie ma modelu, który odczytuje piksele zdjęcia/)).toBeTruthy();
    expect(getByText(/To nie jest wynik rozpoznawania/)).toBeTruthy();
    expect(queryByText(/TFLite/i)).toBeNull();
    expect(queryByText(/Pewność/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/Borowik/)).toBeNull();
    expect(queryByText(/Muchomor/)).toBeNull();
    expect(queryByText(/Zapisz/)).toBeNull();
  });

  it('says recognition is unavailable in English when that language is selected', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const { findByText, queryByText } = await renderModal();

    expect(await findByText('Recognition unavailable')).toBeTruthy();
    expect(
      await findByText(/There is no model that reads the pixels of a photo/)
    ).toBeTruthy();
    expect(queryByText(/TFLite/i)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/Borowik/)).toBeNull();
  });

  it('does not substitute a stock photo when the uri is not a local capture', async () => {
    const remote = await renderModal({
      status: 'unavailable',
      reason: 'model_missing',
      processedImageUri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
    });
    expect(remote.queryByTestId('captured-photo')).toBeNull();

    const local = await renderModal({
      status: 'unavailable',
      reason: 'model_missing',
      processedImageUri: 'file://camera/capture.jpg',
    });
    expect(local.getByTestId('captured-photo')).toBeTruthy();
  });
});

const top3: SpeciesCandidate[] = [
  {
    id: 'amanita_phalloides',
    namePl: 'Muchomor sromotnikowy (zielonawy)',
    nameLatin: 'Amanita phalloides',
    genus: 'Amanita',
    confidence: 0.41,
    rank: 1,
  },
  {
    id: 'cortinarius_orellanus',
    namePl: 'Zasłoniak rudy',
    nameLatin: 'Cortinarius orellanus',
    genus: 'Cortinarius',
    confidence: 0.22,
    rank: 2,
  },
  {
    id: 'gyromitra_esculenta',
    namePl: 'Piestrzenica kasztanowata',
    nameLatin: 'Gyromitra esculenta',
    genus: 'Gyromitra',
    confidence: 0.11,
    rank: 3,
  },
];

describe('ResultModal recognition outcomes', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('warns for a dangerous genus, shows honest confidence, and hides edibility', async () => {
    const onOpenAtlasSpecies = jest.fn();
    const { getByTestId, getByText, queryByText } = await renderModal({
      status: 'candidates',
      processedImageUri: 'file://camera/capture.jpg',
      inferenceTimeMs: 18,
      expertVerificationRequired: true,
      warningReasons: ['dangerous_genus'],
      top3,
    }, onOpenAtlasSpecies);

    expect(getByTestId('expert-verification-banner')).toBeTruthy();
    expect(getByTestId('dangerous-genus-warning').props.children).toMatch(/Amanita/);
    expect(getByText(/Sanepidzie/)).toBeTruthy();
    expect(flatText(getByTestId('candidate-confidence-1').props.children)).toBe('Pewność: 41.0%');
    expect(getByTestId('not-edibility-verdict')).toBeTruthy();
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByText('ŚMIERTELNIE TRUJĄCY')).toBeNull();
    expect(queryByText('NIEJADALNY')).toBeNull();

    fireEvent.press(getByTestId('open-atlas-amanita_phalloides'));
    expect(onOpenAtlasSpecies).toHaveBeenCalledWith('amanita_phalloides');
  });

  it('warns when confidence is low even for a bolete', async () => {
    const onOpenAtlasSpecies = jest.fn();
    const { getByTestId, queryByTestId } = await renderModal({
      status: 'candidates',
      processedImageUri: 'file://camera/capture.jpg',
      inferenceTimeMs: 12,
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
    }, onOpenAtlasSpecies);

    expect(getByTestId('low-confidence-warning')).toBeTruthy();
    expect(getByTestId('expert-verification-banner')).toBeTruthy();
    expect(queryByTestId('dangerous-genus-warning')).toBeNull();
    expect(flatText(getByTestId('candidate-confidence-1').props.children)).toBe('Pewność: 57.4%');
    fireEvent.press(getByTestId('open-atlas-boletus_edulis'));
    expect(onOpenAtlasSpecies).toHaveBeenCalledWith('boletus_edulis');
  });

  it('names no species when the picture is below the accept floor', async () => {
    const { getByTestId, queryByText, queryByTestId } = await renderModal({
      status: 'rejected',
      reason: 'unclear',
      processedImageUri: 'file://camera/blur.jpg',
      inferenceTimeMs: 11,
    });

    expect(getByTestId('recognition-rejected-title').props.children).toBe('Nie rozpoznano grzyba');
    expect(getByTestId('recognition-rejected-body').props.children).toMatch(/zbyt niejednoznaczny/);
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/Borowik/)).toBeNull();
    expect(queryByText(/Muchomor/)).toBeNull();
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByTestId('candidate-rank-1')).toBeNull();
  });

  it('names no species when the gate rejects the photo', async () => {
    const { getByTestId, queryByText, queryByTestId } = await renderModal({
      status: 'rejected',
      reason: 'not_a_mushroom',
      processedImageUri: 'file://camera/cat.jpg',
      inferenceTimeMs: 9,
    });

    expect(getByTestId('recognition-rejected-title').props.children).toBe('Nie rozpoznano grzyba');
    expect(getByTestId('recognition-rejected-body').props.children).toMatch(/Gatunek nie został podany/);
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/Borowik/)).toBeNull();
    expect(queryByText(/Muchomor/)).toBeNull();
    expect(queryByText('JADALNY')).toBeNull();
    expect(queryByTestId('expert-verification-banner')).toBeNull();
  });

  it('saves an unclear scan to the journal without upgrading it to a species', async () => {
    const onSavedToJournal = jest.fn();
    const onClose = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, queryByText } = await render(
      <LanguageProvider>
        <ResultModal
          visible
          result={{
            status: 'rejected',
            reason: 'unclear',
            processedImageUri: 'file://camera/blur.jpg',
            inferenceTimeMs: 11,
          }}
          onClose={onClose}
          onSavedToJournal={onSavedToJournal}
        />
      </LanguageProvider>,
    );

    expect(queryByText(/Borowik/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(getByTestId('save-to-journal'));

    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      text: string;
      onPress?: () => Promise<void>;
    }>;
    expect(buttons.map((button) => button.text).join(' ')).toMatch(/lokalizacji/);
    expect((Alert.alert as jest.Mock).mock.calls[0][1]).toMatch(/współrzędne zostają w dzienniku/i);

    const withoutLocation = buttons.find((button) => button.text === 'Bez lokalizacji');
    await act(async () => {
      await withoutLocation?.onPress?.();
    });

    const saved = await storageService.getSightings();
    expect(saved).toHaveLength(1);
    expect(saved[0].recognition).toEqual({ status: 'rejected', reason: 'unclear' });
    expect(saved[0].photoFile).toMatch(/^[A-Za-z0-9_-]+\.jpg$/);
    expect(saved[0].photoFile).not.toContain('/');
    expect(saved[0].latitude).toBeUndefined();
    expect(JSON.stringify(saved[0])).not.toMatch(/Borowik|speciesId|confidence/);
    expect(onSavedToJournal).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('saves without coordinates when location permission is denied', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Location.getCurrentPositionAsync as jest.Mock).mockClear();
    const { getByTestId } = await render(
      <LanguageProvider>
        <ResultModal
          visible
          result={{
            status: 'unavailable',
            reason: 'model_missing',
            processedImageUri: 'file://camera/capture.jpg',
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(getByTestId('save-to-journal'));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      text: string;
      onPress?: () => Promise<void>;
    }>;
    const withLocation = buttons.find((button) => button.text === 'Użyj lokalizacji');
    await act(async () => {
      await withLocation?.onPress?.();
    });

    const saved = await storageService.getSightings();
    expect(saved).toHaveLength(1);
    expect(saved[0].recognition).toEqual({ status: 'unavailable' });
    expect(saved[0].latitude).toBeUndefined();
    expect(saved[0].longitude).toBeUndefined();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    const messages = (Alert.alert as jest.Mock).mock.calls.map((call) => String(call[1]));
    expect(messages.join(' ')).toMatch(/bez współrzędnych/);
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });

  it('saves the copied photo and coordinates when location is allowed', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 49.12345, longitude: 20.54321 },
    });
    const { getByTestId } = await render(
      <LanguageProvider>
        <ResultModal
          visible
          result={{
            status: 'unavailable',
            reason: 'model_missing',
            processedImageUri: 'file://camera/capture.jpg',
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(getByTestId('save-to-journal'));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      text: string;
      onPress?: () => Promise<void>;
    }>;
    const withLocation = buttons.find((button) => button.text === 'Użyj lokalizacji');
    await act(async () => {
      await withLocation?.onPress?.();
    });

    const saved = await storageService.getSightings();
    expect(saved).toHaveLength(1);
    expect(saved[0].photoFile).toMatch(/^[A-Za-z0-9_-]+\.jpg$/);
    expect(saved[0].latitude).toBe(49.12345);
    expect(saved[0].longitude).toBe(20.54321);
    expect(saved[0].recognition).toEqual({ status: 'unavailable' });
    const messages = (Alert.alert as jest.Mock).mock.calls.map((call) => String(call[1]));
    expect(messages.join(' ')).toMatch(/Zdjęcie i współrzędne są w dzienniku/);
    expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
  });

  it('points to the journal when a save fails because the journal is damaged', async () => {
    await AsyncStorage.setItem(SIGHTINGS_STORAGE_KEY, 'not-json');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = await render(
      <LanguageProvider>
        <ResultModal
          visible
          result={{
            status: 'rejected',
            reason: 'unclear',
            processedImageUri: 'file://camera/blur.jpg',
            inferenceTimeMs: 11,
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(getByTestId('save-to-journal'));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{
      text: string;
      onPress?: () => Promise<void>;
    }>;
    const withoutLocation = buttons.find((button) => button.text === 'Bez lokalizacji');
    await act(async () => {
      await withoutLocation?.onPress?.();
    });

    const messages = (Alert.alert as jest.Mock).mock.calls.map((call) => String(call[1]));
    expect(messages.join(' ')).toMatch(/Otwórz Dziennik i wybierz „Zacznij nowy dziennik”/);
    expect(await AsyncStorage.getItem(SIGHTINGS_STORAGE_KEY)).toBe('not-json');
  });

  it('locks the first save tap so a second tap does not open another prompt', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = await render(
      <LanguageProvider>
        <ResultModal
          visible
          result={{
            status: 'rejected',
            reason: 'unclear',
            processedImageUri: 'file://camera/blur.jpg',
            inferenceTimeMs: 11,
          }}
          onClose={() => {}}
        />
      </LanguageProvider>,
    );

    (Alert.alert as jest.Mock).mockClear();
    await fireEvent.press(getByTestId('save-to-journal'));
    await fireEvent.press(getByTestId('save-to-journal'));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });
});
