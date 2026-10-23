import type { ImageSourcePropType } from 'react-native';
import { MUSHROOMS_DATABASE } from './mushrooms';

/** Whole fruiting body, gills, cap, or young fruiting body. */
export type GalleryFeature = 'W' | 'G' | 'C' | 'Y';

export interface GalleryPhoto {
  image: ImageSourcePropType;
  feature: GalleryFeature;
  author: string;
  license: 'CC BY 4.0' | 'CC0 1.0';
  sourceUrl: string;
  /** Original file URL. Training exclusion matches this, not the WebP. */
  imageUrl: string;
  /** Repo-relative WebP. One file may be referenced by several features. */
  assetPath: string;
}

export interface GalleryCredit {
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

const FEATURE_W: GalleryFeature = 'W';
const AUTHOR_LISITSYN = 'Павлик Лисицын';
const LICENSE_BY: GalleryPhoto['license'] = 'CC BY 4.0';
const EXT_JPG = 'jpg';
const FEATURE_G: GalleryFeature = 'G';
const FEATURE_C: GalleryFeature = 'C';
const EXT_JPEG = 'jpeg';
const FEATURE_Y: GalleryFeature = 'Y';
const LOGIN_PILMAR = 'pilmar';
const LOGIN_MANGOBLATT = 'mangoblatt';
const LOGIN_REGEXJ = 'regexj';
const LOGIN_SABEAR = 'sabear';
const LICENSE_CC0: GalleryPhoto['license'] = 'CC0 1.0';
const TEXT_JOHAN_ADLER = 'Johan Adler';
const TEXT_KATRIN_SIMON = 'Katrin Simon';
const OBS_75162303 = '75162303';
const TEXT_TEEMU_KURPPA = 'Teemu Kurppa';
const TEXT_DONALD_DAVESNE = 'Donald Davesne';
const OBS_99389943 = '99389943';
const AUTHOR_VIKTOR = 'Виктор';
const TEXT_VICTOR_LABORDE = 'victor laborde';
const OBS_189971985 = '189971985';
const TEXT_INGER_LISE_FONNELAND = 'Inger-Lise Fonneland';
const TEXT_HTTPS_UPLOAD_WIKIMEDIA_ORG_WIKIPEDIA_COMMONS_F_F = 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Cortinarius_orellanus.jpg';
const TEXT_HTTPS_COMMONS_WIKIMEDIA_ORG_WIKI_FILE_CORTINARIU = 'https://commons.wikimedia.org/wiki/File:Cortinarius_orellanus.jpg';
const TEXT_ASSETS_GALLERY_CORTINARIUS_ORELLANUS_COMMONS_COR = 'assets/gallery/cortinarius_orellanus/commons-cortinarius-orellanus.webp';

function observationUrl(id: string): string {
  return `https://www.inaturalist.org/observations/${id}`;
}

function inatOriginal(id: string, ext: string): string {
  return `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.${ext}`;
}

export function galleryLicenseUrl(license: GalleryPhoto['license']): string {
  if (license === LICENSE_CC0) {
    return 'https://creativecommons.org/publicdomain/zero/1.0/';
  }
  return 'https://creativecommons.org/licenses/by/4.0/';
}

function photo(
  image: ImageSourcePropType,
  feature: GalleryFeature,
  author: string,
  license: GalleryPhoto['license'],
  sourceUrl: string,
  imageUrl: string,
  assetPath: string,
): GalleryPhoto {
  return { image, feature, author, license, sourceUrl, imageUrl, assetPath };
}

const SHARED_PHOTO_0 = require('../../assets/gallery/cortinarius_orellanus/commons-cortinarius-orellanus.webp') as ImageSourcePropType;

export const SPECIES_GALLERY: Record<string, GalleryPhoto[]> = {
  amanita_phalloides: [
    photo(require('../../assets/gallery/amanita_phalloides/i318776310.webp') as ImageSourcePropType, FEATURE_W, AUTHOR_LISITSYN, LICENSE_BY, observationUrl('182790926'), inatOriginal('318776310', EXT_JPG), 'assets/gallery/amanita_phalloides/i318776310.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i233501955.webp') as ImageSourcePropType, FEATURE_W, 'Jamie O\'Neill', LICENSE_BY, observationUrl('136784029'), inatOriginal('233501955', EXT_JPG), 'assets/gallery/amanita_phalloides/i233501955.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i233501952.webp') as ImageSourcePropType, FEATURE_G, 'Jamie O\'Neill', LICENSE_BY, observationUrl('136784029'), inatOriginal('233501952', EXT_JPG), 'assets/gallery/amanita_phalloides/i233501952.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i573871461.webp') as ImageSourcePropType, FEATURE_G, 'spoonbilling', LICENSE_BY, observationUrl('317577621'), inatOriginal('573871461', EXT_JPG), 'assets/gallery/amanita_phalloides/i573871461.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i318776359.webp') as ImageSourcePropType, FEATURE_C, AUTHOR_LISITSYN, LICENSE_BY, observationUrl('182790926'), inatOriginal('318776359', EXT_JPG), 'assets/gallery/amanita_phalloides/i318776359.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i311785889.webp') as ImageSourcePropType, FEATURE_C, 'Karim Haddad', LICENSE_BY, observationUrl('179111194'), inatOriginal('311785889', EXT_JPEG), 'assets/gallery/amanita_phalloides/i311785889.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/i441641931.webp') as ImageSourcePropType, FEATURE_Y, 'Andreas Rimoldi', LICENSE_BY, observationUrl('247292463'), inatOriginal('441641931', EXT_JPEG), 'assets/gallery/amanita_phalloides/i441641931.webp'),
    photo(require('../../assets/gallery/amanita_phalloides/commons-amanita-phalloides-2025-g5.webp') as ImageSourcePropType, FEATURE_Y, 'George Chernilevsky', LICENSE_BY, 'https://commons.wikimedia.org/wiki/File:Amanita_phalloides_2025_G5.jpg', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Amanita_phalloides_2025_G5.jpg', 'assets/gallery/amanita_phalloides/commons-amanita-phalloides-2025-g5.webp'),
  ],
  amanita_muscaria: [
    photo(require('../../assets/gallery/amanita_muscaria/i161856644.webp') as ImageSourcePropType, FEATURE_W, 'sigridjakob', LICENSE_CC0, observationUrl('97332092'), inatOriginal('161856644', EXT_JPEG), 'assets/gallery/amanita_muscaria/i161856644.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i345508526.webp') as ImageSourcePropType, FEATURE_W, 'Umut Nuri Erdoğan', LICENSE_BY, observationUrl('196273245'), inatOriginal('345508526', EXT_JPEG), 'assets/gallery/amanita_muscaria/i345508526.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i165924384.webp') as ImageSourcePropType, FEATURE_G, 'rouk1_mal1', LICENSE_CC0, observationUrl('99522582'), inatOriginal('165924384', EXT_JPEG), 'assets/gallery/amanita_muscaria/i165924384.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i27118943.webp') as ImageSourcePropType, FEATURE_G, 'francescocecere', LICENSE_CC0, observationUrl('17776472'), inatOriginal('27118943', EXT_JPEG), 'assets/gallery/amanita_muscaria/i27118943.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i165924070.webp') as ImageSourcePropType, FEATURE_C, 'rouk1_mal1', LICENSE_CC0, observationUrl('99522582'), inatOriginal('165924070', EXT_JPEG), 'assets/gallery/amanita_muscaria/i165924070.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i432197409.webp') as ImageSourcePropType, FEATURE_C, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('242423358'), inatOriginal('432197409', EXT_JPEG), 'assets/gallery/amanita_muscaria/i432197409.webp'),
    photo(require('../../assets/gallery/amanita_muscaria/i23413206.webp') as ImageSourcePropType, FEATURE_Y, 'Shawn O\'Donnell', LICENSE_BY, observationUrl('15691035'), inatOriginal('23413206', EXT_JPG), 'assets/gallery/amanita_muscaria/i23413206.webp'),
  ],
  gyromitra_esculenta: [
    photo(require('../../assets/gallery/gyromitra_esculenta/i122931313.webp') as ImageSourcePropType, FEATURE_G, TEXT_KATRIN_SIMON, LICENSE_BY, observationUrl(OBS_75162303), inatOriginal('122931313', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i122931313.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i122931278.webp') as ImageSourcePropType, FEATURE_W, TEXT_KATRIN_SIMON, LICENSE_BY, observationUrl(OBS_75162303), inatOriginal('122931278', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i122931278.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i122931298.webp') as ImageSourcePropType, FEATURE_G, TEXT_KATRIN_SIMON, LICENSE_BY, observationUrl(OBS_75162303), inatOriginal('122931298', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i122931298.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i633714454.webp') as ImageSourcePropType, FEATURE_C, 'christiansw', LICENSE_CC0, observationUrl('347552429'), inatOriginal('633714454', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i633714454.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i489205751.webp') as ImageSourcePropType, FEATURE_C, 'wouterkoch', LICENSE_CC0, observationUrl('271938271'), inatOriginal('489205751', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i489205751.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i367519681.webp') as ImageSourcePropType, FEATURE_Y, 'tomas_simkunas', LICENSE_CC0, observationUrl('207756179'), inatOriginal('367519681', EXT_JPEG), 'assets/gallery/gyromitra_esculenta/i367519681.webp'),
    photo(require('../../assets/gallery/gyromitra_esculenta/i194842419.webp') as ImageSourcePropType, FEATURE_Y, AUTHOR_LISITSYN, LICENSE_BY, observationUrl('115450577'), inatOriginal('194842419', EXT_JPG), 'assets/gallery/gyromitra_esculenta/i194842419.webp'),
  ],
  paxillus_involutus: [
    photo(require('../../assets/gallery/paxillus_involutus/i220944080.webp') as ImageSourcePropType, FEATURE_W, 'Andreas Schneider', LICENSE_BY, observationUrl('129963651'), inatOriginal('220944080', EXT_JPEG), 'assets/gallery/paxillus_involutus/i220944080.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i97788827.webp') as ImageSourcePropType, FEATURE_W, LOGIN_MANGOBLATT, LICENSE_CC0, observationUrl('61129056'), inatOriginal('97788827', EXT_JPG), 'assets/gallery/paxillus_involutus/i97788827.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i102072372.webp') as ImageSourcePropType, FEATURE_G, 'Carminda Santos', LICENSE_BY, observationUrl('63585808'), inatOriginal('102072372', EXT_JPEG), 'assets/gallery/paxillus_involutus/i102072372.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i576917051.webp') as ImageSourcePropType, FEATURE_G, 'Maksymilian Bobko', LICENSE_BY, observationUrl('319168700'), inatOriginal('576917051', EXT_JPG), 'assets/gallery/paxillus_involutus/i576917051.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i317563090.webp') as ImageSourcePropType, FEATURE_C, 'sudenkorentoko', LICENSE_CC0, observationUrl('182162004'), inatOriginal('317563090', EXT_JPEG), 'assets/gallery/paxillus_involutus/i317563090.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i580253779.webp') as ImageSourcePropType, FEATURE_C, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('320891296'), inatOriginal('580253779', EXT_JPG), 'assets/gallery/paxillus_involutus/i580253779.webp'),
    photo(require('../../assets/gallery/paxillus_involutus/i102071929.webp') as ImageSourcePropType, FEATURE_Y, 'Carminda Santos', LICENSE_BY, observationUrl('63585808'), inatOriginal('102071929', EXT_JPEG), 'assets/gallery/paxillus_involutus/i102071929.webp'),
  ],
  chlorophyllum_rhacodes: [
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i163590155.webp') as ImageSourcePropType, FEATURE_W, 'David Ashcroft', LICENSE_BY, observationUrl('98278500'), inatOriginal('163590155', EXT_JPG), 'assets/gallery/chlorophyllum_rhacodes/i163590155.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i323831957.webp') as ImageSourcePropType, FEATURE_W, 'Tomas B.', LICENSE_BY, observationUrl('185412621'), inatOriginal('323831957', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i323831957.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i245119042.webp') as ImageSourcePropType, FEATURE_G, LOGIN_REGEXJ, LICENSE_CC0, observationUrl('142932579'), inatOriginal('245119042', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i245119042.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i316135915.webp') as ImageSourcePropType, FEATURE_G, LOGIN_REGEXJ, LICENSE_CC0, observationUrl('181419638'), inatOriginal('316135915', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i316135915.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i316136021.webp') as ImageSourcePropType, FEATURE_C, LOGIN_REGEXJ, LICENSE_CC0, observationUrl('181419638'), inatOriginal('316136021', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i316136021.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i447235952.webp') as ImageSourcePropType, FEATURE_C, 'mick-twinn', LICENSE_CC0, observationUrl('250110514'), inatOriginal('447235952', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i447235952.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i243493084.webp') as ImageSourcePropType, FEATURE_Y, 'Jason Grant', LICENSE_BY, observationUrl('142059891'), inatOriginal('243493084', EXT_JPEG), 'assets/gallery/chlorophyllum_rhacodes/i243493084.webp'),
    photo(require('../../assets/gallery/chlorophyllum_rhacodes/i727046442.webp') as ImageSourcePropType, FEATURE_Y, 'Yuliana Leshchenko', LICENSE_BY, observationUrl('396452253'), inatOriginal('727046442', EXT_JPG), 'assets/gallery/chlorophyllum_rhacodes/i727046442.webp'),
  ],
  hygrophoropsis_aurantiaca: [
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i307121260.webp') as ImageSourcePropType, FEATURE_W, TEXT_TEEMU_KURPPA, LICENSE_BY, observationUrl('176640067'), inatOriginal('307121260', EXT_JPG), 'assets/gallery/hygrophoropsis_aurantiaca/i307121260.webp'),
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i556901415.webp') as ImageSourcePropType, FEATURE_W, 'Matej Frančeškin', LICENSE_BY, observationUrl('308666516'), inatOriginal('556901415', EXT_JPG), 'assets/gallery/hygrophoropsis_aurantiaca/i556901415.webp'),
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i329482024.webp') as ImageSourcePropType, FEATURE_G, LOGIN_PILMAR, LICENSE_CC0, observationUrl('188277065'), inatOriginal('329482024', EXT_JPEG), 'assets/gallery/hygrophoropsis_aurantiaca/i329482024.webp'),
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i249233723.webp') as ImageSourcePropType, FEATURE_G, 'Yves Bas', LICENSE_BY, observationUrl('145123645'), inatOriginal('249233723', EXT_JPEG), 'assets/gallery/hygrophoropsis_aurantiaca/i249233723.webp'),
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i307121285.webp') as ImageSourcePropType, FEATURE_C, TEXT_TEEMU_KURPPA, LICENSE_BY, observationUrl('176640067'), inatOriginal('307121285', EXT_JPG), 'assets/gallery/hygrophoropsis_aurantiaca/i307121285.webp'),
    photo(require('../../assets/gallery/hygrophoropsis_aurantiaca/i455909063.webp') as ImageSourcePropType, FEATURE_C, 'Paweł Ryszawa', LICENSE_BY, observationUrl('254519558'), inatOriginal('455909063', EXT_JPEG), 'assets/gallery/hygrophoropsis_aurantiaca/i455909063.webp'),
  ],
  lactarius_torminosus: [
    photo(require('../../assets/gallery/lactarius_torminosus/i29239661.webp') as ImageSourcePropType, FEATURE_W, 'Davide Puddu', LICENSE_BY, observationUrl('19060576'), inatOriginal('29239661', EXT_JPEG), 'assets/gallery/lactarius_torminosus/i29239661.webp'),
    photo(require('../../assets/gallery/lactarius_torminosus/i154172493.webp') as ImageSourcePropType, FEATURE_W, 'jensu', LICENSE_CC0, observationUrl('93056492'), inatOriginal('154172493', EXT_JPEG), 'assets/gallery/lactarius_torminosus/i154172493.webp'),
    photo(require('../../assets/gallery/lactarius_torminosus/i562993230.webp') as ImageSourcePropType, FEATURE_G, 'Марина Давлетшина', LICENSE_BY, observationUrl('311853107'), inatOriginal('562993230', EXT_JPG), 'assets/gallery/lactarius_torminosus/i562993230.webp'),
    photo(require('../../assets/gallery/lactarius_torminosus/i223305895.webp') as ImageSourcePropType, FEATURE_G, 'kaitaaho', LICENSE_CC0, observationUrl('131239106'), inatOriginal('223305895', EXT_JPEG), 'assets/gallery/lactarius_torminosus/i223305895.webp'),
    photo(require('../../assets/gallery/lactarius_torminosus/i740558441.webp') as ImageSourcePropType, FEATURE_C, 'ikelman', LICENSE_BY, observationUrl('403348205'), inatOriginal('740558441', EXT_JPG), 'assets/gallery/lactarius_torminosus/i740558441.webp'),
    photo(require('../../assets/gallery/lactarius_torminosus/i316368454.webp') as ImageSourcePropType, FEATURE_C, 'denispeace', LICENSE_CC0, observationUrl('181543072'), inatOriginal('316368454', EXT_JPEG), 'assets/gallery/lactarius_torminosus/i316368454.webp'),
  ],
  amanita_pantherina: [
    photo(require('../../assets/gallery/amanita_pantherina/i165670069.webp') as ImageSourcePropType, FEATURE_W, TEXT_DONALD_DAVESNE, LICENSE_BY, observationUrl(OBS_99389943), inatOriginal('165670069', EXT_JPG), 'assets/gallery/amanita_pantherina/i165670069.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i580232509.webp') as ImageSourcePropType, FEATURE_W, 'Heiko Weber', LICENSE_BY, observationUrl('320880292'), inatOriginal('580232509', EXT_JPG), 'assets/gallery/amanita_pantherina/i580232509.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i536572834.webp') as ImageSourcePropType, FEATURE_G, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('297915912'), inatOriginal('536572834', EXT_JPG), 'assets/gallery/amanita_pantherina/i536572834.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i165670038.webp') as ImageSourcePropType, FEATURE_G, TEXT_DONALD_DAVESNE, LICENSE_BY, observationUrl(OBS_99389943), inatOriginal('165670038', EXT_JPG), 'assets/gallery/amanita_pantherina/i165670038.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i165670015.webp') as ImageSourcePropType, FEATURE_C, TEXT_DONALD_DAVESNE, LICENSE_BY, observationUrl(OBS_99389943), inatOriginal('165670015', EXT_JPG), 'assets/gallery/amanita_pantherina/i165670015.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i536572797.webp') as ImageSourcePropType, FEATURE_C, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('297915912'), inatOriginal('536572797', EXT_JPG), 'assets/gallery/amanita_pantherina/i536572797.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i235186068.webp') as ImageSourcePropType, FEATURE_Y, 'Alessia Guggisberg', LICENSE_BY, observationUrl('137679971'), inatOriginal('235186068', EXT_JPEG), 'assets/gallery/amanita_pantherina/i235186068.webp'),
    photo(require('../../assets/gallery/amanita_pantherina/i445651430.webp') as ImageSourcePropType, FEATURE_Y, 'philip_precey', LICENSE_CC0, observationUrl('249314522'), inatOriginal('445651430', EXT_JPEG), 'assets/gallery/amanita_pantherina/i445651430.webp'),
  ],
  amanita_virosa: [
    photo(require('../../assets/gallery/amanita_virosa/i736118412.webp') as ImageSourcePropType, FEATURE_W, 'Anita Engler', LICENSE_BY, observationUrl('401084131'), inatOriginal('736118412', EXT_JPG), 'assets/gallery/amanita_virosa/i736118412.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i325541800.webp') as ImageSourcePropType, FEATURE_W, 'wkee4ager', LICENSE_BY, observationUrl('186298129'), inatOriginal('325541800', EXT_JPG), 'assets/gallery/amanita_virosa/i325541800.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i412541653.webp') as ImageSourcePropType, FEATURE_G, 'tdec', LICENSE_BY, observationUrl('232221144'), inatOriginal('412541653', EXT_JPEG), 'assets/gallery/amanita_virosa/i412541653.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i148513593.webp') as ImageSourcePropType, FEATURE_G, 'Sigitas Juzėnas', LICENSE_BY, observationUrl('89903272'), inatOriginal('148513593', EXT_JPEG), 'assets/gallery/amanita_virosa/i148513593.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i412541596.webp') as ImageSourcePropType, FEATURE_C, 'tdec', LICENSE_BY, observationUrl('232221144'), inatOriginal('412541596', EXT_JPEG), 'assets/gallery/amanita_virosa/i412541596.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i224791686.webp') as ImageSourcePropType, FEATURE_C, AUTHOR_VIKTOR, LICENSE_BY, observationUrl('131980595'), inatOriginal('224791686', EXT_JPG), 'assets/gallery/amanita_virosa/i224791686.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i153454727.webp') as ImageSourcePropType, FEATURE_Y, AUTHOR_VIKTOR, LICENSE_BY, observationUrl('92658100'), inatOriginal('153454727', EXT_JPG), 'assets/gallery/amanita_virosa/i153454727.webp'),
    photo(require('../../assets/gallery/amanita_virosa/i153454708.webp') as ImageSourcePropType, FEATURE_Y, AUTHOR_VIKTOR, LICENSE_BY, observationUrl('92658100'), inatOriginal('153454708', EXT_JPG), 'assets/gallery/amanita_virosa/i153454708.webp'),
  ],
  agaricus_xanthodermus: [
    photo(require('../../assets/gallery/agaricus_xanthodermus/i290453675.webp') as ImageSourcePropType, FEATURE_W, 'szegedigombasz', LICENSE_CC0, observationUrl('167651557'), inatOriginal('290453675', EXT_JPEG), 'assets/gallery/agaricus_xanthodermus/i290453675.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i390647588.webp') as ImageSourcePropType, FEATURE_W, 'Lucian Clanet', LICENSE_BY, observationUrl('220629543'), inatOriginal('390647588', EXT_JPG), 'assets/gallery/agaricus_xanthodermus/i390647588.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i299294079.webp') as ImageSourcePropType, FEATURE_G, 'Duncan Brooks', LICENSE_BY, observationUrl('172408577'), inatOriginal('299294079', EXT_JPEG), 'assets/gallery/agaricus_xanthodermus/i299294079.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i599046976.webp') as ImageSourcePropType, FEATURE_G, LOGIN_PILMAR, LICENSE_CC0, observationUrl('330364759'), inatOriginal('599046976', EXT_JPG), 'assets/gallery/agaricus_xanthodermus/i599046976.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i241602842.webp') as ImageSourcePropType, FEATURE_C, LOGIN_PILMAR, LICENSE_CC0, observationUrl('141079385'), inatOriginal('241602842', EXT_JPG), 'assets/gallery/agaricus_xanthodermus/i241602842.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i102034384.webp') as ImageSourcePropType, FEATURE_C, LOGIN_MANGOBLATT, LICENSE_CC0, observationUrl('63564627'), inatOriginal('102034384', EXT_JPG), 'assets/gallery/agaricus_xanthodermus/i102034384.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i390647612.webp') as ImageSourcePropType, FEATURE_Y, 'Lucian Clanet', LICENSE_BY, observationUrl('220629543'), inatOriginal('390647612', EXT_JPG), 'assets/gallery/agaricus_xanthodermus/i390647612.webp'),
    photo(require('../../assets/gallery/agaricus_xanthodermus/i85215083.webp') as ImageSourcePropType, FEATURE_Y, 'nikcain', LICENSE_CC0, observationUrl('53572968'), inatOriginal('85215083', EXT_JPEG), 'assets/gallery/agaricus_xanthodermus/i85215083.webp'),
  ],
  inocybe_erubescens: [
    photo(require('../../assets/gallery/inocybe_erubescens/i78468338.webp') as ImageSourcePropType, FEATURE_W, 'Enrico Tomschke', LICENSE_BY, observationUrl('49429443'), inatOriginal('78468338', EXT_JPG), 'assets/gallery/inocybe_erubescens/i78468338.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i667678453.webp') as ImageSourcePropType, FEATURE_W, LOGIN_SABEAR, LICENSE_CC0, observationUrl('365686049'), inatOriginal('667678453', EXT_JPG), 'assets/gallery/inocybe_erubescens/i667678453.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i79821844.webp') as ImageSourcePropType, FEATURE_G, 'Peeter Talvistu', LICENSE_BY, observationUrl('50267582'), inatOriginal('79821844', EXT_JPEG), 'assets/gallery/inocybe_erubescens/i79821844.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i676615640.webp') as ImageSourcePropType, FEATURE_G, LOGIN_SABEAR, LICENSE_CC0, observationUrl('370374285'), inatOriginal('676615640', EXT_JPG), 'assets/gallery/inocybe_erubescens/i676615640.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i676615528.webp') as ImageSourcePropType, FEATURE_C, LOGIN_SABEAR, LICENSE_CC0, observationUrl('370374285'), inatOriginal('676615528', EXT_JPG), 'assets/gallery/inocybe_erubescens/i676615528.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i519370221.webp') as ImageSourcePropType, FEATURE_C, TEXT_VICTOR_LABORDE, LICENSE_BY, observationUrl('288787182'), inatOriginal('519370221', EXT_JPG), 'assets/gallery/inocybe_erubescens/i519370221.webp'),
    photo(require('../../assets/gallery/inocybe_erubescens/i519370407.webp') as ImageSourcePropType, FEATURE_Y, TEXT_VICTOR_LABORDE, LICENSE_BY, observationUrl('288787182'), inatOriginal('519370407', EXT_JPG), 'assets/gallery/inocybe_erubescens/i519370407.webp'),
  ],
  hypholoma_fasciculare: [
    photo(require('../../assets/gallery/hypholoma_fasciculare/i332909821.webp') as ImageSourcePropType, FEATURE_W, 'sturuss', LICENSE_CC0, observationUrl(OBS_189971985), inatOriginal('332909821', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i332909821.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i96210405.webp') as ImageSourcePropType, FEATURE_W, LOGIN_MANGOBLATT, LICENSE_CC0, observationUrl('60181818'), inatOriginal('96210405', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i96210405.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i335699255.webp') as ImageSourcePropType, FEATURE_G, 'termeszet1', LICENSE_CC0, observationUrl('191367997'), inatOriginal('335699255', EXT_JPEG), 'assets/gallery/hypholoma_fasciculare/i335699255.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i332909787.webp') as ImageSourcePropType, FEATURE_G, 'sturuss', LICENSE_CC0, observationUrl(OBS_189971985), inatOriginal('332909787', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i332909787.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i175543401.webp') as ImageSourcePropType, FEATURE_C, 'Michel Langeveld', LICENSE_BY, observationUrl('104726384'), inatOriginal('175543401', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i175543401.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i332909798.webp') as ImageSourcePropType, FEATURE_C, 'sturuss', LICENSE_CC0, observationUrl(OBS_189971985), inatOriginal('332909798', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i332909798.webp'),
    photo(require('../../assets/gallery/hypholoma_fasciculare/i456871736.webp') as ImageSourcePropType, FEATURE_Y, 'cjoynson', LICENSE_CC0, observationUrl('254994537'), inatOriginal('456871736', EXT_JPG), 'assets/gallery/hypholoma_fasciculare/i456871736.webp'),
  ],
  tricholoma_equestre: [
    photo(require('../../assets/gallery/tricholoma_equestre/i321790489.webp') as ImageSourcePropType, FEATURE_W, 'Tatiana Strus', LICENSE_BY, observationUrl('184354733'), inatOriginal('321790489', EXT_JPEG), 'assets/gallery/tricholoma_equestre/i321790489.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i100435382.webp') as ImageSourcePropType, FEATURE_W, TEXT_KATRIN_SIMON, LICENSE_BY, observationUrl('62661028'), inatOriginal('100435382', EXT_JPG), 'assets/gallery/tricholoma_equestre/i100435382.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i436165846.webp') as ImageSourcePropType, FEATURE_G, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('244515633'), inatOriginal('436165846', EXT_JPEG), 'assets/gallery/tricholoma_equestre/i436165846.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i322213191.webp') as ImageSourcePropType, FEATURE_G, 'Марина Давлетшина', LICENSE_BY, observationUrl('184578551'), inatOriginal('322213191', EXT_JPEG), 'assets/gallery/tricholoma_equestre/i322213191.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i417225596.webp') as ImageSourcePropType, FEATURE_C, 'Dmitry Ivanov', LICENSE_BY, observationUrl('234670305'), inatOriginal('417225596', EXT_JPEG), 'assets/gallery/tricholoma_equestre/i417225596.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i748336344.webp') as ImageSourcePropType, FEATURE_C, 'Karolina Skorb', LICENSE_BY, observationUrl('407239395'), inatOriginal('748336344', EXT_JPG), 'assets/gallery/tricholoma_equestre/i748336344.webp'),
    photo(require('../../assets/gallery/tricholoma_equestre/i321790476.webp') as ImageSourcePropType, FEATURE_Y, 'Tatiana Strus', LICENSE_BY, observationUrl('184354733'), inatOriginal('321790476', EXT_JPEG), 'assets/gallery/tricholoma_equestre/i321790476.webp'),
  ],
  galerina_marginata: [
    photo(require('../../assets/gallery/galerina_marginata/i235279592.webp') as ImageSourcePropType, FEATURE_W, 'Ирина Хохрякова', LICENSE_BY, observationUrl('137727590'), inatOriginal('235279592', EXT_JPEG), 'assets/gallery/galerina_marginata/i235279592.webp'),
    photo(require('../../assets/gallery/galerina_marginata/i449439926.webp') as ImageSourcePropType, FEATURE_G, TEXT_TEEMU_KURPPA, LICENSE_BY, observationUrl('251208005'), inatOriginal('449439926', EXT_JPEG), 'assets/gallery/galerina_marginata/i449439926.webp'),
    photo(require('../../assets/gallery/galerina_marginata/i340065640.webp') as ImageSourcePropType, FEATURE_G, 'termeszet1', LICENSE_CC0, observationUrl('193576157'), inatOriginal('340065640', EXT_JPEG), 'assets/gallery/galerina_marginata/i340065640.webp'),
    photo(require('../../assets/gallery/galerina_marginata/i623864955.webp') as ImageSourcePropType, FEATURE_C, TEXT_VICTOR_LABORDE, LICENSE_BY, observationUrl('342568493'), inatOriginal('623864955', EXT_JPG), 'assets/gallery/galerina_marginata/i623864955.webp'),
    photo(require('../../assets/gallery/galerina_marginata/i454928128.webp') as ImageSourcePropType, FEATURE_C, 'lizfrost47', LICENSE_BY, observationUrl('254027717'), inatOriginal('454928128', EXT_JPEG), 'assets/gallery/galerina_marginata/i454928128.webp'),
    photo(require('../../assets/gallery/galerina_marginata/i623868009.webp') as ImageSourcePropType, FEATURE_Y, TEXT_VICTOR_LABORDE, LICENSE_BY, observationUrl('342568493'), inatOriginal('623868009', EXT_JPG), 'assets/gallery/galerina_marginata/i623868009.webp'),
  ],
  amanita_citrina: [
    photo(require('../../assets/gallery/amanita_citrina/i234418893.webp') as ImageSourcePropType, FEATURE_W, 'jensu', LICENSE_CC0, observationUrl('137274330'), inatOriginal('234418893', EXT_JPEG), 'assets/gallery/amanita_citrina/i234418893.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i575553975.webp') as ImageSourcePropType, FEATURE_W, TEXT_JOHAN_ADLER, LICENSE_BY, observationUrl('318456597'), inatOriginal('575553975', EXT_JPG), 'assets/gallery/amanita_citrina/i575553975.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i439679325.webp') as ImageSourcePropType, FEATURE_G, 'Angelika Baumann', LICENSE_BY, observationUrl('246302696'), inatOriginal('439679325', EXT_JPEG), 'assets/gallery/amanita_citrina/i439679325.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i581744127.webp') as ImageSourcePropType, FEATURE_G, 'Roland Godon', LICENSE_BY, observationUrl('321656115'), inatOriginal('581744127', EXT_JPG), 'assets/gallery/amanita_citrina/i581744127.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i744197630.webp') as ImageSourcePropType, FEATURE_C, TEXT_KATRIN_SIMON, LICENSE_BY, observationUrl('405182907'), inatOriginal('744197630', EXT_JPG), 'assets/gallery/amanita_citrina/i744197630.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i574762710.webp') as ImageSourcePropType, FEATURE_C, LOGIN_PILMAR, LICENSE_CC0, observationUrl('318042732'), inatOriginal('574762710', EXT_JPG), 'assets/gallery/amanita_citrina/i574762710.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i155987510.webp') as ImageSourcePropType, FEATURE_Y, LOGIN_PILMAR, LICENSE_CC0, observationUrl('94063077'), inatOriginal('155987510', EXT_JPG), 'assets/gallery/amanita_citrina/i155987510.webp'),
    photo(require('../../assets/gallery/amanita_citrina/i581744089.webp') as ImageSourcePropType, FEATURE_Y, 'Roland Godon', LICENSE_BY, observationUrl('321656115'), inatOriginal('581744089', EXT_JPG), 'assets/gallery/amanita_citrina/i581744089.webp'),
  ],
  cortinarius_orellanus: [
    photo(require('../../assets/gallery/cortinarius_orellanus/i139699317.webp') as ImageSourcePropType, FEATURE_W, 'Jose Castro', LICENSE_BY, observationUrl('84954351'), inatOriginal('139699317', EXT_JPEG), 'assets/gallery/cortinarius_orellanus/i139699317.webp'),
    photo(SHARED_PHOTO_0, FEATURE_G, TEXT_INGER_LISE_FONNELAND, LICENSE_BY, TEXT_HTTPS_COMMONS_WIKIMEDIA_ORG_WIKI_FILE_CORTINARIU, TEXT_HTTPS_UPLOAD_WIKIMEDIA_ORG_WIKIPEDIA_COMMONS_F_F, TEXT_ASSETS_GALLERY_CORTINARIUS_ORELLANUS_COMMONS_COR),
    photo(SHARED_PHOTO_0, FEATURE_C, TEXT_INGER_LISE_FONNELAND, LICENSE_BY, TEXT_HTTPS_COMMONS_WIKIMEDIA_ORG_WIKI_FILE_CORTINARIU, TEXT_HTTPS_UPLOAD_WIKIMEDIA_ORG_WIKIPEDIA_COMMONS_F_F, TEXT_ASSETS_GALLERY_CORTINARIUS_ORELLANUS_COMMONS_COR),
    photo(SHARED_PHOTO_0, FEATURE_Y, TEXT_INGER_LISE_FONNELAND, LICENSE_BY, TEXT_HTTPS_COMMONS_WIKIMEDIA_ORG_WIKI_FILE_CORTINARIU, TEXT_HTTPS_UPLOAD_WIKIMEDIA_ORG_WIKIPEDIA_COMMONS_F_F, TEXT_ASSETS_GALLERY_CORTINARIUS_ORELLANUS_COMMONS_COR),
  ],
  cortinarius_rubellus: [
    photo(require('../../assets/gallery/cortinarius_rubellus/i427578808.webp') as ImageSourcePropType, FEATURE_W, 'wkee4ager', LICENSE_BY, observationUrl('240029720'), inatOriginal('427578808', EXT_JPEG), 'assets/gallery/cortinarius_rubellus/i427578808.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i544592090.webp') as ImageSourcePropType, FEATURE_W, 'Manuela Fiorini', LICENSE_BY, observationUrl('302187604'), inatOriginal('544592090', EXT_JPG), 'assets/gallery/cortinarius_rubellus/i544592090.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i445372818.webp') as ImageSourcePropType, FEATURE_G, 'Myles McSweeney', LICENSE_BY, observationUrl('249176651'), inatOriginal('445372818', EXT_JPEG), 'assets/gallery/cortinarius_rubellus/i445372818.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i432118804.webp') as ImageSourcePropType, FEATURE_G, 'Virn Stothers', LICENSE_BY, observationUrl('242385025'), inatOriginal('432118804', EXT_JPEG), 'assets/gallery/cortinarius_rubellus/i432118804.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i324430640.webp') as ImageSourcePropType, FEATURE_C, 'J Castillo', LICENSE_BY, observationUrl('185733546'), inatOriginal('324430640', EXT_JPEG), 'assets/gallery/cortinarius_rubellus/i324430640.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i445372784.webp') as ImageSourcePropType, FEATURE_C, 'Myles McSweeney', LICENSE_BY, observationUrl('249176651'), inatOriginal('445372784', EXT_JPEG), 'assets/gallery/cortinarius_rubellus/i445372784.webp'),
    photo(require('../../assets/gallery/cortinarius_rubellus/i539178809.webp') as ImageSourcePropType, FEATURE_Y, 'Tim Eberling', LICENSE_BY, observationUrl('299281797'), inatOriginal('539178809', EXT_JPG), 'assets/gallery/cortinarius_rubellus/i539178809.webp'),
  ],
  suillellus_luridus: [
    photo(require('../../assets/gallery/suillellus_luridus/i575029415.webp') as ImageSourcePropType, FEATURE_W, 'Paulius Rupšas', LICENSE_BY, observationUrl('318179829'), inatOriginal('575029415', EXT_JPG), 'assets/gallery/suillellus_luridus/i575029415.webp'),
  ],
  rubroboletus_satanas: [
    photo(require('../../assets/gallery/rubroboletus_satanas/i335498704.webp') as ImageSourcePropType, FEATURE_W, 'Алена Ручка', LICENSE_BY, observationUrl('191268109'), inatOriginal('335498704', EXT_JPEG), 'assets/gallery/rubroboletus_satanas/i335498704.webp'),
  ],
};

/** Offline comparison photos. Metro bundles each literal require() in this manifest. */
export const COMPARISON_GALLERY_IMAGES: Readonly<Record<string, ImageSourcePropType>> = {
  'hypholoma-strefa-trzon.webp': require('../../assets/gallery/porownanie/hypholoma-strefa-trzon.webp') as ImageSourcePropType,
  'hypholoma-blaszki.webp': require('../../assets/gallery/porownanie/hypholoma-blaszki.webp') as ImageSourcePropType,
  'hypholoma-mlode-zasnowa.webp': require('../../assets/gallery/porownanie/hypholoma-mlode-zasnowa.webp') as ImageSourcePropType,
  'hypholoma-brzeg-kapelusza.webp': require('../../assets/gallery/porownanie/hypholoma-brzeg-kapelusza.webp') as ImageSourcePropType,
  'hypholoma-miazsz.webp': require('../../assets/gallery/porownanie/hypholoma-miazsz.webp') as ImageSourcePropType,
  'armillaria-pierscien-blaszki.webp': require('../../assets/gallery/porownanie/armillaria-pierscien-blaszki.webp') as ImageSourcePropType,
  'armillaria-pierscien-trzony.webp': require('../../assets/gallery/porownanie/armillaria-pierscien-trzony.webp') as ImageSourcePropType,
  'armillaria-blaszki.webp': require('../../assets/gallery/porownanie/armillaria-blaszki.webp') as ImageSourcePropType,
  'armillaria-luski-kapelusz.webp': require('../../assets/gallery/porownanie/armillaria-luski-kapelusz.webp') as ImageSourcePropType,
  'galerina-skupisko.webp': require('../../assets/gallery/porownanie/galerina-skupisko.webp') as ImageSourcePropType,
  'galerina-pierscien.webp': require('../../assets/gallery/porownanie/galerina-pierscien.webp') as ImageSourcePropType,
  'galerina-strefa.webp': require('../../assets/gallery/porownanie/galerina-strefa.webp') as ImageSourcePropType,
  'galerina-kapelusz.webp': require('../../assets/gallery/porownanie/galerina-kapelusz.webp') as ImageSourcePropType,
};

export function photosForSpecies(speciesId: string): GalleryPhoto[] {
  return SPECIES_GALLERY[speciesId] ?? [];
}

/** One credit per file. The shared Cortinarius photo is credited once. */
export function galleryPhotoCredits(): GalleryCredit[] {
  const latin = new Map(MUSHROOMS_DATABASE.map((species) => [species.id, species.nameLatin]));
  const seen = new Set<string>();
  const credits: GalleryCredit[] = [];
  for (const [speciesId, photos] of Object.entries(SPECIES_GALLERY)) {
    for (const item of photos) {
      if (seen.has(item.imageUrl)) {
        continue;
      }
      seen.add(item.imageUrl);
      credits.push({
        creator: item.author,
        license: item.license,
        licenseNormalized: item.license,
        licenseUrl: galleryLicenseUrl(item.license),
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
        classId: speciesId,
        taxonName: latin.get(speciesId) ?? speciesId,
        modified: true,
      });
    }
  }
  return credits;
}
