import type { EdibilityStatus, MushroomSpecies } from '../types/mushroom';
import {
  FEATURE_KEYS,
  structureProblem,
  type AtlasFeatureFields,
} from './atlasFeatureVocab';
import table from './atlasFilterFacts.json';
import { POISONOUS_MISS_ALLOWLIST } from './poisonousMissAllowlist';

type SpeciesId = MushroomSpecies['id'];

type KindId = 'edible' | 'inedible' | 'poisonous';

/** Card status is the only source of kind. Deadly stays inside poisonous. */
const KIND_FROM_STATUS: Record<EdibilityStatus, KindId> = {
  EDIBLE: 'edible',
  INEDIBLE: 'inedible',
  POISONOUS: 'poisonous',
  DEADLY_POISONOUS: 'poisonous',
};

type FilterScalar = string | boolean;
type FilterFieldValue = FilterScalar | readonly FilterScalar[] | null;

/**
 * Morphological facts only. `status` and `propozycja` are not fields:
 * a second copy of either key fails the assignment below.
 */
export interface StructureFacts extends AtlasFeatureFields {
  psychoactive: boolean;
  hymenophore: FilterFieldValue;
  sporePrint: FilterFieldValue;
  ring: boolean | null;
  volva: FilterFieldValue;
  protection: FilterFieldValue;
}

type ForbiddenFactKey = 'status' | 'propozycja' | 'rodzaj';
type Assert<T extends true> = T;
type _FactsExcludeStatusAndProposal = Assert<
  [ForbiddenFactKey] extends [Exclude<ForbiddenFactKey, keyof StructureFacts>] ? true : never
>;

interface ImportedFact extends AtlasFeatureFields {
  psychoactive: boolean;
  hymenophore: string | null;
  sporePrint: string | readonly string[] | null;
  ring: boolean | null;
  volva: string | readonly string[] | null;
  protection: string | null;
}

type FactsLookup = (speciesId: string) => StructureFacts | undefined;

interface FilterChip {
  id: string;
  label: string;
  predicate: (species: MushroomSpecies, facts: FactsLookup) => boolean;
  /** A non-match that stays visible under "Do weryfikacji". */
  hold?: (species: MushroomSpecies) => boolean;
  /** Fact key this chip reads. Kind chips leave it unset. */
  field?: string;
  accepted?: readonly FilterScalar[];
}

interface FilterGroup {
  id: string;
  label: string;
  defined: (species: MushroomSpecies, facts: FactsLookup) => boolean;
  chips: readonly FilterChip[];
}

export interface AtlasRow {
  species: MushroomSpecies;
  /** Coarse kind taken from `species.status`. */
  kind: KindId;
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

/** Copies known feature keys only. A spread would let `status` or `propozycja` through. */
function copyFeatures(raw: AtlasFeatureFields, facts: StructureFacts): void {
  for (const key of FEATURE_KEYS) {
    if (raw[key] !== undefined) {
      Object.assign(facts, { [key]: raw[key] });
    }
  }
}

/** Copies only structure fields. A spread would let `status` or `propozycja` through. */
function structureFacts(raw: ImportedFact): StructureFacts {
  const facts: StructureFacts = {
    psychoactive: raw.psychoactive,
    hymenophore: raw.hymenophore,
    sporePrint: raw.sporePrint,
    ring: raw.ring,
    volva: raw.volva,
    protection: raw.protection,
  };
  copyFeatures(raw, facts);
  return facts;
}

/** `true` stops compiling if StructureFacts grows status, propozycja, or rodzaj. */
const FACT_SHAPE_OK: _FactsExcludeStatusAndProposal = true;

function loadFacts(
  source: Readonly<Record<string, ImportedFact>>,
): Readonly<Record<SpeciesId, StructureFacts>> {
  const facts: Record<SpeciesId, StructureFacts> = {};
  if (!FACT_SHAPE_OK) return facts;
  for (const id of Object.keys(source)) {
    const row = structureFacts(source[id]);
    const problem = structureProblem(row);
    if (problem) {
      throw new Error(`Invalid atlas fact ${id}.${problem}`);
    }
    facts[id] = row;
  }
  return facts;
}

export const ATLAS_FILTER_FACTS = loadFacts(table) satisfies Readonly<Record<SpeciesId, StructureFacts>>;

function filterFacts(speciesId: string): StructureFacts | undefined {
  return ATLAS_FILTER_FACTS[speciesId];
}

function kindOf(species: MushroomSpecies): KindId {
  return KIND_FROM_STATUS[species.status];
}

function unfinishedEdible(species: MushroomSpecies): boolean {
  return species.status === 'EDIBLE' && species.incompleteCard === true;
}

function readField(facts: StructureFacts | undefined, field: string): FilterFieldValue | null {
  if (!facts) return null;
  return readTraitValue(facts, field);
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

function fieldChips(groupId: string, field: string, specs: readonly ChipSpec[]): FilterChip[] {
  return specs.map((spec) => ({
    id: `${groupId}-${spec.id}`,
    label: spec.label,
    field,
    accepted: spec.accepted,
    predicate: (species, facts) => valueMatches(readField(facts(species.id), field), spec.accepted),
  }));
}

function fieldGroup(
  id: string,
  label: string,
  field: string,
  specs: readonly ChipSpec[],
): FilterGroup {
  return {
    id,
    label,
    defined: (species, facts) => isPresent(readField(facts(species.id), field)),
    chips: fieldChips(id, field, specs),
  };
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

const RING = 'ring';
const VOLVA = 'volva';
const STEM_FEATURES = 'stemFeatures';
const BRAK = 'brak';
const BULWA = 'bulwa';
const POCHWA = 'pochwa';
const CORTINA = 'wlokna_zasnowki';

/**
 * Traits a specimen can lose before it is examined. One row is the whole rule:
 * a poisonous or deadly species that still has the trait stays under
 * "Do weryfikacji" when the user picks that field's absence chip.
 */
export const EVANESCENT_TRAITS: readonly {
  field: typeof VOLVA | typeof RING | typeof STEM_FEATURES;
  present: readonly FilterScalar[];
  absent: readonly FilterScalar[];
}[] = [
  { field: VOLVA, present: [POCHWA, BULWA], absent: [BRAK] },
  { field: RING, present: [true], absent: [false] },
  { field: STEM_FEATURES, present: [CORTINA], absent: [BRAK] },
];

type EvanescentTrait = (typeof EVANESCENT_TRAITS)[number];

/**
 * Subjective or age- and weather-dependent facts. A contradicting chip on one
 * of these holds a poisonous species. Cap shape opens with age, stem colour
 * washes out, taste is withheld for toxic species, and latex shows only after
 * a cut.
 */
export const VARIABLE_TRAITS = [
  'capSizeCm',
  'capColor',
  'capShape',
  'stemColor',
  'smell',
  'taste',
  'fleshDiscoloration',
  'latex',
] as const;

/** A defined contradiction here may remove a poisonous species from both sections. */
export const POISONOUS_STRUCTURAL_FIELDS = ['hymenophore', 'sporePrint'] as const;

const VARIABLE_TRAIT_FIELDS = new Set<string>(VARIABLE_TRAITS);
const STRUCTURAL_MISS_FIELDS = new Set<string>(POISONOUS_STRUCTURAL_FIELDS);

/** Stage 1 chips. Months, habitats and host trees are intentionally absent. */
export const ATLAS_FILTER_GROUPS: readonly FilterGroup[] = [
  {
    id: 'kind',
    label: 'atlas.filters.kind',
    defined: () => true,
    chips: [
      {
        id: 'kind-edible',
        label: 'atlas.filters.edible',
        predicate: (species) => kindOf(species) === 'edible' && !unfinishedEdible(species),
        hold: unfinishedEdible,
      },
      {
        id: 'kind-inedible',
        label: 'atlas.filters.inedible',
        predicate: (species) => kindOf(species) === 'inedible',
      },
      {
        id: 'kind-poisonous',
        label: 'atlas.filters.poisonous',
        predicate: (species) => kindOf(species) === 'poisonous',
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
    { id: BRAK, label: 'atlas.filters.protectionNone', accepted: [BRAK] },
  ]),
  fieldGroup(RING, 'atlas.filters.ring', RING, [
    { id: 'present', label: 'atlas.filters.ringPresent', accepted: [true] },
    { id: 'absent', label: 'atlas.filters.ringAbsent', accepted: [false] },
  ]),
  fieldGroup(VOLVA, 'atlas.filters.volva', VOLVA, [
    // A bulb is not a volva, and a volva left in the soil looks like a bulb.
    // Both chips accept both tokens, so the death cap stays with citrina and rubescens.
    { id: POCHWA, label: 'atlas.filters.volvaVolva', accepted: [POCHWA, BULWA] },
    { id: BULWA, label: 'atlas.filters.volvaBulb', accepted: [BULWA, POCHWA] },
    { id: BRAK, label: 'atlas.filters.volvaNone', accepted: [BRAK] },
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
  return {
    species,
    kind: kindOf(species),
    psychoactive: facts(species.id)?.psychoactive === true,
  };
}

function scalarValue(value: unknown): FilterFieldValue | null {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (!Array.isArray(value)) return null;
  const scalars: FilterScalar[] = [];
  for (const item of value) {
    if (typeof item !== 'string' && typeof item !== 'boolean') return null;
    scalars.push(item);
  }
  return scalars.length > 0 ? scalars : null;
}

/** Reads any fact key, so a new `EVANESCENT_TRAITS` row needs no field switch. */
function readTraitValue(facts: StructureFacts, field: string): FilterFieldValue | null {
  for (const [key, value] of Object.entries(facts)) {
    if (key === field) return scalarValue(value);
  }
  return null;
}

function marksAbsent(chip: FilterChip, trait: EvanescentTrait): boolean {
  if (chip.field !== trait.field || chip.accepted == null || chip.accepted.length === 0) return false;
  return chip.accepted.every((value) => trait.absent.some((token) => token === value));
}

function hasPresentTrait(row: StructureFacts, trait: EvanescentTrait): boolean {
  return valueMatches(readTraitValue(row, trait.field), trait.present);
}

function toxicSpecies(species: MushroomSpecies): boolean {
  return species.status === 'POISONOUS' || species.status === 'DEADLY_POISONOUS';
}

function missAllowlisted(speciesId: string, chipId: string): boolean {
  return POISONOUS_MISS_ALLOWLIST.some((pair) => pair.speciesId === speciesId && pair.chipId === chipId);
}

function onListedField(selected: readonly FilterChip[], fields: ReadonlySet<string>): boolean {
  return selected.some((chip) => chip.field != null && fields.has(chip.field));
}

/** Poisonous contradictions outside structure and the allowlist stay visible. */
function contradictoryPoisonousHolds(species: MushroomSpecies, selected: readonly FilterChip[]): boolean {
  if (!toxicSpecies(species)) return false;
  if (onListedField(selected, VARIABLE_TRAIT_FIELDS)) return true;
  if (onListedField(selected, STRUCTURAL_MISS_FIELDS)) return false;
  return !selected.every((chip) => missAllowlisted(species.id, chip.id));
}

function evanescentHold(
  species: MushroomSpecies,
  selected: readonly FilterChip[],
  facts: FactsLookup,
): boolean {
  if (!toxicSpecies(species)) return false;
  const row = facts(species.id);
  if (!row) return false;
  return EVANESCENT_TRAITS.some(
    (trait) => selected.some((chip) => marksAbsent(chip, trait)) && hasPresentTrait(row, trait),
  );
}

/** Absence chips that the map already covers. A new row shows up here on its own. */
export function evanescentAbsentSelections(): readonly { field: string; chipId: string }[] {
  const found: { field: string; chipId: string }[] = [];
  for (const trait of EVANESCENT_TRAITS) {
    for (const group of ATLAS_FILTER_GROUPS) {
      for (const chip of group.chips) {
        if (marksAbsent(chip, trait)) found.push({ field: trait.field, chipId: chip.id });
      }
    }
  }
  return found;
}

function groupOutcome(
  species: MushroomSpecies,
  group: FilterGroup,
  chipIds: ReadonlySet<string>,
  facts: FactsLookup,
): 'skip' | 'match' | 'miss' | 'unverified' {
  const selected = group.chips.filter((chip) => chipIds.has(chip.id));
  if (selected.length === 0) return 'skip';
  if (selected.some((chip) => chip.predicate(species, facts))) return 'match';
  if (selected.some((chip) => chip.hold?.(species) === true)) return 'unverified';
  if (evanescentHold(species, selected, facts)) return 'unverified';
  if (!group.defined(species, facts)) return 'unverified';
  if (contradictoryPoisonousHolds(species, selected)) return 'unverified';
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

function groupById(id: string): FilterGroup {
  const group = ATLAS_FILTER_GROUPS.find((item) => item.id === id);
  if (!group) {
    throw new Error(`Missing atlas filter group ${id}`);
  }
  return group;
}

/** Kind stays in the top row. The other stage-1 groups open from the sheet. */
export const ATLAS_KIND_GROUP = groupById('kind');

export const ATLAS_PANEL_GROUPS: readonly FilterGroup[] = [
  groupById('hymenophore'),
  groupById('spore'),
  groupById('protection'),
  groupById(RING),
  groupById(VOLVA),
];

const PANEL_CHIP_IDS = new Set(
  ATLAS_PANEL_GROUPS.flatMap((group) => group.chips.map((chip) => chip.id)),
);

interface ActivePanelChip {
  id: string;
  /** i18n key of the group, so two chips that share a value stay distinct. */
  group: string;
  label: string;
}

export function activePanelChips(chipIds: ReadonlySet<string>): readonly ActivePanelChip[] {
  const selected: ActivePanelChip[] = [];
  for (const group of ATLAS_PANEL_GROUPS) {
    for (const chip of group.chips) {
      if (chipIds.has(chip.id)) selected.push({ id: chip.id, group: group.label, label: chip.label });
    }
  }
  return selected;
}

/** Cards still on the list after the sheet closes: matches plus the unverified section. */
export function visibleAtlasCount(partition: AtlasPartition): number {
  return partition.matches.length + partition.unverified.length;
}

/** How many sheet chips are on. Kind chips and „Do weryfikacji” are not in this count. */
export function panelFilterCount(chipIds: ReadonlySet<string>): number {
  let count = 0;
  for (const id of chipIds) {
    if (PANEL_CHIP_IDS.has(id)) count += 1;
  }
  return count;
}

/** Drops sheet chips and keeps kind chips. Matching rules are unchanged. */
export function withoutPanelChips(chipIds: ReadonlySet<string>): ReadonlySet<string> {
  const next = new Set<string>();
  for (const id of chipIds) {
    if (!PANEL_CHIP_IDS.has(id)) next.add(id);
  }
  return next;
}

/** Removes one chip. The same set comes back when that chip was already off. */
export function withoutChip(chipIds: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!chipIds.has(id)) return chipIds;
  const next = new Set(chipIds);
  next.delete(id);
  return next;
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
