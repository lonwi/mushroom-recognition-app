import type { ImageSourcePropType } from 'react-native';

/**
 * Visual comparison of sulphur tuft and honey fungus.
 * Texts live in src/i18n. Source URLs stay here; the wording is our own.
 * The English Wikipedia infobox line “Stipe has a ring” is not a source.
 * Taste is intentionally absent.
 */
export const SULPHUR_TUFT_ID = 'hypholoma_fasciculare';
export const HONEY_FUNGUS_ID = 'armillaria_mellea';

const ME_HYPH = 'https://www.mushroomexpert.com/hypholoma_fasciculare.html';
const ME_ARM = 'https://www.mushroomexpert.com/armillaria_mellea.html';
const FN_HYPH = 'https://www.first-nature.com/fungi/hypholoma-fasciculare.php';
const FN_ARM = 'https://www.first-nature.com/fungi/armillaria-mellea.php';
const WIKI_HYPH = 'https://en.wikipedia.org/wiki/Hypholoma_fasciculare';

const HYPH_LATIN = 'Hypholoma fasciculare';
const ARM_LATIN = 'Armillaria mellea';
const CC_BY = 'CC BY 4.0';
const CC0 = 'CC0';
/** GBIF media[].license for the four CC BY files, checked 2026-10-23. */
const DEED_BY_40 = 'https://creativecommons.org/licenses/by/4.0/';
const DEED_CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

export type ComparisonSideId = 'hypholoma' | 'armillaria';
type ComparisonTraitId = 'ring' | 'gills' | 'spore' | 'cap' | 'flesh';
type ComparisonLicense = typeof CC_BY | typeof CC0;

export interface ComparisonPhoto {
  id: string;
  speciesId: typeof SULPHUR_TUFT_ID | typeof HONEY_FUNGUS_ID;
  taxonName: string;
  image: ImageSourcePropType;
  assetPath: string;
  author: string;
  license: ComparisonLicense;
  /** Deed for this file. Not inferred from the licence name. */
  licenseUrl: string;
  /** Page given with the photo. Shown as the credit link. */
  sourceUrl: string;
  /** File or page URL used to keep this photo out of the training split. */
  imageUrl: string;
  /** iNaturalist observation that contains this photo. */
  inaturalistObservationId: string;
  /**
   * iNaturalist photo page when imageUrl is a Commons file.
   * Training exclusion reads this so the photo id is still matched.
   */
  inaturalistPhotoUrl?: string;
  captionKey: string;
}

export interface ComparisonTrait {
  id: ComparisonTraitId;
  titleKey: string;
  textKey: Record<ComparisonSideId, string>;
  sources: Record<ComparisonSideId, readonly string[]>;
  photoIds: Record<ComparisonSideId, readonly string[]>;
}

interface ComparisonCredit {
  creator: string;
  license: string;
  licenseNormalized: string;
  licenseUrl: string;
  imageUrl: string;
  sourceUrl: string;
  classId: string;
  taxonName: string;
  modified: true;
}

const SIDE_HYPH: ComparisonSideId = 'hypholoma';
const SIDE_ARM: ComparisonSideId = 'armillaria';

function photo(
  id: string,
  speciesId: ComparisonPhoto['speciesId'],
  taxonName: string,
  fileName: string,
  author: string,
  license: ComparisonLicense,
  licenseUrl: string,
  sourceUrl: string,
  imageUrl: string,
  captionKey: string,
  inaturalistObservationId: string,
  inaturalistPhotoUrl?: string,
): ComparisonPhoto {
  const assetPath = `assets/gallery/porownanie/${fileName}`;
  return {
    id,
    speciesId,
    taxonName,
    image: comparisonImage(fileName),
    assetPath,
    author,
    license,
    licenseUrl,
    sourceUrl,
    imageUrl,
    inaturalistObservationId,
    inaturalistPhotoUrl,
    captionKey,
  };
}

function comparisonImage(fileName: string): ImageSourcePropType {
  switch (fileName) {
    case 'hypholoma-strefa-trzon.webp':
      return require('../../assets/gallery/porownanie/hypholoma-strefa-trzon.webp') as ImageSourcePropType;
    case 'hypholoma-blaszki.webp':
      return require('../../assets/gallery/porownanie/hypholoma-blaszki.webp') as ImageSourcePropType;
    case 'hypholoma-mlode-zasnowa.webp':
      return require('../../assets/gallery/porownanie/hypholoma-mlode-zasnowa.webp') as ImageSourcePropType;
    case 'hypholoma-brzeg-kapelusza.webp':
      return require('../../assets/gallery/porownanie/hypholoma-brzeg-kapelusza.webp') as ImageSourcePropType;
    case 'hypholoma-miazsz.webp':
      return require('../../assets/gallery/porownanie/hypholoma-miazsz.webp') as ImageSourcePropType;
    case 'armillaria-pierscien-blaszki.webp':
      return require('../../assets/gallery/porownanie/armillaria-pierscien-blaszki.webp') as ImageSourcePropType;
    case 'armillaria-pierscien-trzony.webp':
      return require('../../assets/gallery/porownanie/armillaria-pierscien-trzony.webp') as ImageSourcePropType;
    case 'armillaria-blaszki.webp':
      return require('../../assets/gallery/porownanie/armillaria-blaszki.webp') as ImageSourcePropType;
    case 'armillaria-luski-kapelusz.webp':
      return require('../../assets/gallery/porownanie/armillaria-luski-kapelusz.webp') as ImageSourcePropType;
    default:
      throw new Error(`Unknown comparison photo ${fileName}`);
  }
}

const CAPTION = 'comparison.sulphurHoney.captions';
const YOUNG_CAP = 'hypholoma-mlode-zasnowa';

export const COMPARISON_PHOTOS: readonly ComparisonPhoto[] = [
  photo(
    'hypholoma-strefa-trzon',
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-strefa-trzon.webp',
    'Jeffrey Lee (he/him/his)',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/57083848',
    'https://www.inaturalist.org/photos/57083848',
    `${CAPTION}.hypholomaStem`,
    '36134920',
  ),
  photo(
    'hypholoma-blaszki',
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-blaszki.webp',
    'Caroline Kane',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/585781642',
    'https://www.inaturalist.org/photos/585781642',
    `${CAPTION}.hypholomaGills`,
    '323712901',
  ),
  photo(
    YOUNG_CAP,
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-mlode-zasnowa.webp',
    'Mandy Hackney',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/334051112',
    'https://www.inaturalist.org/photos/334051112',
    `${CAPTION}.hypholomaYoung`,
    '190539437',
  ),
  photo(
    'hypholoma-brzeg-kapelusza',
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-brzeg-kapelusza.webp',
    'sugarsnap_t (via iNaturalist photo 313452639)',
    CC0,
    DEED_CC0,
    'https://commons.wikimedia.org/wiki/File:Hypholoma_fasciculare_313452639.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/f/f5/Hypholoma_fasciculare_313452639.jpg',
    `${CAPTION}.hypholomaMargin`,
    '179992253',
    'https://www.inaturalist.org/photos/313452639',
  ),
  photo(
    'hypholoma-miazsz',
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-miazsz.webp',
    'Gabriel Mayrhofer',
    CC0,
    DEED_CC0,
    'https://commons.wikimedia.org/wiki/File:Hypholoma_fasciculare_101886055.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/d/d3/Hypholoma_fasciculare_101886055.jpg',
    `${CAPTION}.hypholomaFlesh`,
    '63498273',
    'https://www.inaturalist.org/photos/101886055',
  ),
  photo(
    'armillaria-pierscien-blaszki',
    HONEY_FUNGUS_ID,
    ARM_LATIN,
    'armillaria-pierscien-blaszki.webp',
    'Stuart (sturuss)',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/334304961',
    'https://www.inaturalist.org/photos/334304961',
    `${CAPTION}.armillariaRing`,
    '190671820',
  ),
  photo(
    'armillaria-pierscien-trzony',
    HONEY_FUNGUS_ID,
    ARM_LATIN,
    'armillaria-pierscien-trzony.webp',
    'MichellePrice_CJBG',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/237957448',
    'https://www.inaturalist.org/photos/237957448',
    `${CAPTION}.armillariaStems`,
    '139156344',
  ),
  photo(
    'armillaria-blaszki',
    HONEY_FUNGUS_ID,
    ARM_LATIN,
    'armillaria-blaszki.webp',
    'Peter Gabler',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/54007942',
    'https://www.inaturalist.org/photos/54007942',
    `${CAPTION}.armillariaGills`,
    '34326887',
  ),
  photo(
    'armillaria-luski-kapelusz',
    HONEY_FUNGUS_ID,
    ARM_LATIN,
    'armillaria-luski-kapelusz.webp',
    'Peter Gabler',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/54007897',
    'https://www.inaturalist.org/photos/54007897',
    `${CAPTION}.armillariaCap`,
    '34326887',
  ),
];

const TRAIT = 'comparison.sulphurHoney.traits';
const BOTH_WEB: Record<ComparisonSideId, readonly string[]> = {
  hypholoma: [FN_HYPH, ME_HYPH],
  armillaria: [FN_ARM, ME_ARM],
};

export const COMPARISON_TRAITS: readonly ComparisonTrait[] = [
  {
    id: 'ring',
    titleKey: `${TRAIT}.ring.title`,
    textKey: {
      hypholoma: `${TRAIT}.ring.hypholoma`,
      armillaria: `${TRAIT}.ring.armillaria`,
    },
    sources: {
      hypholoma: [ME_HYPH, WIKI_HYPH, FN_HYPH],
      armillaria: [ME_ARM, FN_ARM],
    },
    photoIds: {
      hypholoma: ['hypholoma-strefa-trzon', YOUNG_CAP, 'hypholoma-brzeg-kapelusza'],
      armillaria: ['armillaria-pierscien-trzony', 'armillaria-pierscien-blaszki'],
    },
  },
  {
    id: 'gills',
    titleKey: `${TRAIT}.gills.title`,
    textKey: {
      hypholoma: `${TRAIT}.gills.hypholoma`,
      armillaria: `${TRAIT}.gills.armillaria`,
    },
    sources: BOTH_WEB,
    photoIds: {
      hypholoma: ['hypholoma-blaszki'],
      armillaria: ['armillaria-blaszki'],
    },
  },
  {
    id: 'spore',
    titleKey: `${TRAIT}.spore.title`,
    textKey: {
      hypholoma: `${TRAIT}.spore.hypholoma`,
      armillaria: `${TRAIT}.spore.armillaria`,
    },
    sources: BOTH_WEB,
    photoIds: { hypholoma: [], armillaria: [] },
  },
  {
    id: 'cap',
    titleKey: `${TRAIT}.cap.title`,
    textKey: {
      hypholoma: `${TRAIT}.cap.hypholoma`,
      armillaria: `${TRAIT}.cap.armillaria`,
    },
    sources: {
      hypholoma: [ME_HYPH, WIKI_HYPH],
      armillaria: [FN_ARM, ME_ARM],
    },
    photoIds: {
      hypholoma: [YOUNG_CAP],
      armillaria: ['armillaria-luski-kapelusz'],
    },
  },
  {
    id: 'flesh',
    titleKey: `${TRAIT}.flesh.title`,
    textKey: {
      hypholoma: `${TRAIT}.flesh.hypholoma`,
      armillaria: `${TRAIT}.flesh.armillaria`,
    },
    sources: BOTH_WEB,
    photoIds: {
      hypholoma: ['hypholoma-miazsz'],
      armillaria: [],
    },
  },
];

const PHOTO_BY_ID = new Map(COMPARISON_PHOTOS.map((item) => [item.id, item]));

export function comparisonPhotoById(id: string): ComparisonPhoto | undefined {
  return PHOTO_BY_ID.get(id);
}

export function showsSulphurHoneyComparison(speciesId: string): boolean {
  return speciesId === SULPHUR_TUFT_ID || speciesId === HONEY_FUNGUS_ID;
}

/** One credit per comparison file, for the atlas photo-credit list. */
export function comparisonPhotoCredits(): ComparisonCredit[] {
  return COMPARISON_PHOTOS.map((item) => ({
    creator: item.author,
    license: item.license,
    licenseNormalized: item.license,
    licenseUrl: item.licenseUrl,
    imageUrl: item.imageUrl,
    sourceUrl: item.sourceUrl,
    classId: item.speciesId,
    taxonName: item.taxonName,
    modified: true,
  }));
}

export const COMPARISON_SIDES: readonly ComparisonSideId[] = [SIDE_HYPH, SIDE_ARM];
