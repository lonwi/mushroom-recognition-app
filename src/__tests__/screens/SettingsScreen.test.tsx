import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { LanguageProvider } from '../../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
});
