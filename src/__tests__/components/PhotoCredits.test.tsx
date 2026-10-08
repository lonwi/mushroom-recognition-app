import React from 'react';
import { Linking } from 'react-native';
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
});
