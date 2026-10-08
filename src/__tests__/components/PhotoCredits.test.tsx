import React from 'react';
import { BackHandler, Linking, Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { PhotoCredits } from '../../components/PhotoCredits';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { creditLicenseUrl, creditsFromJsonl, type PhotoCredit } from '../../services/attributionPackage';

const credit: PhotoCredit = {
  creator: 'Ada',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  licenseNormalized: 'CC-BY',
  imageUrl: 'https://example.test/photo.jpg',
  sourceUrl: 'https://example.test/source',
  classId: 'unknown_mushroom',
  taxonName: 'Lepiota cristata',
};

describe('PhotoCredits', () => {
  it('parses a jsonl credit line and opens the CC license', async () => {
    const parsed = creditsFromJsonl(
      `${JSON.stringify({
        creator: 'Ada',
        license: 'https://creativecommons.org/licenses/by/4.0/',
        license_normalized: 'CC-BY',
        image_url: 'https://example.test/photo.jpg',
        source_url: 'https://example.test/source',
        class_id: 'unknown_mushroom',
        taxon_name: 'Lepiota cristata',
      })}\n`,
    );
    expect(parsed).toEqual([credit]);
    expect(creditLicenseUrl({ ...credit, license: 'CC-BY', licenseNormalized: 'CC0' })).toBe(
      'https://creativecommons.org/publicdomain/zero/1.0/',
    );

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const { getByTestId, getByText } = await render(
      <LanguageProvider>
        <PhotoCredits credits={parsed} />
      </LanguageProvider>,
    );
    expect(getByText(/trening, test i sondy/)).toBeTruthy();
    fireEvent.press(getByTestId('photo-credit-license-0'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/licenses/by/4.0/');
    openURL.mockRestore();
  });

  it('shows a loading state instead of the empty-model message', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <LanguageProvider>
        <PhotoCredits credits={null} loading onClose={() => undefined} />
      </LanguageProvider>,
    );
    expect(getByTestId('photo-credits-loading')).toBeTruthy();
    expect(getByText(/Wczytywanie listy autorów/)).toBeTruthy();
    expect(queryByTestId('photo-credits-empty')).toBeNull();
    expect(queryByTestId('photo-credits-list')).toBeNull();
  });

  it('closes on the Android hardware back button', async () => {
    const previous = Platform.OS;
    Platform.OS = 'android';
    const onClose = jest.fn();
    type HardwareBackPress = Parameters<typeof BackHandler.addEventListener>[1];
    const handlers: HardwareBackPress[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        handlers.push(handler);
      }
      return { remove: jest.fn() };
    });
    try {
      await render(
        <LanguageProvider>
          <PhotoCredits credits={[credit]} onClose={onClose} />
        </LanguageProvider>,
      );
      expect(handlers).toHaveLength(1);
      expect(handlers[0](undefined as never)).toBe(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
      Platform.OS = previous;
    }
  });
});
