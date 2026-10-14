import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SpeciesGallery } from '../../components/SpeciesGallery';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';

describe('SpeciesGallery', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('uses the English feature names, including the gyromitra underside', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const screen = await render(
      <LanguageProvider>
        <SpeciesGallery speciesId="gyromitra_esculenta" />
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('species-gallery-feature-0')).toHaveTextContent(
        en.gallery.feature.undersideStem,
      );
    });
    expect(screen.getByTestId('species-gallery-feature-1')).toHaveTextContent(en.gallery.feature.wholeStemBase);
    expect(screen.queryByText(en.gallery.feature.gillsRing)).toBeNull();
    expect(screen.getByTestId('species-gallery-note')).toHaveTextContent(en.gallery.note);
    expect(screen.getByTestId('species-gallery-modified-0')).toHaveTextContent(en.gallery.modified);
    expect(screen.getByTestId('species-gallery-photo-0').props.accessibilityLabel).toContain(
      'Gyromitra esculenta',
    );
  });

  it('does not render a gallery for an edible card', async () => {
    const screen = await render(
      <LanguageProvider>
        <SpeciesGallery speciesId="boletus_edulis" />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId('species-gallery')).toBeNull();
  });

  it('shows Polish feature captions, the author, the license, and the source', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const screen = await render(
      <LanguageProvider>
        <SpeciesGallery speciesId="amanita_phalloides" />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('species-gallery-note')).toHaveTextContent(pl.gallery.note);
    expect(screen.getByTestId('species-gallery-feature-0')).toHaveTextContent(pl.gallery.feature.amanitaWhole);
    expect(screen.getByTestId('species-gallery-author-0')).toHaveTextContent('Autor: Павлик Лисицын');
    expect(screen.getByTestId('species-gallery-license-0')).toHaveTextContent('CC BY 4.0');
    expect(screen.getByTestId('species-gallery-source-0')).toHaveTextContent(
      'Źródło: https://www.inaturalist.org/observations/182790926',
    );
    expect(screen.getByTestId('species-gallery-position-0')).toHaveTextContent('1 / 8');
    expect(screen.getByTestId('species-gallery-modified-0')).toHaveTextContent(pl.gallery.modified);
    expect(screen.getByTestId('species-gallery-license-0').props.accessibilityRole).toBe('link');
    expect(screen.getByTestId('species-gallery-source-0').props.accessibilityRole).toBe('link');
    expect(screen.getByTestId('species-gallery-source-0').props.accessibilityLabel).toBe(pl.gallery.source);
    expect(screen.getByTestId('species-gallery-photo-0').props.accessibilityLabel).toContain(
      'Muchomor sromotnikowy (zielonawy)',
    );

    fireEvent.press(screen.getByTestId('species-gallery-license-0'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/licenses/by/4.0/');
    fireEvent.press(screen.getByTestId('species-gallery-source-0'));
    expect(openURL).toHaveBeenCalledWith('https://www.inaturalist.org/observations/182790926');
    openURL.mockRestore();
  });
});
