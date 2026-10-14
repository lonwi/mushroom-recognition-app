import { ATLAS_FILTER_GROUPS, applyAtlasFilters } from '../data/atlasFilterModel';
import factsTable from '../data/atlasFilterFacts.json';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

type CardStatus =
  | 'jadalny'
  | 'jadalny warunkowo'
  | 'niejadalny'
  | 'trujący'
  | 'śmiertelnie trujący'
  | 'NO_ATLAS_VERDICT';

const FACTS = factsTable as Record<
  string,
  {
    status: CardStatus;
    psychoactive: boolean;
    hymenophore: string | null;
    sporePrint: string | readonly string[] | null;
    ring: boolean | null;
    volva: string | null;
    protection: string | null;
  }
>;

function idsOf(rows: { species: { id: string } }[]): string[] {
  return rows.map((row) => row.species.id);
}

function apply(chipIds: string[], query = '') {
  return applyAtlasFilters(MUSHROOMS_DATABASE, { query, chipIds: new Set(chipIds) });
}

function applyStatus(status: string, chipIds: string[]) {
  return applyAtlasFilters(MUSHROOMS_DATABASE, {
    query: '',
    chipIds: new Set(chipIds),
    factsById: () => ({
      status: status as 'jadalny',
      psychoactive: false,
      hymenophore: 'blaszki',
      sporePrint: 'bialy',
      ring: true,
      volva: 'brak',
      protection: 'brak',
    }),
  });
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

  test('maps the five statuses and keeps NO_ATLAS_VERDICT out of every safe kind', () => {
    const edible = applyStatus('jadalny', ['kind-edible']);
    expect(edible.matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(edible.matches.every((row) => row.kind === 'edible' && row.conditionalEdible === false)).toBe(true);

    const conditional = applyStatus('jadalny warunkowo', ['kind-edible']);
    expect(conditional.matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(conditional.matches.every((row) => row.conditionalEdible && row.kind === 'edible')).toBe(true);
    expect(applyStatus('jadalny warunkowo', ['kind-poisonous']).matches).toEqual([]);

    expect(applyStatus('niejadalny', ['kind-inedible']).matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(applyStatus('trujący', ['kind-poisonous']).matches.every((row) => row.kind === 'poisonous')).toBe(true);
    expect(applyStatus('śmiertelnie trujący', ['kind-poisonous']).matches).toHaveLength(MUSHROOMS_DATABASE.length);
    expect(applyStatus('śmiertelnie trujący', ['kind-edible']).matches).toEqual([]);
    expect(applyStatus('śmiertelnie trujący', ['kind-edible']).unverified).toEqual([]);

    for (const chip of ['kind-edible', 'kind-inedible']) {
      const hidden = applyStatus('NO_ATLAS_VERDICT', [chip]);
      expect(hidden.matches).toEqual([]);
      expect(hidden.unverified).toEqual([]);
      expect(hidden.matches.some((row) => row.kind === 'edible' || row.kind === 'inedible')).toBe(false);
    }
    const visible = applyStatus('NO_ATLAS_VERDICT', []);
    expect(visible.matches.every((row) => row.kind == null)).toBe(true);
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
    expect(death?.kind).toBe('poisonous');
    expect(death?.species.status).toBe('DEADLY_POISONOUS');
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
    expect(idsOf(edible.unverified)).toContain('gyromitra_esculenta');
    const honey = edible.matches.find((row) => row.species.id === 'armillaria_mellea');
    expect(honey?.conditionalEdible).toBe(true);
  });

  test('an empty field goes to verification and a known miss disappears from both lists', () => {
    const rings = apply(['ring-present']);
    expect(idsOf(rings.matches)).toContain('macrolepiota_procera');
    expect(idsOf(rings.matches)).not.toContain('boletus_edulis');
    expect(idsOf(rings.unverified)).toContain('boletus_edulis');
    expect(idsOf(rings.matches).concat(idsOf(rings.unverified))).not.toContain('calocybe_gambosa');

    const eitherRing = apply(['ring-present', 'ring-absent']);
    expect(idsOf(eitherRing.matches)).toEqual(expect.arrayContaining(['macrolepiota_procera', 'calocybe_gambosa']));
    expect(idsOf(eitherRing.unverified)).toContain('boletus_edulis');
  });

  test('a multi-value field matches when one token hits', () => {
    const factsById = (id: string) => {
      const facts = FACTS[id];
      if (id === 'boletus_edulis' && facts) {
        return { ...facts, sporePrint: ['rozowy', 'oliwkowobrazowy'] as const };
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
        status: 'jadalny',
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
});
