import fs from 'fs';
import path from 'path';
import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AtlasFilterSheet } from '../../components/AtlasFilterSheet';
import { PhotoCredits } from '../../components/PhotoCredits';
import { SulphurHoneyComparison } from '../../components/SulphurHoneyComparison';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { MUSHROOMS_DATABASE } from '../../data/mushrooms';
import { POISONOUS_MISS_ALLOWLIST } from '../../data/poisonousMissAllowlist';
import {
  COMPARISON_PHOTOS,
  COMPARISON_TRAITS,
  comparisonPhotoCredits,
  FUNERAL_BELL_ID,
  HONEY_FUNGUS_ID,
  SULPHUR_TUFT_ID,
} from '../../data/sulphurHoneyComparison';
import { photosForSpecies } from '../../data/speciesGallery';
import { en } from '../../i18n/en';
import { pl } from '../../i18n/pl';
import { SpeciesDetailScreen } from '../../screens/SpeciesDetailScreen';
import { contrastRatio, nearestBackground } from '../helpers/contrast';
import { creditLicenseUrl } from '../../services/attributionPackage';

const TASTE = /gorzk|smak|bitter|\btaste\b|kwask|acidic/i;

function species(id: string) {
  const match = MUSHROOMS_DATABASE.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing species ${id}`);
  }
  return match;
}

function textColor(node: { props?: { style?: unknown } }): string {
  const flat = StyleSheet.flatten(node.props?.style) as { color?: unknown } | undefined;
  if (typeof flat?.color !== 'string') {
    throw new Error('missing text colour');
  }
  return flat.color;
}

describe('sulphur tuft and honey fungus comparison', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('credits every comparison photo and keeps disallowed licences out', () => {
    const credits = comparisonPhotoCredits();
    expect(credits).toHaveLength(COMPARISON_PHOTOS.length);
    expect(new Set(credits.map((credit) => credit.imageUrl)).size).toBe(COMPARISON_PHOTOS.length);
    for (const photo of COMPARISON_PHOTOS) {
      const credit = credits.find((item) => item.imageUrl === photo.imageUrl);
      expect(credit?.creator).toBe(photo.author);
      expect(credit?.sourceUrl).toBe(photo.sourceUrl);
      expect(photo.sourceUrl.startsWith('https://')).toBe(true);
      expect(photo.author.length).toBeGreaterThan(0);
      expect(photo.license).not.toMatch(/NC|SA/);
      expect(photo.inaturalistObservationId).toMatch(/^\d+$/);
      expect(credit?.licenseUrl).toBe(photo.licenseUrl);
      expect(credit?.sourceNote).toBe(photo.sourceNote);
      expect(credit?.modified).toBe(true);
      if (photo.license.startsWith('CC BY')) {
        const version = /^CC BY (\d+\.\d+)$/.exec(photo.license);
        expect(version).not.toBeNull();
        expect(photo.licenseUrl).toBe(`https://creativecommons.org/licenses/by/${version?.[1]}/`);
      } else {
        expect(photo.license).toBe('CC0');
        expect(photo.licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
      }
      expect(creditLicenseUrl({ ...credit!, licenseUrl: undefined })).toBe(
        photo.license === 'CC0' ? photo.licenseUrl : null,
      );
    }
    const root = path.resolve(__dirname, '../../..');
    expect(fs.readFileSync(path.join(root, 'src/services/attributionPackage.ts'), 'utf8')).not.toMatch(
      /licenses\/by\//,
    );
    expect(fs.readFileSync(path.join(root, 'src/components/SulphurHoneyComparison.tsx'), 'utf8')).not.toMatch(
      /licenses\/by\//,
    );
    expect(photosForSpecies(HONEY_FUNGUS_ID)).toEqual([]);
    expect(photosForSpecies(SULPHUR_TUFT_ID).some((item) => item.assetPath.includes('porownanie'))).toBe(
      false,
    );
    expect(photosForSpecies(FUNERAL_BELL_ID).some((item) => item.assetPath.includes('porownanie'))).toBe(
      false,
    );
    expect(COMPARISON_PHOTOS.some((photo) => `${photo.imageUrl} ${photo.sourceUrl}`.includes('331784845'))).toBe(
      false,
    );
    expect(COMPARISON_PHOTOS.filter((photo) => photo.license === 'CC BY 4.0')).toHaveLength(7);
    const formerCommons = COMPARISON_PHOTOS.filter((photo) => photo.inaturalistPhotoUrl);
    expect(formerCommons.map((photo) => photo.author).sort()).toEqual(['Gabriel Mayrhofer', 'sugarsnap_t']);
    for (const photo of formerCommons) {
      expect(photo.license).toBe('CC BY 4.0');
      expect(photo.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
      expect(photo.sourceNote).toMatch(/Commons/);
      expect(photo.sourceNote).toMatch(/CC0/);
      expect(photo.license).not.toBe('CC0');
      expect(photo.sourceUrl).toBe(photo.inaturalistPhotoUrl);
      expect(photo.sourceUrl).toMatch(/^https:\/\/www\.inaturalist\.org\/photos\/\d+$/);
      expect(photo.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      expect(photo.sourceUrl).not.toMatch(/commons\.wikimedia\.org/);
    }
    expect(POISONOUS_MISS_ALLOWLIST).toEqual([]);
    expect(JSON.stringify(COMPARISON_TRAITS)).not.toMatch(/cortina present|bald; dry|Spore print:/i);
  });

  it('pins the approved Galerina heading, captions, and warning', async () => {
    const headingPl = 'Hełmówka jadowita (Galerina marginata) – śmiertelnie trująca';
    const headingEn = 'Deadly Galerina (Galerina marginata) – deadly poisonous';
    const warningPl = 'Zawiera amatoksyny. Żadna pojedyncza cecha, w tym pierścień, nie potwierdza opieńki.';
    const warningEn = 'Contains amatoxins. No single feature, including the ring, confirms honey fungus.';
    const captionsPl = {
      galerinaClump: 'Kępa na próchniejącym drewnie, jak u opieńki.',
      galerinaRing: 'Cienki, nietrwały pierścień; blaszki żółtawe do rdzawobrązowych.',
      galerinaZone: 'Strefa pierścienia często z rdzawym nalotem zarodników.',
      galerinaCap: 'Gładki kapelusz, wyraźnie jaśniejący przy wysychaniu.',
    };
    const captionsEn = {
      galerinaClump: 'Cluster on rotting wood, like honey fungus.',
      galerinaRing: 'Thin, fragile ring; yellowish to rusty-brown gills.',
      galerinaZone: 'Ring zone often dusted with rusty spores.',
      galerinaCap: 'Smooth cap that fades noticeably as it dries.',
    };
    expect(pl.comparison.sulphurHoney.galerinaHeading).toBe(headingPl);
    expect(en.comparison.sulphurHoney.galerinaHeading).toBe(headingEn);
    expect(pl.comparison.sulphurHoney.warning).toBe(warningPl);
    expect(en.comparison.sulphurHoney.warning).toBe(warningEn);
    expect(pl.comparison.sulphurHoney.captions.galerinaClump).toBe(captionsPl.galerinaClump);
    expect(pl.comparison.sulphurHoney.captions.galerinaRing).toBe(captionsPl.galerinaRing);
    expect(pl.comparison.sulphurHoney.captions.galerinaZone).toBe(captionsPl.galerinaZone);
    expect(pl.comparison.sulphurHoney.captions.galerinaCap).toBe(captionsPl.galerinaCap);
    expect(en.comparison.sulphurHoney.captions.galerinaClump).toBe(captionsEn.galerinaClump);
    expect(en.comparison.sulphurHoney.captions.galerinaRing).toBe(captionsEn.galerinaRing);
    expect(en.comparison.sulphurHoney.captions.galerinaZone).toBe(captionsEn.galerinaZone);
    expect(en.comparison.sulphurHoney.captions.galerinaCap).toBe(captionsEn.galerinaCap);
    expect(pl.comparison.sulphurHoney).not.toHaveProperty('deadly');
    expect(pl.comparison.sulphurHoney).not.toHaveProperty('deadlyDetail');
    expect(pl.comparison.sulphurHoney).not.toHaveProperty('notSingle');
    expect(en.comparison.sulphurHoney).not.toHaveProperty('deadly');
    expect(en.comparison.sulphurHoney).not.toHaveProperty('deadlyDetail');
    expect(en.comparison.sulphurHoney).not.toHaveProperty('notSingle');
    expect(pl.comparison.sulphurHoney.traits.flesh).not.toHaveProperty('galerina');
    expect(en.comparison.sulphurHoney.traits.flesh).not.toHaveProperty('galerina');
    const flesh = COMPARISON_TRAITS.find((trait) => trait.id === 'flesh');
    expect(flesh?.textKey.galerina).toBe('');
    expect(flesh?.sources.galerina).toEqual([]);

    const screen = await render(
      <LanguageProvider>
        <SulphurHoneyComparison />
      </LanguageProvider>,
    );
    const comparison = within(screen.getByTestId('sulphur-honey-comparison'));
    expect(comparison.getByTestId('comparison-warning')).toHaveTextContent(warningPl);
    expect(comparison.getByTestId('comparison-galerina-heading-ring')).toHaveTextContent(headingPl);
    expect(comparison.getByTestId('comparison-caption-wood-galerina-skupisko')).toHaveTextContent(
      captionsPl.galerinaClump,
    );
    expect(comparison.getByTestId('comparison-caption-ring-galerina-pierscien')).toHaveTextContent(
      captionsPl.galerinaRing,
    );
    expect(comparison.getByTestId('comparison-caption-stem-galerina-strefa')).toHaveTextContent(
      captionsPl.galerinaZone,
    );
    expect(comparison.getByTestId('comparison-caption-cap-galerina-kapelusz')).toHaveTextContent(
      captionsPl.galerinaCap,
    );
    const fleshSide = within(comparison.getByTestId('comparison-side-galerina-flesh'));
    expect(fleshSide.getByTestId('comparison-no-claim-galerina-flesh')).toBeTruthy();
    expect(fleshSide.queryByText(/miąższ/i)).toBeNull();
    expect(fleshSide.queryByText(/nie opisuje/i)).toBeNull();
  });

  it('shows photo pairs, credits and the expert limit, with no taste wording', async () => {
    const copy = JSON.stringify(pl.comparison) + JSON.stringify(en.comparison);
    expect(copy).not.toMatch(TASTE);
    expect(pl.comparison.sulphurHoney.lead).toMatch(/nie ma błoniastego pierścienia/);
    expect(en.comparison.sulphurHoney.lead).toMatch(/no membranous ring/);
    expect(pl.comparison.sulphurHoney.limit).toMatch(/grzyboznawcy/);
    expect(en.comparison.sulphurHoney.limit).toMatch(/expert/);

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const screen = await render(
      <LanguageProvider>
        <SulphurHoneyComparison />
      </LanguageProvider>,
    );
    const comparison = within(screen.getByTestId('sulphur-honey-comparison'));
    expect(comparison.getByTestId('comparison-lead')).toHaveTextContent(pl.comparison.sulphurHoney.lead);
    expect(comparison.getByTestId('comparison-limit')).toHaveTextContent(pl.comparison.sulphurHoney.limit);
    expect(comparison.queryByText(TASTE)).toBeNull();
    expect(comparison.getByTestId('comparison-trait-ring')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-gills')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-spore')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-cap')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-flesh')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-stem')).toBeTruthy();
    expect(comparison.getByTestId('comparison-trait-wood')).toBeTruthy();
    expect(comparison.getByTestId('comparison-no-photo-armillaria-flesh')).toBeTruthy();
    expect(comparison.getByTestId('comparison-no-photo-hypholoma-spore')).toBeTruthy();
    expect(comparison.getByTestId('comparison-no-photo-galerina-spore')).toBeTruthy();
    expect(comparison.queryByTestId('comparison-no-photo-galerina-flesh')).toBeNull();
    expect(comparison.getByTestId('comparison-no-claim-galerina-flesh')).toBeTruthy();
    expect(comparison.getByTestId('comparison-warning')).toHaveTextContent(pl.comparison.sulphurHoney.warning);
    expect(comparison.getByTestId('comparison-galerina-heading-ring')).toHaveTextContent(
      pl.comparison.sulphurHoney.galerinaHeading,
    );
    expect(comparison.getByTestId('comparison-side-galerina-ring')).toBeTruthy();
    expect(comparison.getByTestId('comparison-caption-cap-galerina-kapelusz')).toHaveTextContent(
      pl.comparison.sulphurHoney.captions.galerinaCap,
    );
    expect(comparison.getByTestId('comparison-caption-wood-galerina-skupisko')).toHaveTextContent(
      pl.comparison.sulphurHoney.captions.galerinaClump,
    );
    expect(comparison.queryByText(/331784845/)).toBeNull();
    expect(comparison.queryByText(/justanotherbirdbrain/)).toBeNull();
    const galerinaSide = StyleSheet.flatten(
      comparison.getByTestId('comparison-side-galerina-ring').props.style,
    ) as { minWidth?: number; borderRadius?: number; borderLeftWidth?: number; borderRightWidth?: number };
    expect(galerinaSide.minWidth).toBeGreaterThanOrEqual(148);
    expect(galerinaSide.borderRadius).toBeGreaterThanOrEqual(3);
    expect(galerinaSide.borderRadius).toBeLessThanOrEqual(6);
    expect(galerinaSide.borderLeftWidth).toBe(galerinaSide.borderRightWidth);
    const warning = comparison.getByTestId('comparison-warning');
    const warningStyle = StyleSheet.flatten(warning.props.style) as {
      backgroundColor?: string;
      borderLeftWidth?: number;
    };
    expect(warningStyle.backgroundColor).toBeUndefined();
    expect(warningStyle.borderLeftWidth).toBeUndefined();
    expect(textColor(warning)).toBe(textColor(comparison.getByTestId('comparison-lead')));
    const latin = comparison.getByTestId('comparison-galerina-latin-ring');
    expect((StyleSheet.flatten(latin.props.style) as { fontStyle?: string }).fontStyle).toBe('italic');

    for (const photo of COMPARISON_PHOTOS) {
      const authors = comparison.getAllByTestId(new RegExp(`^comparison-author-[a-z]+-${photo.id}$`));
      expect(authors.length).toBeGreaterThan(0);
      expect(authors[0]).toHaveTextContent(new RegExp(photo.author.replace(/[()]/g, '\\$&')));
      const sources = comparison.getAllByTestId(new RegExp(`^comparison-source-[a-z]+-${photo.id}$`));
      expect(sources[0]).toHaveTextContent(photo.sourceUrl);
      expect(sources[0].props.accessibilityRole).toBe('link');
    }

    await fireEvent.press(comparison.getByTestId('comparison-license-ring-hypholoma-strefa-trzon'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/licenses/by/4.0/');
    await fireEvent.press(comparison.getByTestId('comparison-license-ring-hypholoma-brzeg-kapelusza'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/licenses/by/4.0/');
    expect(comparison.getByTestId('comparison-author-ring-hypholoma-brzeg-kapelusza')).toHaveTextContent(
      /sugarsnap_t/,
    );
    expect(comparison.getByTestId('comparison-author-flesh-hypholoma-miazsz')).toHaveTextContent(
      /Gabriel Mayrhofer/,
    );
    expect(comparison.queryByText(/Commons listed this file as CC0/)).toBeNull();
    await fireEvent.press(comparison.getByTestId('comparison-license-ring-armillaria-pierscien-blaszki'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/publicdomain/zero/1.0/');
    await fireEvent.press(comparison.getByTestId('comparison-license-cap-galerina-kapelusz'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/licenses/by/4.0/');
    await fireEvent.press(comparison.getByTestId('comparison-license-wood-galerina-skupisko'));
    expect(openURL).toHaveBeenCalledWith('https://creativecommons.org/publicdomain/zero/1.0/');
    expect(comparison.getByTestId('comparison-author-cap-galerina-kapelusz')).toHaveTextContent(/Peter Boyer/);
    await fireEvent.press(comparison.getByTestId('comparison-source-link-ring-0'));
    expect(openURL).toHaveBeenCalledWith('https://www.mushroomexpert.com/hypholoma_fasciculare.html');
    await fireEvent.press(comparison.getByTestId('comparison-source-ring-hypholoma-strefa-trzon'));
    expect(openURL).toHaveBeenCalledWith('https://www.inaturalist.org/photos/57083848');

    const lead = comparison.getByTestId('comparison-lead');
    expect(contrastRatio(textColor(lead), nearestBackground(lead))).toBeGreaterThanOrEqual(4.5);
    const caption = comparison.getByTestId('comparison-caption-ring-galerina-pierscien');
    expect(contrastRatio(textColor(caption), nearestBackground(caption))).toBeGreaterThanOrEqual(4.5);
    const warningText = comparison.getByTestId('comparison-warning');
    expect(contrastRatio(textColor(warningText), nearestBackground(warningText))).toBeGreaterThanOrEqual(4.5);
    const heading = comparison.getByTestId('comparison-galerina-heading-ring');
    expect(contrastRatio(textColor(heading), nearestBackground(heading))).toBeGreaterThanOrEqual(4.5);
    const license = comparison.getByTestId('comparison-license-ring-armillaria-pierscien-trzony');
    const licenseText = within(license).getByText('CC BY 4.0');
    expect(contrastRatio(textColor(licenseText), nearestBackground(licenseText))).toBeGreaterThanOrEqual(4.5);
    openURL.mockRestore();
  });

  it('keeps dark text readable and translates the lead', async () => {
    await AsyncStorage.setItem('app_language', 'en');
    const screen = await render(
      <LanguageProvider>
        <SulphurHoneyComparison colorScheme="dark" />
      </LanguageProvider>,
    );
    const lead = await waitFor(() => {
      const node = screen.getByTestId('comparison-lead');
      expect(node).toHaveTextContent(en.comparison.sulphurHoney.lead);
      return node;
    });
    expect(contrastRatio(textColor(lead), nearestBackground(lead))).toBeGreaterThanOrEqual(4.5);
    const license = within(screen.getByTestId('comparison-license-gills-hypholoma-blaszki')).getByText(
      'CC BY 4.0',
    );
    expect(contrastRatio(textColor(license), nearestBackground(license))).toBeGreaterThanOrEqual(4.5);
    const caption = screen.getByTestId('comparison-caption-cap-galerina-kapelusz');
    expect(caption).toHaveTextContent(en.comparison.sulphurHoney.captions.galerinaCap);
    expect(contrastRatio(textColor(caption), nearestBackground(caption))).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByTestId('comparison-warning')).toHaveTextContent(en.comparison.sulphurHoney.warning);
    expect(screen.getByTestId('comparison-galerina-heading-cap')).toHaveTextContent(
      en.comparison.sulphurHoney.galerinaHeading,
    );
    expect(screen.queryByText(TASTE)).toBeNull();
    expect(screen.queryByText(/331784845/)).toBeNull();
  });

  it('renders the comparison on both species cards and not on an unrelated card', async () => {
    const sulphur = await render(
      <LanguageProvider>
        <SpeciesDetailScreen species={species(SULPHUR_TUFT_ID)} onBack={() => {}} />
      </LanguageProvider>,
    );
    expect(sulphur.getByTestId('sulphur-honey-comparison')).toBeTruthy();
    expect(within(sulphur.getByTestId('sulphur-honey-comparison')).queryByText(TASTE)).toBeNull();

    const honey = await render(
      <LanguageProvider>
        <SpeciesDetailScreen species={species(HONEY_FUNGUS_ID)} onBack={() => {}} />
      </LanguageProvider>,
    );
    expect(honey.getByTestId('sulphur-honey-comparison')).toBeTruthy();
    expect(honey.getByTestId('comparison-lead')).toHaveTextContent(/błoniastego pierścienia/);

    const other = await render(
      <LanguageProvider>
        <SpeciesDetailScreen species={species('boletus_edulis')} onBack={() => {}} />
      </LanguageProvider>,
    );
    expect(other.queryByTestId('sulphur-honey-comparison')).toBeNull();

    const bell = await render(
      <LanguageProvider>
        <SpeciesDetailScreen species={species(FUNERAL_BELL_ID)} onBack={() => {}} />
      </LanguageProvider>,
    );
    expect(bell.getByTestId('sulphur-honey-comparison')).toBeTruthy();
    expect(bell.getByTestId('comparison-side-galerina-wood')).toBeTruthy();
    expect(within(bell.getByTestId('sulphur-honey-comparison')).queryByText(TASTE)).toBeNull();
    expect(bell.getAllByText(/Łysiczki \(Psilocybe\)/).length).toBeGreaterThan(0);
    expect(bell.getAllByText(/Stamets 1996, s\. 31–33/).length).toBeGreaterThan(0);
    expect(pl.cards.galerinaLookalikeWarning).toMatch(/Hełmówka jadowita jest śmiertelnie trująca/);
  });

  it('shows the ring-chip hint inside the atlas filter sheet', async () => {
    const screen = await render(
      <LanguageProvider>
        <AtlasFilterSheet
          visible
          chipIds={new Set()}
          visibleCount={3}
          onToggle={() => undefined}
          onClear={() => undefined}
          onClose={() => undefined}
        />
      </LanguageProvider>,
    );
    const ring = within(screen.getByTestId('filter-group-ring'));
    expect(ring.getByTestId('filter-chip-ring-present')).toBeTruthy();
    expect(ring.getByTestId('filter-ring-hint-text')).toHaveTextContent(/zasnówki/);
    expect(ring.getByTestId('comparison-trait-ring')).toBeTruthy();
    expect(ring.getByTestId('comparison-photo-ring-hypholoma-strefa-trzon')).toBeTruthy();
    expect(ring.getByTestId('comparison-photo-ring-armillaria-pierscien-trzony')).toBeTruthy();
    expect(ring.getByTestId('comparison-side-galerina-ring')).toBeTruthy();
    expect(ring.getByTestId('comparison-galerina-heading-ring')).toHaveTextContent(
      /śmiertelnie trująca/,
    );
    expect(ring.getByTestId('comparison-warning')).toHaveTextContent(/Zawiera amatoksyny/);
    expect(ring.queryByText(/331784845/)).toBeNull();
    expect(ring.queryByText(TASTE)).toBeNull();
  });

  it('lists comparison authors in the photo-credit screen', async () => {
    const screen = await render(
      <LanguageProvider>
        <PhotoCredits credits={null} />
      </LanguageProvider>,
    );
    await fireEvent.changeText(screen.getByTestId('photo-credits-search'), 'Jeffrey Lee');
    expect(screen.getByText(/Jeffrey Lee \(he\/him\/his\)/)).toBeTruthy();
    expect(screen.getByText('https://www.inaturalist.org/photos/57083848')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('photo-credits-search'), 'Gabriel Mayrhofer');
    expect(screen.getByText('Gabriel Mayrhofer')).toBeTruthy();
    expect(screen.getByText('CC BY 4.0')).toBeTruthy();
    expect(screen.queryByText('CC0')).toBeNull();
    expect(screen.queryByText(/Commons listed this file as CC0/)).toBeNull();
    expect(screen.queryByText(/commons\.wikimedia\.org/)).toBeNull();
    expect(screen.getByText('https://www.inaturalist.org/photos/101886055')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('photo-credits-search'), 'sugarsnap_t');
    expect(screen.getByText('sugarsnap_t')).toBeTruthy();
    expect(screen.getByText('CC BY 4.0')).toBeTruthy();
    expect(screen.queryByText('CC0')).toBeNull();
    expect(screen.getByText('https://www.inaturalist.org/photos/313452639')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('photo-credits-search'), 'Peter Boyer');
    expect(screen.getByText('Peter Boyer')).toBeTruthy();
    expect(screen.getByText('CC BY 4.0')).toBeTruthy();
    expect(screen.getByText('https://www.inaturalist.org/photos/61730025')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('photo-credits-search'), 'Bethany Teigen');
    expect(screen.getByText('Bethany Teigen')).toBeTruthy();
    expect(screen.getByText('CC0')).toBeTruthy();
    expect(screen.queryByText('CC BY 4.0')).toBeNull();
    expect(screen.queryByText(/331784845/)).toBeNull();
    expect(screen.queryByText(/justanotherbirdbrain/)).toBeNull();
  });
});
