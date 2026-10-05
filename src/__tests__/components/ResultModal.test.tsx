import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResultModal } from '../../components/ResultModal';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ClassificationResult } from '../../services/classifierService';
import { SpeciesCandidate } from '../../services/recognitionDecision';

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
});
