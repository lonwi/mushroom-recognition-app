import { countByStatus, filterAtlasSpecies } from '../data/atlasQuery';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';

describe('atlas filters', () => {
  test('search matches Polish, Latin and folk names', () => {
    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'prawdziwek',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['boletus_edulis']);

    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'Tylopilus',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['tylopilus_felleus']);

    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'Hydnum repandum',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['hydnum_repandum']);
  });

  test('edibility and underside filters combine, and spines are a real class', () => {
    const edibleTubes = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'EDIBLE',
      hymenophore: 'TUBES',
    });
    expect(edibleTubes.some((species) => species.id === 'boletus_edulis')).toBe(true);
    expect(edibleTubes.some((species) => species.id === 'amanita_phalloides')).toBe(false);
    expect(edibleTubes.every((species) => species.status === 'EDIBLE' && species.hymenophore === 'TUBES')).toBe(true);

    const gills = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'ALL',
      hymenophore: 'GILLS',
    });
    expect(gills.length).toBeGreaterThan(0);
    expect(gills.every((species) => species.hymenophore === 'GILLS')).toBe(true);
    expect(gills.some((species) => species.status === 'EDIBLE')).toBe(true);
    expect(gills.some((species) => species.status === 'DEADLY_POISONOUS')).toBe(true);

    const edibleGills = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'EDIBLE',
      hymenophore: 'GILLS',
    });
    expect(edibleGills.every((species) => species.status === 'EDIBLE' && species.hymenophore === 'GILLS')).toBe(true);
    expect(edibleGills.some((species) => species.id === 'amanita_phalloides')).toBe(false);

    const spines = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'ALL',
      hymenophore: 'SPINES',
    });
    expect(spines.map((species) => species.id)).toEqual(['hydnum_repandum']);

    const deadlySpines = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'DEADLY_POISONOUS',
      hymenophore: 'SPINES',
    });
    expect(deadlySpines).toEqual([]);

    const counts = countByStatus(MUSHROOMS_DATABASE);
    expect(counts.ALL).toBe(MUSHROOMS_DATABASE.length);
    expect(
      counts.EDIBLE + counts.INCOMPLETE + counts.INEDIBLE + counts.POISONOUS + counts.DEADLY_POISONOUS
    ).toBe(counts.ALL);
    expect(counts.INEDIBLE).toBeGreaterThan(0);
    expect(counts.POISONOUS).toBeGreaterThan(0);
    expect(counts.DEADLY_POISONOUS).toBeGreaterThan(0);
  });

  test('search matches Polish names without diacritics', () => {
    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'zolciowy',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['tylopilus_felleus']);

    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'wlokniak ceglasty',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['inocybe_erubescens']);

    expect(filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: 'Inocybe erubescens',
      status: 'ALL',
      hymenophore: 'ALL',
    }).map((species) => species.id)).toEqual(['inocybe_erubescens']);
  });

  test('the edible filter skips unfinished cards and the incomplete chip lists them', () => {
    const unfinishedIds = [
      'agaricus_campestris',
      'armillaria_mellea',
      'hydnum_repandum',
      'kuehneromyces_mutabilis',
      'leccinum_aurantiacum',
      'morchella_esculenta',
      'neoboletus_luridiformis',
      'russula_virescens',
      'suillus_bovinus',
      'suillus_grevillei',
      'suillus_variegatus',
      'xerocomellus_chrysenteron',
      'xerocomus_subtomentosus',
    ];
    const unfinished = MUSHROOMS_DATABASE.filter((species) => species.incompleteCard === true)
      .map((species) => species.id)
      .sort();
    expect(unfinished).toEqual(unfinishedIds);

    const edible = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'EDIBLE',
      hymenophore: 'ALL',
    });
    expect(edible.every((species) => species.status === 'EDIBLE' && species.incompleteCard !== true)).toBe(true);
    for (const id of unfinishedIds) {
      expect(edible.some((species) => species.id === id)).toBe(false);
    }

    const incomplete = filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: '',
      status: 'INCOMPLETE',
      hymenophore: 'ALL',
    });
    expect(incomplete.map((species) => species.id).sort()).toEqual(unfinishedIds);

    const counts = countByStatus(MUSHROOMS_DATABASE);
    expect(counts.EDIBLE).toBe(edible.length);
    expect(counts.INCOMPLETE).toBe(unfinishedIds.length);
    expect(counts.EDIBLE).toBeLessThan(
      MUSHROOMS_DATABASE.filter((species) => species.status === 'EDIBLE').length
    );
  });
});
