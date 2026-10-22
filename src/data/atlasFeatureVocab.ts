/**
 * Tokens for atlas features. Values are Polish ASCII, the same style as
 * `pochwa`, `bialy`, and `oliwkowobrazowy` in atlasFilterFacts.json.
 * English source tokens and the field-name map are documented in
 * data/sources/ATLAS_CECHY.md. Display labels live in src/i18n only.
 */

const BIALY = 'bialy';
const KREMOWY = 'kremowy';
const ZOLTY = 'zolty';
const POMARANCZOWY = 'pomaranczowy';
const CZERWONY = 'czerwony';
const ROZOWY = 'rozowy';
const BRAZOWY = 'brazowy';
const OLIWKOWY = 'oliwkowy';
const ZIELONY = 'zielony';
const SZARY = 'szary';
const BRAK = 'brak';
const NIEWYRAZNY = 'niewyrazny';
const MACZNY = 'maczny';

const COLOR_TOKENS = [
  BIALY,
  KREMOWY,
  ZOLTY,
  POMARANCZOWY,
  CZERWONY,
  ROZOWY,
  BRAZOWY,
  OLIWKOWY,
  ZIELONY,
  SZARY,
] as const;

const CAP_SHAPE = [
  'kulisty',
  'polkulisty',
  'wypukly',
  'plaski',
  'wklesly',
  'lejkowaty',
  'dzwonkowaty',
  'stozkowaty',
  'jajowaty',
  'z_garbkiem',
  'nieregularny',
  'mozgowaty',
  'komorkowaty',
] as const;

const STEM_SHAPE = [
  'walcowaty',
  'maczugowaty',
  'bulwiasty',
  'beczkowaty',
  'zweza_w_gore',
  'zweza_w_dol',
] as const;

const STEM_FEATURES = [
  'siateczka',
  'luseczki',
  'zygzaki',
  'wzor_weza',
  'czerwone_punkty',
  'wlokna_zasnowki',
  'dolkowany',
  'gruczolki',
  'bruzdowany',
  'pusty',
  'luskowaty',
  'wlokniste_smugi',
  'zrosniete',
] as const;

const SMELL = [
  NIEWYRAZNY,
  'przyjemny',
  'grzybowy',
  'owocowy',
  'rzodkiewkowy',
  MACZNY,
  'fenolowy',
  'mdlo_slodki',
  'nieprzyjemny',
  'terpentynowy',
  'surowe_ziemniaki',
  'ziemisty',
  'korzenny',
  'igliwie',
] as const;

/** Policy sentinel: poisonous species have no taste to show. */
export const TASTE_WITHHELD = 'nie_podaje_sie';

const TASTE = [NIEWYRAZNY, 'lagodny', 'gorzki', 'lekko_gorzki', MACZNY, TASTE_WITHHELD] as const;

const FLESH = [
  BRAK,
  'sinieje',
  'slabo_sinieje',
  'czerwienieje',
  'zolknie',
  'zielenieje',
  'ciemnieje',
  'brazowieje',
] as const;

const LATEX = [BRAK, POMARANCZOWY, BIALY] as const;

const SUBSTRATE = ['gleba', 'sciolka', 'martwe_drewno', 'zywe_drzewo'] as const;

const HOST_TREES = [
  'brzoza',
  'buk',
  'dab',
  'grab',
  'jesion',
  'jodla',
  'leszczyna',
  'lipa',
  'modrzew',
  'olcha',
  'sosna',
  'swierk',
  'topola',
  'wiaz',
  'wierzba',
] as const;

const HYMENOPHORE = ['blaszki', 'rurki', 'listwy', 'kolce', 'inne'] as const;

const SPORE = [
  BIALY,
  KREMOWY,
  ZOLTY,
  ROZOWY,
  'oliwkowobrazowy',
  BRAZOWY,
  'rdzawobrazowy',
  'czekoladowobrazowy',
  'fioletowobrazowy',
  'fioletowoczarny',
  'czarnobrazowy',
] as const;

const VOLVA = ['pochwa', 'bulwa', BRAK] as const;

const PROTECTION = ['scisla', 'czesciowa', BRAK] as const;

export const ATLAS_TOKEN_VOCAB = {
  capShape: CAP_SHAPE,
  capColor: COLOR_TOKENS,
  stemShape: STEM_SHAPE,
  stemColor: COLOR_TOKENS,
  stemFeatures: STEM_FEATURES,
  smell: SMELL,
  taste: TASTE,
  fleshDiscoloration: FLESH,
  latex: LATEX,
  hostTrees: HOST_TREES,
  substrate: SUBSTRATE,
  hymenophore: HYMENOPHORE,
  sporePrint: SPORE,
  volva: VOLVA,
  protection: PROTECTION,
} as const;

type AtlasTokenField = keyof typeof ATLAS_TOKEN_VOCAB;

/** New fact keys copied into the app. camelCase matches `sporePrint`. */
export const FEATURE_KEYS = [
  'capShape',
  'capColor',
  'capSizeCm',
  'stemShape',
  'stemColor',
  'stemFeatures',
  'smell',
  'taste',
  'fleshDiscoloration',
  'latex',
  'hostTrees',
  'substrate',
] as const;

interface CapSizeCm {
  min: number | null;
  max: number | null;
}

export interface AtlasFeatureFields {
  capShape?: readonly string[];
  capColor?: readonly string[];
  capSizeCm?: CapSizeCm;
  stemShape?: readonly string[];
  stemColor?: readonly string[];
  stemFeatures?: readonly string[];
  smell?: readonly string[];
  taste?: readonly string[];
  fleshDiscoloration?: readonly string[];
  latex?: readonly string[];
  hostTrees?: readonly string[];
  substrate?: readonly string[];
}

export const IMPORT_STATUSES = ['zweryfikowane', 'wniosek_z_klucza'] as const;

export const WITHHELD_STATUS = 'do_weryfikacji';

/** Existing nullable facts. A withheld value stays null instead of being omitted. */
export const NULLABLE_IMPORT_FIELDS = ['ring', 'volva', 'sporePrint'] as const;

const EMPTY_LIST_FIELDS = new Set<string>(['stemFeatures', 'hostTrees']);

const NULLABLE_TOKEN_FIELDS = new Set<string>(['hymenophore', 'sporePrint', 'volva', 'protection']);

function tokensFor(field: string): readonly string[] | null {
  if (Object.prototype.hasOwnProperty.call(ATLAS_TOKEN_VOCAB, field)) {
    return ATLAS_TOKEN_VOCAB[field as AtlasTokenField];
  }
  return null;
}

function isStringToken(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function isTokenArray(value: unknown, allowed: readonly string[], allowEmpty: boolean): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return allowEmpty;
  return value.every((item) => isStringToken(item, allowed));
}

function isRequiredTokens(field: string, value: unknown): boolean {
  const allowed = tokensFor(field);
  if (!allowed) return false;
  return isTokenArray(value, allowed, EMPTY_LIST_FIELDS.has(field));
}

function isNullableTokens(field: string, value: unknown): boolean {
  if (value == null) return true;
  const allowed = tokensFor(field);
  if (!allowed) return false;
  if (typeof value === 'string') return allowed.includes(value);
  return isTokenArray(value, allowed, false);
}

function isCmBound(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function isCapSize(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const size = value as { min?: unknown; max?: unknown };
  const keys = Object.keys(size);
  if (keys.length !== 2 || !keys.includes('min') || !keys.includes('max')) return false;
  if (!isCmBound(size.min) || !isCmBound(size.max)) return false;
  if (size.min == null && size.max == null) return false;
  return typeof size.min !== 'number' || typeof size.max !== 'number' || size.min <= size.max;
}

function knownField(field: string, value: unknown): boolean {
  if (field === 'psychoactive') return typeof value === 'boolean';
  if (field === 'ring') return value === null || typeof value === 'boolean';
  if (field === 'capSizeCm') return isCapSize(value);
  if (NULLABLE_TOKEN_FIELDS.has(field)) return isNullableTokens(field, value);
  if (Object.prototype.hasOwnProperty.call(ATLAS_TOKEN_VOCAB, field)) return isRequiredTokens(field, value);
  return false;
}

/** Field name when a loaded fact is outside the vocabulary, otherwise null. */
export function structureProblem(facts: object): string | null {
  for (const [field, value] of Object.entries(facts)) {
    if (!knownField(field, value)) return field;
  }
  return null;
}
