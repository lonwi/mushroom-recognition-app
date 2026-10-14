import type { MushroomSpecies } from '../types/mushroom';
import table from './atlasFilterFacts.json';

/**
 * Coarse kind for the five source statuses copied from species cards.
 * `NO_ATLAS_VERDICT` has no kind, so it cannot land in a safe chip.
 */
const STATUS = {
  edible: 'jadalny',
  conditional: 'jadalny warunkowo',
  inedible: 'niejadalny',
  poisonous: 'trujący',
  deadly: 'śmiertelnie trujący',
  noVerdict: 'NO_ATLAS_VERDICT',
} as const;

type SourceStatus = (typeof STATUS)[keyof typeof STATUS];

type KindId = 'edible' | 'inedible' | 'poisonous';

const KIND: Record<SourceStatus, KindId | null> = {
  [STATUS.edible]: 'edible',
  [STATUS.conditional]: 'edible',
  [STATUS.inedible]: 'inedible',
  [STATUS.poisonous]: 'poisonous',
  [STATUS.deadly]: 'poisonous',
  [STATUS.noVerdict]: null,
};

type FilterScalar = string | boolean;
type FilterFieldValue = FilterScalar | readonly FilterScalar[] | null;

interface SpeciesFilterFacts {
  status: SourceStatus | null;
  psychoactive: boolean;
  hymenophore: FilterFieldValue;
  sporePrint: FilterFieldValue;
  ring: boolean | null;
  volva: FilterFieldValue;
  protection: FilterFieldValue;
}

const FACTS = table as Readonly<Record<string, SpeciesFilterFacts>>;

type FilterableField = 'status' | 'hymenophore' | 'sporePrint' | 'ring' | 'volva' | 'protection';

type FactsLookup = (speciesId: string) => SpeciesFilterFacts | undefined;

interface FilterChip {
  id: string;
  label: string;
  predicate: (species: MushroomSpecies, facts: FactsLookup) => boolean;
}

interface FilterGroup {
  id: string;
  label: string;
  defined: (species: MushroomSpecies, facts: FactsLookup) => boolean;
  chips: readonly FilterChip[];
}

export interface AtlasRow {
  species: MushroomSpecies;
  /** Coarse kind. Null for a missing status and for `NO_ATLAS_VERDICT`. */
  kind: KindId | null;
  conditionalEdible: boolean;
  psychoactive: boolean;
}

interface AtlasFilterOptions {
  query: string;
  chipIds: ReadonlySet<string>;
  factsById?: FactsLookup;
}

interface AtlasPartition {
  matches: AtlasRow[];
  unverified: AtlasRow[];
}

interface ChipSpec {
  id: string;
  label: string;
  accepted: readonly FilterScalar[];
}

function filterFacts(speciesId: string): SpeciesFilterFacts | undefined {
  return FACTS[speciesId];
}

function kindOf(status: SourceStatus | null): KindId | null {
  if (status == null) return null;
  return KIND[status];
}

function readField(facts: SpeciesFilterFacts | undefined, field: FilterableField): FilterFieldValue | null {
  if (!facts) return null;
  return facts[field];
}

function isPresent(value: FilterFieldValue | null): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** One overlapping value is enough when the field stores several tokens. */
function valueMatches(value: FilterFieldValue | null, accepted: readonly FilterScalar[]): boolean {
  if (!isPresent(value) || value == null) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((item) => accepted.some((candidate) => candidate === item));
}

function fieldChips(groupId: string, field: FilterableField, specs: readonly ChipSpec[]): FilterChip[] {
  return specs.map((spec) => ({
    id: `${groupId}-${spec.id}`,
    label: spec.label,
    predicate: (species, facts) => valueMatches(readField(facts(species.id), field), spec.accepted),
  }));
}

function fieldGroup(
  id: string,
  label: string,
  field: FilterableField,
  specs: readonly ChipSpec[],
): FilterGroup {
  return {
    id,
    label,
    defined: (species, facts) => isPresent(readField(facts(species.id), field)),
    chips: fieldChips(id, field, specs),
  };
}

function statusOf(species: MushroomSpecies, facts: FactsLookup): SourceStatus | null {
  return facts(species.id)?.status ?? null;
}

const SPORE_CHIPS: readonly ChipSpec[] = [
  ['bialy', 'atlas.filters.sporeWhite'],
  ['kremowy', 'atlas.filters.sporeCream'],
  ['zolty', 'atlas.filters.sporeYellow'],
  ['rozowy', 'atlas.filters.sporePink'],
  ['oliwkowobrazowy', 'atlas.filters.sporeOlive'],
  ['brazowy', 'atlas.filters.sporeBrown'],
  ['rdzawobrazowy', 'atlas.filters.sporeRust'],
  ['czekoladowobrazowy', 'atlas.filters.sporeChocolate'],
  ['fioletowobrazowy', 'atlas.filters.sporePurpleBrown'],
  ['fioletowoczarny', 'atlas.filters.sporePurpleBlack'],
  ['czarnobrazowy', 'atlas.filters.sporeBlackBrown'],
].map(([id, label]) => ({ id, label, accepted: [id] }));

/** Stage 1 chips. Months, habitats and host trees are intentionally absent. */
export const ATLAS_FILTER_GROUPS: readonly FilterGroup[] = [
  {
    id: 'kind',
    label: 'atlas.filters.kind',
    defined: (species, facts) => statusOf(species, facts) != null,
    chips: [
      {
        id: 'kind-edible',
        label: 'atlas.filters.edible',
        predicate: (species, facts) => kindOf(statusOf(species, facts)) === 'edible',
      },
      {
        id: 'kind-inedible',
        label: 'atlas.filters.inedible',
        predicate: (species, facts) => kindOf(statusOf(species, facts)) === 'inedible',
      },
      {
        id: 'kind-poisonous',
        label: 'atlas.filters.poisonous',
        predicate: (species, facts) => kindOf(statusOf(species, facts)) === 'poisonous',
      },
    ],
  },
  fieldGroup('hymenophore', 'atlas.filters.hymenophore', 'hymenophore', [
    { id: 'blaszki', label: 'atlas.filters.gills', accepted: ['blaszki'] },
    { id: 'rurki', label: 'atlas.filters.tubes', accepted: ['rurki'] },
    { id: 'listwy', label: 'atlas.filters.folds', accepted: ['listwy'] },
    { id: 'kolce', label: 'atlas.filters.spines', accepted: ['kolce'] },
  ]),
  fieldGroup('spore', 'atlas.filters.spore', 'sporePrint', SPORE_CHIPS),
  fieldGroup('protection', 'atlas.filters.protection', 'protection', [
    { id: 'scisla', label: 'atlas.filters.protectionStrict', accepted: ['scisla'] },
    { id: 'czesciowa', label: 'atlas.filters.protectionPartial', accepted: ['czesciowa'] },
    { id: 'brak', label: 'atlas.filters.protectionNone', accepted: ['brak'] },
  ]),
  fieldGroup('ring', 'atlas.filters.ring', 'ring', [
    { id: 'present', label: 'atlas.filters.ringPresent', accepted: [true] },
    { id: 'absent', label: 'atlas.filters.ringAbsent', accepted: [false] },
  ]),
  fieldGroup('volva', 'atlas.filters.volva', 'volva', [
    { id: 'pochwa', label: 'atlas.filters.volvaVolva', accepted: ['pochwa'] },
    { id: 'bulwa', label: 'atlas.filters.volvaBulb', accepted: ['bulwa'] },
    { id: 'brak', label: 'atlas.filters.volvaNone', accepted: ['brak'] },
  ]),
];

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesSearch(species: MushroomSpecies, query: string): boolean {
  const normalized = normalizeQuery(query);
  if (normalized === '') return true;
  const matches = (value: string) => normalizeQuery(value).includes(normalized);
  return (
    matches(species.namePl) ||
    matches(species.nameLatin) ||
    species.commonNicknames.some((nickname) => matches(nickname))
  );
}

function toRow(species: MushroomSpecies, facts: FactsLookup): AtlasRow {
  const record = facts(species.id);
  const status = record?.status ?? null;
  return {
    species,
    kind: kindOf(status),
    conditionalEdible: status === STATUS.conditional,
    psychoactive: record?.psychoactive === true,
  };
}

function groupOutcome(
  species: MushroomSpecies,
  group: FilterGroup,
  chipIds: ReadonlySet<string>,
  facts: FactsLookup,
): 'skip' | 'match' | 'miss' | 'unverified' {
  const selected = group.chips.filter((chip) => chipIds.has(chip.id));
  if (selected.length === 0) return 'skip';
  if (!group.defined(species, facts)) return 'unverified';
  if (selected.some((chip) => chip.predicate(species, facts))) return 'match';
  return 'miss';
}

function classify(
  species: MushroomSpecies,
  chipIds: ReadonlySet<string>,
  facts: FactsLookup,
): 'match' | 'unverified' | 'out' {
  let open = false;
  for (const group of ATLAS_FILTER_GROUPS) {
    const outcome = groupOutcome(species, group, chipIds, facts);
    if (outcome === 'miss') return 'out';
    if (outcome === 'unverified') open = true;
  }
  return open ? 'unverified' : 'match';
}

export function applyAtlasFilters(
  species: readonly MushroomSpecies[],
  options: AtlasFilterOptions,
): AtlasPartition {
  const facts = options.factsById ?? filterFacts;
  const matches: AtlasRow[] = [];
  const unverified: AtlasRow[] = [];
  for (const item of species) {
    if (!matchesSearch(item, options.query)) continue;
    const row = toRow(item, facts);
    const bucket = classify(item, options.chipIds, facts);
    if (bucket === 'match') matches.push(row);
    else if (bucket === 'unverified') unverified.push(row);
  }
  return { matches, unverified };
}
