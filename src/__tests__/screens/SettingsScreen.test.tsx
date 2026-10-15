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

  it('lists atlas gallery credits when no model is installed', async () => {
    let resolveCredits: (value: null) => void = () => undefined;
    (loadPhotoCredits as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCredits = resolve;
        }),
    );
    const { getByTestId, queryByTestId, queryByText, findAllByText } = await render(
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
    expect((await findAllByText('Павлик Лисицын')).length).toBeGreaterThan(0);
    expect((await findAllByText('zmieniono: przeskalowano, WebP')).length).toBeGreaterThan(0);
    expect((await findAllByText('sigridjakob')).length).toBeGreaterThan(0);
    expect(queryByTestId('photo-credits-empty')).toBeNull();
  });

  it('shows a load error when the authors list fails to load', async () => {
    (loadPhotoCredits as jest.Mock).mockRejectedValue(new Error('unreadable attributions'));
    const { getByTestId, findByTestId, queryByText } = await render(
      <LanguageProvider>
        <SettingsScreen />
      </LanguageProvider>
    );

    await fireEvent.press(getByTestId('btn-photo-credits'));

    expect(await findByTestId('photo-credits-error')).toHaveTextContent(
      'Nie udało się wczytać listy autorów zdjęć.',
    );
    expect(queryByText(/Nie ma dołączonego modelu/)).toBeNull();
  });
});
