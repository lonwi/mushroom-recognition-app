import type { ImageSourcePropType } from 'react-native';
import { COMPARISON_GALLERY_IMAGES } from './speciesGallery';

/**
 * Visual comparison of sulphur tuft, honey fungus, and funeral bell.
 * Texts live in src/i18n. Source URLs stay here; the wording is our own.
 * The English Wikipedia infobox line “Stipe has a ring” is not a source.
 * Taste and smell are intentionally absent.
 * iNaturalist photo 331784845 is kept out of training and is not shown.
 */
export const SULPHUR_TUFT_ID = 'hypholoma_fasciculare';
export const HONEY_FUNGUS_ID = 'armillaria_mellea';
export const FUNERAL_BELL_ID = 'galerina_marginata';

const ME_HYPH = 'https://www.mushroomexpert.com/hypholoma_fasciculare.html';
const ME_ARM = 'https://www.mushroomexpert.com/armillaria_mellea.html';
const ME_GAL = 'https://www.mushroomexpert.com/galerina_marginata.html';
const FN_HYPH = 'https://www.first-nature.com/fungi/hypholoma-fasciculare.php';
const FN_ARM = 'https://www.first-nature.com/fungi/armillaria-mellea.php';
const FN_GAL = 'https://www.first-nature.com/fungi/galerina-marginata.php';
const WIKI_HYPH = 'https://en.wikipedia.org/wiki/Hypholoma_fasciculare';
const AMATOXIN_PAPER = 'https://doi.org/10.1080/15572536.2005.11832920';

const HYPH_LATIN = 'Hypholoma fasciculare';
const ARM_LATIN = 'Armillaria mellea';
const GAL_LATIN = 'Galerina marginata';
const CC_BY = 'CC BY 4.0';
const CC0 = 'CC0';
/** GBIF media[].license for the CC BY files, checked 2026-10-23. */
const DEED_BY_40 = 'https://creativecommons.org/licenses/by/4.0/';
const DEED_CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';
/** Not shown. Commons verified CC0 before the authors changed the licence. */
const COMMONS_CC0_NOTE =
  'Commons listed this file as CC0 before the author changed the licence to CC BY 4.0 on iNaturalist and GBIF.';

export type ComparisonSideId = 'hypholoma' | 'armillaria' | 'galerina';
type ComparisonTraitId = 'ring' | 'gills' | 'spore' | 'cap' | 'stem' | 'flesh' | 'wood';
type ComparisonSpeciesId = typeof SULPHUR_TUFT_ID | typeof HONEY_FUNGUS_ID | typeof FUNERAL_BELL_ID;
type ComparisonLicense = typeof CC_BY | typeof CC0;

export interface ComparisonPhoto {
  id: string;
  speciesId: ComparisonSpeciesId;
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
  /** Earlier Commons CC0 record. Stored with the credit and not shown as the licence. */
  sourceNote?: string;
  captionKey: string;
  /** Plain image description. Used as the accessibility label when set. */
  altKey?: string;
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
  sourceNote?: string;
}

const SIDE_HYPH: ComparisonSideId = 'hypholoma';
const SIDE_ARM: ComparisonSideId = 'armillaria';
const SIDE_GAL: ComparisonSideId = 'galerina';
const GAL_RING = 'galerina-pierscien';
const GAL_ZONE = 'galerina-strefa';
const GAL_CLUMP = 'galerina-skupisko';
const GAL_CAP = 'galerina-kapelusz';
const GAL_SPORE = 'galerina-wysyp';
const ARM_STEMS = 'armillaria-pierscien-trzony';
const S3 = 'https://inaturalist-open-data.s3.amazonaws.com/photos';

function photo(
  id: string,
  speciesId: ComparisonSpeciesId,
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
  sourceNote?: string,
  altKey?: string,
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
    sourceNote,
    captionKey,
    altKey,
  };
}

function comparisonImage(fileName: string): ImageSourcePropType {
  const image = COMPARISON_GALLERY_IMAGES[fileName];
  if (!image) {
    throw new Error(`Unknown comparison photo ${fileName}`);
  }
  return image;
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
    'sugarsnap_t',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/313452639',
    'https://upload.wikimedia.org/wikipedia/commons/f/f5/Hypholoma_fasciculare_313452639.jpg',
    `${CAPTION}.hypholomaMargin`,
    '179992253',
    'https://www.inaturalist.org/photos/313452639',
    COMMONS_CC0_NOTE,
  ),
  photo(
    'hypholoma-miazsz',
    SULPHUR_TUFT_ID,
    HYPH_LATIN,
    'hypholoma-miazsz.webp',
    'Gabriel Mayrhofer',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/101886055',
    'https://upload.wikimedia.org/wikipedia/commons/d/d3/Hypholoma_fasciculare_101886055.jpg',
    `${CAPTION}.hypholomaFlesh`,
    '63498273',
    'https://www.inaturalist.org/photos/101886055',
    COMMONS_CC0_NOTE,
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
    ARM_STEMS,
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
  photo(
    GAL_CLUMP,
    FUNERAL_BELL_ID,
    GAL_LATIN,
    'galerina-skupisko.webp',
    'Bethany Teigen',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/481995011',
    `${S3}/481995011/original.jpg`,
    `${CAPTION}.galerinaClump`,
    '268164012',
  ),
  photo(
    GAL_RING,
    FUNERAL_BELL_ID,
    GAL_LATIN,
    'galerina-pierscien.webp',
    'Sigrid Jakob',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/29910624',
    `${S3}/29910624/original.jpg`,
    `${CAPTION}.galerinaRing`,
    '19442400',
  ),
  photo(
    GAL_ZONE,
    FUNERAL_BELL_ID,
    GAL_LATIN,
    'galerina-strefa.webp',
    'Kristi Zoebelein',
    CC0,
    DEED_CC0,
    'https://www.inaturalist.org/photos/342884222',
    `${S3}/342884222/original.jpg`,
    `${CAPTION}.galerinaZone`,
    '194976255',
  ),
  photo(
    GAL_CAP,
    FUNERAL_BELL_ID,
    GAL_LATIN,
    'galerina-kapelusz.webp',
    'Peter Boyer',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/61730025',
    `${S3}/61730025/original.jpeg`,
    `${CAPTION}.galerinaCap`,
    '38807007',
  ),
  photo(
    GAL_SPORE,
    FUNERAL_BELL_ID,
    GAL_LATIN,
    'galerina-wysyp.webp',
    'Shirley Zundell',
    CC_BY,
    DEED_BY_40,
    'https://www.inaturalist.org/photos/170500861',
    `${S3}/170500861/original.jpeg`,
    `${CAPTION}.galerinaSpore`,
    '102041261',
    undefined,
    undefined,
    `${CAPTION}.galerinaSpore`,
  ),
];

const TRAIT = 'comparison.sulphurHoney.traits';
const BOTH_WEB: Record<ComparisonSideId, readonly string[]> = {
  hypholoma: [FN_HYPH, ME_HYPH],
  armillaria: [FN_ARM, ME_ARM],
  galerina: [FN_GAL, ME_GAL],
};

/** Pages behind the amatoxin line and the “no single feature” line. */
export const COMPARISON_SAFETY_SOURCES: readonly string[] = [
  AMATOXIN_PAPER,
  FN_GAL,
  ME_GAL,
  FN_ARM,
  ME_ARM,
  FN_HYPH,
  ME_HYPH,
];

export const COMPARISON_TRAITS: readonly ComparisonTrait[] = [
  {
    id: 'ring',
    titleKey: `${TRAIT}.ring.title`,
    textKey: {
      hypholoma: `${TRAIT}.ring.hypholoma`,
      armillaria: `${TRAIT}.ring.armillaria`,
      galerina: `${TRAIT}.ring.galerina`,
    },
    sources: {
      hypholoma: [ME_HYPH, WIKI_HYPH, FN_HYPH],
      armillaria: [ME_ARM, FN_ARM],
      galerina: [ME_GAL, FN_GAL],
    },
    photoIds: {
      hypholoma: ['hypholoma-strefa-trzon', YOUNG_CAP, 'hypholoma-brzeg-kapelusza'],
      armillaria: [ARM_STEMS, 'armillaria-pierscien-blaszki'],
      galerina: [GAL_RING, GAL_ZONE],
    },
  },
  {
    id: 'gills',
    titleKey: `${TRAIT}.gills.title`,
    textKey: {
      hypholoma: `${TRAIT}.gills.hypholoma`,
      armillaria: `${TRAIT}.gills.armillaria`,
      galerina: `${TRAIT}.gills.galerina`,
    },
    sources: BOTH_WEB,
    photoIds: {
      hypholoma: ['hypholoma-blaszki'],
      armillaria: ['armillaria-blaszki'],
      galerina: [GAL_RING],
    },
  },
  {
    id: 'spore',
    titleKey: `${TRAIT}.spore.title`,
    textKey: {
      hypholoma: `${TRAIT}.spore.hypholoma`,
      armillaria: `${TRAIT}.spore.armillaria`,
      galerina: `${TRAIT}.spore.galerina`,
    },
    sources: {
      // cechy.json lists the Galerina page on the sulphur-tuft spore colour:
      // MushroomExpert compares that print with Galerina there.
      hypholoma: [FN_HYPH, ME_HYPH, ME_GAL],
      armillaria: [FN_ARM, ME_ARM],
      galerina: [ME_GAL, FN_GAL, ME_ARM],
    },
    photoIds: { hypholoma: [], armillaria: [], galerina: [GAL_SPORE] },
  },
  {
    id: 'cap',
    titleKey: `${TRAIT}.cap.title`,
    textKey: {
      hypholoma: `${TRAIT}.cap.hypholoma`,
      armillaria: `${TRAIT}.cap.armillaria`,
      galerina: `${TRAIT}.cap.galerina`,
    },
    sources: {
      hypholoma: [ME_HYPH, WIKI_HYPH],
      armillaria: [FN_ARM, ME_ARM],
      galerina: [ME_GAL, FN_GAL],
    },
    photoIds: {
      hypholoma: [YOUNG_CAP],
      armillaria: ['armillaria-luski-kapelusz'],
      galerina: [GAL_CAP],
    },
  },
  {
    id: 'stem',
    titleKey: `${TRAIT}.stem.title`,
    textKey: {
      hypholoma: `${TRAIT}.stem.hypholoma`,
      armillaria: `${TRAIT}.stem.armillaria`,
      galerina: `${TRAIT}.stem.galerina`,
    },
    sources: BOTH_WEB,
    photoIds: {
      hypholoma: [],
      armillaria: [ARM_STEMS],
      galerina: [GAL_ZONE],
    },
  },
  {
    id: 'flesh',
    titleKey: `${TRAIT}.flesh.title`,
    textKey: {
      hypholoma: `${TRAIT}.flesh.hypholoma`,
      armillaria: `${TRAIT}.flesh.armillaria`,
      galerina: '',
    },
    sources: {
      hypholoma: [FN_HYPH, ME_HYPH],
      armillaria: [FN_ARM, ME_ARM],
      galerina: [],
    },
    photoIds: {
      hypholoma: ['hypholoma-miazsz'],
      armillaria: [],
      galerina: [],
    },
  },
  {
    id: 'wood',
    titleKey: `${TRAIT}.wood.title`,
    textKey: {
      hypholoma: `${TRAIT}.wood.hypholoma`,
      armillaria: `${TRAIT}.wood.armillaria`,
      galerina: `${TRAIT}.wood.galerina`,
    },
    sources: BOTH_WEB,
    photoIds: {
      hypholoma: [],
      armillaria: [],
      galerina: [GAL_CLUMP],
    },
  },
];

const PHOTO_BY_ID = new Map(COMPARISON_PHOTOS.map((item) => [item.id, item]));

export function comparisonPhotoById(id: string): ComparisonPhoto | undefined {
  return PHOTO_BY_ID.get(id);
}

export function showsSulphurHoneyComparison(speciesId: string): boolean {
  return speciesId === SULPHUR_TUFT_ID || speciesId === HONEY_FUNGUS_ID || speciesId === FUNERAL_BELL_ID;
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
    sourceNote: item.sourceNote,
  }));
}

export const COMPARISON_SIDES: readonly ComparisonSideId[] = [SIDE_HYPH, SIDE_ARM, SIDE_GAL];
