import { FEATURE_KEYS } from '../data/atlasFeatureVocab';
import {
  ATLAS_FILTER_FACTS,
  ATLAS_FILTER_GROUPS,
  ATLAS_KIND_GROUP,
  ATLAS_PANEL_GROUPS,
  EVANESCENT_TRAITS,
  activePanelChips,
  applyAtlasFilters,
  evanescentAbsentSelections,
  panelFilterCount,
  visibleAtlasCount,
  withoutChip,
  withoutPanelChips,
} from '../data/atlasFilterModel';
import factsTable from '../data/atlasFilterFacts.json';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

const BASE_FACT_KEYS = ['hymenophore', 'protection', 'psychoactive', 'ring', 'sporePrint', 'volva'];
const FACT_KEYS = [...BASE_FACT_KEYS, ...FEATURE_KEYS].sort();

const UNFINISHED_EDIBLE = [
  'agaricus_campestris',
  'morchella_esculenta',
  'neoboletus_luridiformis',
  'suillus_bovinus',
  'armillaria_mellea',
  'kuehneromyces_mutabilis',
  'calocybe_gambosa',
  'hypholoma_capnoides',
];

function idsOf(rows: { species: { id: string } }[]): string[] {
  return rows.map((row) => row.species.id);
}

function apply(chipIds: string[], query = '') {
  return applyAtlasFilters(MUSHROOMS_DATABASE, { query, chipIds: new Set(chipIds) });
}

/** Species the hold must keep. A missing id here is a gap in the toxic set. */
const EVANESCENT_HOLD_SPECIES = ['amanita_phalloides', 'amanita_virosa', 'galerina_marginata'] as const;

function visibleIds(chipIds: readonly string[]): string[] {
  const result = apply([...chipIds]);
  return idsOf(result.matches).concat(idsOf(result.unverified));
}

function nonEmptyCombinations(ids: readonly string[]): string[][] {
  const combos: string[][] = [];
  const walk = (start: number, picked: string[]): void => {
    if (picked.length > 0) combos.push([...picked]);
    for (let index = start; index < ids.length; index += 1) {
      picked.push(ids[index]);
      walk(index + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return combos;
}

function groupIdOf(chipId: string): string {
  const group = ATLAS_FILTER_GROUPS.find((item) => item.chips.some((chip) => chip.id === chipId));
  if (!group) throw new Error(`Missing atlas chip ${chipId}`);
  return group.id;
}

function listedTokens(value: unknown): readonly (string | boolean)[] {
  if (typeof value === 'string' || typeof value === 'boolean') return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string | boolean => typeof item === 'string' || typeof item === 'boolean');
}

function possessesTrait(speciesId: string, trait: (typeof EVANESCENT_TRAITS)[number]): boolean {
  const facts = ATLAS_FILTER_FACTS[speciesId];
  if (!facts) return false;
  const tokens = listedTokens(facts[trait.field]);
  return tokens.some((token) => trait.present.some((item) => item === token));
}

function chipsThatMatch(speciesId: string): string[] {
  const ids: string[] = [];
  for (const group of ATLAS_FILTER_GROUPS) {
    for (const chip of group.chips) {
      if (idsOf(apply([chip.id]).matches).includes(speciesId)) ids.push(chip.id);
    }
  }
  return ids;
}

function expectTraitHold(
  speciesIds: readonly string[],
  absent: readonly { field: string; chipId: string }[],
): void {
  for (const id of speciesIds) {
    for (const trait of EVANESCENT_TRAITS) {
      if (!possessesTrait(id, trait)) continue;
      const selection = absent.find((item) => item.field === trait.field);
      if (!selection) continue;
      const result = apply([selection.chipId]);
      expect(idsOf(result.unverified)).toContain(id);
      expect(idsOf(result.matches)).not.toContain(id);
    }
  }
}

function expectToxicCombinationsStay(
  toxic: readonly { id: string }[],
  absentIds: readonly string[],
): void {
  const combos = nonEmptyCombinations(absentIds);
  expect(combos.length).toBeGreaterThan(0);
  for (const species of toxic) {
    const matching = chipsThatMatch(species.id);
    for (const combo of combos) {
      expect(visibleIds(combo)).toContain(species.id);
      const blocked = new Set(combo.map((chipId) => groupIdOf(chipId)));
      const others = matching.filter((chipId) => !blocked.has(groupIdOf(chipId)));
      expect(visibleIds([...combo, ...others])).toContain(species.id);
    }
  }
}

describe('atlas filter model', () => {
  test('search matches Polish, Latin, folk names and names without diacritics', () => {
    expect(idsOf(apply([], 'prawdziwek').matches)).toEqual(['boletus_edulis']);
    expect(idsOf(apply([], 'Tylopilus').matches)).toEqual(['tylopilus_felleus']);
    expect(idsOf(apply([], 'Hydnum repandum').matches)).toEqual(['hydnum_repandum']);
    expect(idsOf(apply([], 'zolciowy').matches)).toEqual(['tylopilus_felleus']);
    expect(idsOf(apply([], 'wlokniak ceglasty').matches)).toEqual(['inocybe_erubescens']);
    expect(idsOf(apply([], 'Inocybe erubescens').matches)).toEqual(['inocybe_erubescens']);
    expect(idsOf(apply([], 'czubajnik czerwieniejacy').matches)).toEqual(['chlorophyllum_rhacodes']);
    expect(idsOf(apply([], 'czubajka czerwieniejaca').matches)).toEqual(['chlorophyllum_rhacodes']);
  });

  test('no active chip keeps every card in the matches', () => {
    const result = apply([]);
    expect(result.matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(result.unverified).toEqual([]);
  });

  test('two kind chips use OR and do not produce an empty list', () => {
    const result = apply(['kind-edible', 'kind-inedible']);
    const matched = idsOf(result.matches);
    expect(matched.length).toBeGreaterThan(1);
    expect(matched).toContain('boletus_edulis');
    expect(matched).toContain('tylopilus_felleus');
    expect(matched).not.toContain('amanita_phalloides');
  });

  test('kind and underside combine with AND', () => {
    const result = apply(['kind-edible', 'hymenophore-rurki']);
    const matched = idsOf(result.matches);
    expect(matched).toContain('boletus_edulis');
    expect(matched).not.toContain('amanita_phalloides');
    expect(matched).not.toContain('tylopilus_felleus');
    expect(result.matches.every((row) => row.kind === 'edible')).toBe(true);
    expect(idsOf(result.matches).concat(idsOf(result.unverified))).not.toContain('amanita_phalloides');
  });

  test('every fact key has a card and the loaded row has no status or proposal', () => {
    const cardIds = new Set(MUSHROOMS_DATABASE.map((species) => species.id));
    const factIds = Object.keys(factsTable);
    expect(factIds.length).toBeGreaterThan(0);
    expect(factIds.every((id) => cardIds.has(id))).toBe(true);
    expect(MUSHROOMS_DATABASE.every((species) => factIds.includes(species.id))).toBe(true);
    expect(Object.keys(ATLAS_FILTER_FACTS)).toEqual(factIds);
    for (const facts of Object.values(ATLAS_FILTER_FACTS)) {
      const keys = Object.keys(facts).sort();
      expect(keys.every((key) => FACT_KEYS.includes(key))).toBe(true);
      for (const key of BASE_FACT_KEYS) expect(keys).toContain(key);
      expect(facts).not.toHaveProperty('status');
      expect(facts).not.toHaveProperty('propozycja');
    }
    expect(JSON.stringify(factsTable)).not.toMatch(/"status"|"propozycja"|"rodzaj"/);
  });

  test('edible filter skips unfinished cards', () => {
    const edible = apply(['kind-edible']);
    const unfinished = MUSHROOMS_DATABASE.filter((species) => species.incompleteCard === true);
    expect(unfinished.map((species) => species.id)).toEqual(expect.arrayContaining(UNFINISHED_EDIBLE));
    for (const species of unfinished) {
      expect(idsOf(edible.matches)).not.toContain(species.id);
      expect(idsOf(edible.unverified)).toContain(species.id);
    }
    expect(edible.matches.every((row) => row.kind === 'edible' && row.species.status === 'EDIBLE')).toBe(true);
    expect(edible.matches.some((row) => row.species.incompleteCard === true)).toBe(false);
    expect(idsOf(edible.matches)).toContain('boletus_edulis');
    expect(idsOf(edible.matches).concat(idsOf(edible.unverified))).not.toContain('amanita_phalloides');
  });

  test('kind follows the card status when the fact row is missing', () => {
    const factsById = (id: string) => (id === 'suillus_luteus' ? undefined : ATLAS_FILTER_FACTS[id]);
    const edible = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['kind-edible']),
      factsById,
    });
    expect(idsOf(edible.matches)).toContain('suillus_luteus');
    expect(idsOf(edible.unverified)).not.toContain('suillus_luteus');

    const tubes = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['hymenophore-rurki']),
      factsById,
    });
    expect(idsOf(tubes.matches)).toContain('boletus_edulis');
    expect(idsOf(tubes.matches)).not.toContain('suillus_luteus');
    expect(idsOf(tubes.unverified)).toContain('suillus_luteus');

    const hiddenDeath = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['kind-poisonous']),
      factsById: (id) => (id === 'gyromitra_esculenta' ? undefined : ATLAS_FILTER_FACTS[id]),
    });
    const gyromitra = hiddenDeath.matches.find((row) => row.species.id === 'gyromitra_esculenta');
    expect(gyromitra?.species.status).toBe('DEADLY_POISONOUS');
    expect(idsOf(hiddenDeath.unverified)).not.toContain('gyromitra_esculenta');
    expect(idsOf(apply(['kind-edible']).unverified)).not.toContain('gyromitra_esculenta');
  });

  test('a recorded spore pair matches either color and an unconfirmed shade stays unverified', () => {
    const recorded = apply(['hymenophore-rurki']);
    expect(idsOf(recorded.matches)).toContain('suillus_luteus');
    expect(idsOf(recorded.unverified)).not.toContain('suillus_luteus');

    const white = apply(['spore-bialy']);
    const cream = apply(['spore-kremowy']);
    const yellow = apply(['spore-zolty']);
    expect(idsOf(white.matches)).toContain('russula_virescens');
    expect(idsOf(cream.matches)).toContain('russula_virescens');
    expect(idsOf(yellow.matches).concat(idsOf(yellow.unverified))).not.toContain('russula_virescens');
    expect(idsOf(cream.matches)).not.toContain('hygrophoropsis_aurantiaca');
    expect(idsOf(cream.unverified)).toContain('hygrophoropsis_aurantiaca');
  });

  test('volva remnants on a bulb match both the volva chip and the bulb chip', () => {
    const bulb = apply(['volva-bulwa']);
    const sheath = apply(['volva-pochwa']);
    const neither = apply(['volva-brak']);
    expect(idsOf(bulb.matches)).toContain('amanita_rubescens');
    expect(idsOf(sheath.matches)).toContain('amanita_rubescens');
    expect(idsOf(neither.matches).concat(idsOf(neither.unverified))).not.toContain('amanita_rubescens');
    expect(idsOf(neither.matches)).not.toContain('amanita_citrina');
    expect(idsOf(neither.unverified)).toContain('amanita_citrina');
    expect(ATLAS_FILTER_FACTS.amanita_rubescens?.volva).toBe('bulwa');
    expect(ATLAS_FILTER_FACTS.amanita_citrina?.volva).toBe('bulwa');
  });

  test('death cap and destroying angel keep a ring, a volva and a white spore print', () => {
    for (const id of ['amanita_phalloides', 'amanita_virosa'] as const) {
      expect(ATLAS_FILTER_FACTS[id]?.ring).toBe(true);
      expect(ATLAS_FILTER_FACTS[id]?.volva).toBe('pochwa');
      expect(ATLAS_FILTER_FACTS[id]?.sporePrint).toBe('bialy');
    }
    const sheath = idsOf(apply(['volva-pochwa']).matches);
    expect(sheath).toEqual(
      expect.arrayContaining(['amanita_phalloides', 'amanita_virosa', 'amanita_citrina', 'amanita_rubescens']),
    );
    expect(ATLAS_FILTER_FACTS.hypholoma_capnoides?.ring).toBe(false);
    expect(ATLAS_FILTER_FACTS.hypholoma_fasciculare?.ring).toBe(false);
    expect(ATLAS_FILTER_FACTS.hypholoma_capnoides?.stemFeatures).toEqual(expect.arrayContaining(['wlokna_zasnowki']));
    expect(ATLAS_FILTER_FACTS.hypholoma_fasciculare?.stemFeatures).toEqual(
      expect.arrayContaining(['wlokna_zasnowki']),
    );
  });

  test('there is no non-poisonous chip and deadly cards keep their own status', () => {
    const chipIds = ATLAS_FILTER_GROUPS.flatMap((group) => group.chips.map((chip) => chip.id));
    expect(ATLAS_FILTER_GROUPS.map((group) => group.id)).toEqual([
      'kind',
      'hymenophore',
      'spore',
      'protection',
      'ring',
      'volva',
    ]);
    expect(chipIds.some((id) => /nietruj|non-poison|nonpoison|kind-safe|kind-deadly/i.test(id))).toBe(false);
    expect(JSON.stringify(pl.atlas.filters)).not.toMatch(/nietruj/i);
    expect(JSON.stringify(en.atlas.filters)).not.toMatch(/non-poison|nonpoisonous/i);

    const poisonous = apply(['kind-poisonous']);
    const death = poisonous.matches.find((row) => row.species.id === 'amanita_phalloides');
    const paxillus = poisonous.matches.find((row) => row.species.id === 'paxillus_involutus');
    expect(death?.kind).toBe('poisonous');
    expect(death?.species.status).toBe('DEADLY_POISONOUS');
    expect(paxillus?.kind).toBe('poisonous');
    expect(paxillus?.species.status).toBe('DEADLY_POISONOUS');
    const fly = poisonous.matches.find((row) => row.species.id === 'amanita_muscaria');
    const panther = poisonous.matches.find((row) => row.species.id === 'amanita_pantherina');
    expect(fly?.psychoactive).toBe(true);
    expect(panther?.psychoactive).toBe(true);
    expect(fly?.kind).toBe('poisonous');
  });

  test('edible matches stay free of poisonous cards, including a deadly card with no filter row', () => {
    const edible = apply(['kind-edible']);
    expect(edible.matches.every((row) => row.kind === 'edible')).toBe(true);
    expect(edible.matches.some((row) => row.species.status === 'POISONOUS' || row.species.status === 'DEADLY_POISONOUS')).toBe(false);
    expect(idsOf(edible.matches).concat(idsOf(edible.unverified))).not.toContain('amanita_phalloides');
    expect(idsOf(edible.matches)).not.toContain('gyromitra_esculenta');
    expect(idsOf(edible.unverified)).not.toContain('gyromitra_esculenta');
    expect(idsOf(edible.matches)).not.toContain('armillaria_mellea');
    expect(idsOf(edible.unverified)).toContain('armillaria_mellea');
  });

  test('an empty field goes to verification and a known miss disappears from both lists', () => {
    const rings = apply(['ring-present']);
    expect(idsOf(rings.matches)).toContain('macrolepiota_procera');
    expect(idsOf(rings.matches)).not.toContain('cortinarius_orellanus');
    expect(idsOf(rings.unverified)).toContain('cortinarius_orellanus');
    expect(idsOf(rings.matches).concat(idsOf(rings.unverified))).not.toContain('calocybe_gambosa');
    expect(idsOf(rings.matches).concat(idsOf(rings.unverified))).not.toContain('boletus_edulis');

    const eitherRing = apply(['ring-present', 'ring-absent']);
    expect(idsOf(eitherRing.matches)).toEqual(
      expect.arrayContaining(['macrolepiota_procera', 'calocybe_gambosa', 'boletus_edulis']),
    );
    expect(idsOf(eitherRing.unverified)).toContain('cortinarius_orellanus');
  });

  test('a multi-value field matches when one token hits', () => {
    const factsById = (id: string) => {
      const facts = ATLAS_FILTER_FACTS[id];
      if (id === 'boletus_edulis' && facts) {
        return {
          psychoactive: facts.psychoactive,
          hymenophore: facts.hymenophore,
          sporePrint: ['rozowy', 'oliwkowobrazowy'] as const,
          ring: facts.ring,
          volva: facts.volva,
          protection: facts.protection,
        };
      }
      return facts;
    };
    const pink = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['spore-rozowy']),
      factsById,
    });
    expect(idsOf(pink.matches)).toContain('boletus_edulis');

    const yellow = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['spore-zolty']),
      factsById,
    });
    expect(idsOf(yellow.matches).concat(idsOf(yellow.unverified))).not.toContain('boletus_edulis');

    const empty = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: '',
      chipIds: new Set(['spore-bialy']),
      factsById: () => ({
        psychoactive: false,
        hymenophore: 'blaszki',
        sporePrint: [],
        ring: true,
        volva: 'brak',
        protection: 'brak',
      }),
    });
    expect(empty.matches).toEqual([]);
    expect(empty.unverified).toHaveLength(MUSHROOMS_DATABASE.length);
  });

  test('panel counter ignores kind chips, clear keeps them, and one removal changes the result count', () => {
    expect(ATLAS_KIND_GROUP.id).toBe('kind');
    expect(ATLAS_PANEL_GROUPS.map((group) => group.id)).toEqual([
      'hymenophore',
      'spore',
      'protection',
      'ring',
      'volva',
    ]);
    const selected = new Set(['kind-edible', 'kind-poisonous', 'hymenophore-kolce', 'ring-present']);
    expect(panelFilterCount(selected)).toBe(2);
    expect(panelFilterCount(new Set(['kind-poisonous']))).toBe(0);
    expect(activePanelChips(selected).map((chip) => chip.id)).toEqual(['hymenophore-kolce', 'ring-present']);
    expect(activePanelChips(new Set(['protection-brak', 'volva-brak']))).toEqual([
      { id: 'protection-brak', group: 'atlas.filters.protection', label: 'atlas.filters.protectionNone' },
      { id: 'volva-brak', group: 'atlas.filters.volva', label: 'atlas.filters.volvaNone' },
    ]);

    const spines = apply(['kind-edible', 'hymenophore-kolce', 'ring-present']);
    const oneLess = withoutChip(selected, 'hymenophore-kolce');
    expect(panelFilterCount(oneLess)).toBe(1);
    expect(activePanelChips(oneLess).map((chip) => chip.id)).toEqual(['ring-present']);
    expect(withoutChip(oneLess, 'hymenophore-kolce')).toBe(oneLess);
    const rings = applyAtlasFilters(MUSHROOMS_DATABASE, { query: '', chipIds: oneLess });
    expect(rings.matches.length).toBeGreaterThan(spines.matches.length);

    const cleared = withoutPanelChips(oneLess);
    expect([...cleared]).toEqual(['kind-edible', 'kind-poisonous']);
    expect(panelFilterCount(cleared)).toBe(0);
    const kinds = applyAtlasFilters(MUSHROOMS_DATABASE, { query: '', chipIds: cleared });
    expect(idsOf(kinds.matches)).toContain('amanita_phalloides');
    expect(idsOf(kinds.matches)).toContain('boletus_edulis');
    expect(kinds.matches.every((row) => row.kind === 'edible' || row.kind === 'poisonous')).toBe(true);
  });

  test('deselecting kind chips never hides poisonous mushrooms', () => {
    const edible = apply(['kind-edible']);
    expect(idsOf(edible.matches)).not.toContain('amanita_phalloides');
    expect(edible.matches.some((row) => row.kind === 'poisonous')).toBe(false);

    const typesOff = withoutChip(new Set(['kind-edible']), 'kind-edible');
    expect([...typesOff]).toEqual([]);
    const all = applyAtlasFilters(MUSHROOMS_DATABASE, { query: '', chipIds: typesOff });
    expect(all.matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(idsOf(all.matches)).toContain('amanita_phalloides');
    expect(idsOf(all.matches)).toContain('gyromitra_esculenta');
    expect(all.matches.some((row) => row.species.status === 'POISONOUS' || row.species.status === 'DEADLY_POISONOUS')).toBe(true);

    const panelOnly = apply(['hymenophore-blaszki']);
    const panelCleared = withoutPanelChips(new Set(['hymenophore-blaszki']));
    expect(panelFilterCount(panelCleared)).toBe(0);
    const restored = applyAtlasFilters(MUSHROOMS_DATABASE, { query: '', chipIds: panelCleared });
    expect(restored.matches.length).toBeGreaterThan(panelOnly.matches.length);
    expect(idsOf(restored.matches)).toContain('amanita_phalloides');
    expect(idsOf(restored.matches)).toContain('boletus_edulis');
  });

  test('absence chips for traits that can disappear keep toxic species visible', () => {
    const toxic = MUSHROOMS_DATABASE.filter(
      (species) => species.status === 'POISONOUS' || species.status === 'DEADLY_POISONOUS',
    );
    expect(toxic.length).toBeGreaterThan(EVANESCENT_HOLD_SPECIES.length);
    expect(EVANESCENT_TRAITS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'volva', present: ['pochwa', 'bulwa'], absent: ['brak'] }),
        expect.objectContaining({ field: 'ring', present: [true], absent: [false] }),
        expect.objectContaining({ field: 'stemFeatures', present: ['wlokna_zasnowki'], absent: ['brak'] }),
      ]),
    );

    const absent = evanescentAbsentSelections();
    expect(absent.map((item) => item.chipId)).toEqual(expect.arrayContaining(['ring-absent', 'volva-brak']));
    for (const id of EVANESCENT_HOLD_SPECIES) {
      expect(toxic.map((species) => species.id)).toContain(id);
      expect(EVANESCENT_TRAITS.some((trait) => possessesTrait(id, trait))).toBe(true);
    }

    expectTraitHold(EVANESCENT_HOLD_SPECIES, absent);
    expectToxicCombinationsStay(toxic, absent.map((item) => item.chipId));
    expect(visibleIds(['ring-absent'])).not.toContain('amanita_rubescens');
    expect(visibleIds(['volva-brak'])).not.toContain('amanita_rubescens');
    expect(idsOf(apply(['volva-pochwa', 'volva-brak']).matches)).toContain('amanita_phalloides');
    expect(idsOf(apply(['ring-present', 'ring-absent']).matches)).toContain('galerina_marginata');
  });

  test('the show count includes unverified cards that stay on the list', () => {
    const yellow = apply(['spore-zolty']);
    expect(yellow.matches).toHaveLength(0);
    expect(yellow.unverified.length).toBeGreaterThan(1);
    expect(visibleAtlasCount(yellow)).toBe(yellow.unverified.length);
    expect(visibleAtlasCount(yellow)).toBeGreaterThan(0);

    const edible = apply(['kind-edible']);
    expect(visibleAtlasCount(edible)).toBe(edible.matches.length + edible.unverified.length);
    expect(visibleAtlasCount(edible)).toBeGreaterThan(edible.matches.length);
    expect(idsOf(edible.matches).concat(idsOf(edible.unverified))).not.toContain('amanita_phalloides');

    const all = apply([]);
    expect(visibleAtlasCount(all)).toBe(MUSHROOMS_DATABASE.length);
    expect(all.unverified).toHaveLength(0);
  });
});
