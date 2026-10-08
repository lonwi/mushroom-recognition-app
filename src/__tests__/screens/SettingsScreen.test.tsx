import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPhotoCredits } from '../../services/attributionPackage';

jest.mock('../../services/attributionPackage', () => {
  const actual = jest.requireActual('../../services/attributionPackage');
  return {
    ...actual,
    loadPhotoCredits: jest.fn(() => Promise.resolve(null)),
  };
});

describe('SettingsScreen RTL Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renders language options and switches to English', async () => {
    const { getByTestId, getByText } = await render(
      <LanguageProvider>
        <SettingsScreen />
      </LanguageProvider>
    );

    expect(getByText('Język aplikacji')).toBeTruthy();

    const enBtn = getByTestId('btn-lang-en');
    fireEvent.press(enBtn);

    // Verify AsyncStorage was updated
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('app_language', 'en');
  });

  it('opens an empty photo-credit list when no model is installed', async () => {
    let resolveCredits: (value: null) => void = () => undefined;
    (loadPhotoCredits as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCredits = resolve;
        }),
    );
    const { getByTestId, queryByTestId, queryByText, findByTestId } = await render(
      <LanguageProvider>
        <SettingsScreen />
      </LanguageProvider>
    );

    await fireEvent.press(getByTestId('btn-photo-credits'));
    expect(getByTestId('photo-credits-loading')).toBeTruthy();
    expect(queryByTestId('photo-credits-empty')).toBeNull();
    expect(queryByText(/Nie ma dołączonego modelu/)).toBeNull();

    await act(async () => {
      resolveCredits(null);
    });
    expect(await findByTestId('photo-credits-empty')).toHaveTextContent(/Nie ma dołączonego modelu/);
  });
});
