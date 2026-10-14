import React from 'react';
import { BackHandler, Platform } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../../App';
import { HARDWARE_BACK_EVENT } from '../../navigation/hardwareBack';
import { storageService } from '../../services/storageService';
import { pl } from '../../i18n/pl';

type BackHandlerFn = () => boolean | null | undefined;

function installBackHandler() {
  const handlers: BackHandlerFn[] = [];
  const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
    if (event !== 'hardwareBackPress') {
      return { remove: () => undefined };
    }
    const listener = handler as BackHandlerFn;
    handlers.push(listener);
    return {
      remove: () => {
        const index = handlers.indexOf(listener);
        if (index >= 0) handlers.splice(index, 1);
      },
    };
  });

  const press = (): boolean => {
    for (let index = handlers.length - 1; index >= 0; index -= 1) {
      if (handlers[index]()) return true;
    }
    return false;
  };

  return { handlers, press, restore: () => spy.mockRestore() };
}

describe('Android hardware back', () => {
  const previousPlatform = Platform.OS;

  beforeEach(async () => {
    Platform.OS = 'android';
    await AsyncStorage.clear();
  });

  afterEach(() => {
    Platform.OS = previousPlatform;
  });

  it('pops detail, settings, and preparation, and leaves a root tab alone', async () => {
    const back = installBackHandler();
    try {
      const screen = await render(<App />);
      expect(back.handlers).toHaveLength(1);

      await act(async () => {
        expect(back.press()).toBe(false);
      });
      expect(screen.getByTestId('scanner-atlas-scope')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('nav-ATLAS'));
      await fireEvent.press(screen.getByTestId('atlas-card-boletus_edulis'));
      expect(screen.getByTestId('species-back')).toBeTruthy();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.queryByTestId('species-back')).toBeNull();
      expect(screen.getByTestId('atlas-scope-notice')).toBeTruthy();
      expect(back.press()).toBe(false);

      await fireEvent.press(screen.getByTestId('atlas-card-boletus_edulis'));
      await fireEvent.press(screen.getByText('⚙️'));
      expect(screen.getByTestId('btn-lang-pl')).toBeTruthy();
      expect(screen.queryByTestId('species-back')).toBeNull();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.queryByTestId('btn-lang-pl')).toBeNull();
      expect(screen.getByTestId('species-back')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('nav-SAFETY'));
      await fireEvent.press(screen.getByTestId('open-preparation'));
      expect(screen.getByTestId('tab-prep-all')).toBeTruthy();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.queryByTestId('tab-prep-all')).toBeNull();
      expect(screen.getByText(pl.safetyGuide.title)).toBeTruthy();
      expect(back.press()).toBe(false);
    } finally {
      back.restore();
    }
  });

  it('returns from a look-alike to the previous card and from the journal to that tab', async () => {
    const back = installBackHandler();
    try {
      await storageService.saveSighting({
        id: 'sighting_spot',
        timestamp: 1_720_000_100_000,
        recognition: {
          status: 'candidates',
          expertVerificationRequired: true,
          warningReasons: ['low_confidence'],
          top3: [
            {
              id: 'boletus_edulis',
              namePl: 'Borowik szlachetny',
              nameLatin: 'Boletus edulis',
              confidence: 0.57,
              rank: 1,
            },
          ],
        },
      });
      const screen = await render(<App />);

      await fireEvent.press(screen.getByTestId('demo-atlas-macrolepiota'));
      expect(screen.getByText('Macrolepiota procera')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('lookalike-link-amanita_phalloides'));
      expect(screen.getByText('Amanita phalloides')).toBeTruthy();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.getByText('Macrolepiota procera')).toBeTruthy();
      expect(screen.queryByText('Amanita phalloides')).toBeNull();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.queryByTestId('species-back')).toBeNull();
      expect(screen.getByTestId('scanner-atlas-scope')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('nav-JOURNAL'));
      await fireEvent.press(await screen.findByTestId('journal-open-candidate-sighting_spot'));
      expect(screen.getByText('Prawdziwki')).toBeTruthy();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.getByTestId('journal-entry-sighting_spot')).toBeTruthy();
      expect(screen.queryByText('Prawdziwki')).toBeNull();
      expect(back.press()).toBe(false);
    } finally {
      back.restore();
    }
  });

  it('lets photo credits consume back before the settings screen does', async () => {
    const back = installBackHandler();
    try {
      const screen = await render(<App />);
      await fireEvent.press(screen.getByText('⚙️'));
      await fireEvent.press(screen.getByTestId('btn-photo-credits'));
      expect(screen.getByTestId('photo-credits-screen')).toBeTruthy();
      expect(back.handlers.length).toBeGreaterThan(1);

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      await waitFor(() => {
        expect(screen.queryByTestId('photo-credits-screen')).toBeNull();
      });
      expect(screen.getByTestId('btn-lang-pl')).toBeTruthy();

      await act(async () => {
        expect(back.press()).toBe(true);
      });
      expect(screen.queryByTestId('btn-lang-pl')).toBeNull();
      expect(screen.getByTestId('scanner-atlas-scope')).toBeTruthy();
    } finally {
      back.restore();
    }
  });

  it('keeps the hardware back event name stable for browser tests', () => {
    expect(HARDWARE_BACK_EVENT).toBe('hardwareBackPress');
  });
});
