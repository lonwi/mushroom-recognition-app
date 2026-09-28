import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PreparationGuideScreen } from '../../screens/PreparationGuideScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';

describe('PreparationGuideScreen RTL Tests', () => {
  it('renders preparation guide with all categories', async () => {
    const { getByText } = await render(
      <LanguageProvider>
        <PreparationGuideScreen />
      </LanguageProvider>
    );

    expect(getByText('Poradnik Przygotowania')).toBeTruthy();
    expect(getByText('🍄 Czyszczenie na sucho')).toBeTruthy();
    expect(getByText('🍄 Obróbka cieplna')).toBeTruthy();
    expect(getByText('🍄 Przechowywanie świeżych grzybów')).toBeTruthy();
  });

  it('filters by Cleaning tab', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <LanguageProvider>
        <PreparationGuideScreen />
      </LanguageProvider>
    );

    const cleanTab = getByTestId('tab-prep-clean');
    fireEvent.press(cleanTab);

    await waitFor(() => {
      expect(getByText('🍄 Czyszczenie na sucho')).toBeTruthy();
      expect(queryByText('🍄 Obróbka cieplna')).toBeNull();
    });
  });
});
