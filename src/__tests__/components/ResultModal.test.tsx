import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResultModal } from '../../components/ResultModal';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ClassificationResult } from '../../services/classifierService';

const unavailable: ClassificationResult = {
  status: 'unavailable',
  reason: 'model_missing',
  processedImageUri: 'file://camera/capture.jpg',
};

function renderModal(result: ClassificationResult | null = unavailable) {
  return render(
    <LanguageProvider>
      <ResultModal visible result={result} onClose={() => {}} />
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
    const { UNSAFE_queryByType } = await renderModal({
      status: 'unavailable',
      reason: 'model_missing',
      processedImageUri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
    });

    expect(UNSAFE_queryByType(Image)).toBeNull();
  });
});
