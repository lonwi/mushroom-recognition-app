import { translate } from '../contexts/LanguageContext';
import { galleryFeatureKey } from '../data/galleryCaptions';
import { SPECIES_GALLERY, type GalleryFeature } from '../data/speciesGallery';
import { en } from '../i18n/en';
import { pl } from '../i18n/pl';

const FEATURES: GalleryFeature[] = ['W', 'G', 'C', 'Y'];
const AMANITA = new Set([
  'amanita_phalloides',
  'amanita_muscaria',
  'amanita_pantherina',
  'amanita_virosa',
  'amanita_citrina',
]);
const RING = new Set([
  ...AMANITA,
  'galerina_marginata',
  'agaricus_xanthodermus',
  'chlorophyllum_rhacodes',
]);
const CORTINA = new Set(['cortinarius_orellanus', 'cortinarius_rubellus', 'hypholoma_fasciculare']);
const PLAIN = new Set([
  'paxillus_involutus',
  'lactarius_torminosus',
  'hygrophoropsis_aurantiaca',
  'tricholoma_equestre',
]);
const NOT_VOLVA = new Set(['inocybe_erubescens', 'agaricus_xanthodermus', 'chlorophyllum_rhacodes']);
const GYROMITRA = 'gyromitra_esculenta';

const BULB = /bulw|pochw|bulb|volva/i;
const EGG = /jajo|egg/i;
const RING_WORD = /pierścień|\bring\b/i;

function caption(speciesId: string, feature: GalleryFeature, language: 'pl' | 'en'): string {
  return translate(language, galleryFeatureKey(speciesId, feature));
}

function bulwaOnlyAsNegation(text: string): boolean {
  const re = /bulwa\w*/gi;
  let match: RegExpExecArray | null;
  let any = false;
  while ((match = re.exec(text)) !== null) {
    any = true;
    const before = text.slice(Math.max(0, match.index - 6), match.index);
    if (!/^bulwa$/i.test(match[0]) || !/nie\s+$/i.test(before)) {
      return false;
    }
  }
  return any;
}

function bulbWordsAllowed(speciesId: string, feature: GalleryFeature, language: 'pl' | 'en', text: string): boolean {
  if (AMANITA.has(speciesId) && feature === 'W') {
    return true;
  }
  if (!NOT_VOLVA.has(speciesId) || feature !== 'W') {
    return false;
  }
  if (language === 'pl') {
    return bulwaOnlyAsNegation(text);
  }
  return /is not an Amanita volva or bulb/.test(text) && !/with the bulb or volva/.test(text);
}

function expectRestrictedWords(speciesId: string, feature: GalleryFeature, language: 'pl' | 'en', text: string): void {
  const where = `${speciesId} ${feature}: ${text}`;
  expect({ where, bulb: BULB.test(text) }).toEqual({
    where,
    bulb: bulbWordsAllowed(speciesId, feature, language, text),
  });
  expect({ where, egg: EGG.test(text) }).toEqual({
    where,
    egg: AMANITA.has(speciesId) && feature === 'Y',
  });
  expect({ where, ring: RING_WORD.test(text) }).toEqual({
    where,
    ring: RING.has(speciesId) && feature === 'G',
  });
}

function phrase(language: 'pl' | 'en', polish: string, english: string): string {
  return language === 'pl' ? polish : english;
}

function expectSwollenBaseCopy(speciesId: string, feature: GalleryFeature, language: 'pl' | 'en', text: string): void {
  if (!NOT_VOLVA.has(speciesId) || feature !== 'W') {
    return;
  }
  const key = speciesId === 'chlorophyllum_rhacodes' ? 'chlorophyllumWhole' : 'swollenBaseNotVolva';
  expect(text).toBe(phrase(language, pl.gallery.feature[key], en.gallery.feature[key]));
  expect(text).not.toMatch(/z bulwą|with the bulb or volva/i);
  if (speciesId !== 'chlorophyllum_rhacodes') {
    return;
  }
  expect(text).toMatch(language === 'pl' ? /rąbek/ : /rim/);
  expect(text).toMatch(language === 'pl' ? /nie ma pochwy/ : /no volva/);
}

function expectGroupCopy(speciesId: string, feature: GalleryFeature, language: 'pl' | 'en', text: string): void {
  if (CORTINA.has(speciesId) && feature === 'G') {
    expect(text).toMatch(language === 'pl' ? /zasnówk/ : /cortina/);
  }
  if (speciesId === GYROMITRA && feature === 'G') {
    expect(text).toBe(phrase(language, pl.gallery.feature.undersideStem, en.gallery.feature.undersideStem));
  }
  if (!AMANITA.has(speciesId) && !NOT_VOLVA.has(speciesId) && feature === 'W') {
    expect(text).toBe(phrase(language, pl.gallery.feature.wholeStemBase, en.gallery.feature.wholeStemBase));
  }
  if (!AMANITA.has(speciesId) && feature === 'Y') {
    expect(text).toBe(phrase(language, pl.gallery.feature.young, en.gallery.feature.young));
  }
  if (PLAIN.has(speciesId) && feature === 'G') {
    expect(text).toBe(phrase(language, pl.gallery.feature.gills, en.gallery.feature.gills));
  }
}

describe('gallery feature captions', () => {
  const speciesIds = Object.keys(SPECIES_GALLERY);

  it('classifies every poisonous gallery species', () => {
    const known = [...AMANITA, ...RING, ...CORTINA, ...PLAIN, ...NOT_VOLVA, GYROMITRA];
    expect(speciesIds.slice().sort()).toEqual([...new Set(known)].sort());
  });

  it.each(Object.keys(SPECIES_GALLERY))(
    '%s uses bulb, volva, and egg only for Amanita, and ring only where a ring exists',
    (speciesId) => {
      for (const feature of FEATURES) {
        for (const language of ['pl', 'en'] as const) {
          const text = caption(speciesId, feature, language);
          expectRestrictedWords(speciesId, feature, language, text);
          expectGroupCopy(speciesId, feature, language, text);
          expectSwollenBaseCopy(speciesId, feature, language, text);
        }
      }
    },
  );
});
