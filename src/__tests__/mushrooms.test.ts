/// <reference types="jest" />
import { hasFatalLookAlikeRisk, MUSHROOM_IDS, MUSHROOMS_DATABASE } from '../data/mushrooms';
import { getMushroomImage } from '../utils/mushroomImages';
import { GOLDEN_RULES, TOXICOLOGY_CENTERS } from '../data/safetyRules';

describe('Mushroom Database & Safety Verification', () => {
  test('Database contains valid Central European mushroom species', () => {
    expect(MUSHROOMS_DATABASE.length).toBeGreaterThan(5);
    const bolete = MUSHROOMS_DATABASE.find((m) => m.id === 'boletus_edulis');
    expect(bolete).toBeDefined();
    expect(bolete?.status).toBe('EDIBLE');
    expect(bolete?.hymenophore).toBe('TUBES');
  });

  test('Amanita phalloides is flagged as DEADLY_POISONOUS with fatal look-alikes', () => {
    const deathCap = MUSHROOMS_DATABASE.find((m) => m.id === 'amanita_phalloides');
    expect(deathCap).toBeDefined();
    expect(deathCap?.status).toBe('DEADLY_POISONOUS');
    expect(deathCap?.hymenophore).toBe('GILLS');

    const hasKaniaConfusion = deathCap?.confusionRisks.some(
      (r) => r.confusedWithId === 'macrolepiota_procera' && r.fatal === true
    );
    expect(hasKaniaConfusion).toBe(true);
  });

  test('every look-alike id points at a real species card', () => {
    const dangling: string[] = [];

    for (const species of MUSHROOMS_DATABASE) {
      for (const risk of species.confusionRisks) {
        const target = MUSHROOMS_DATABASE.find((item) => item.id === risk.confusedWithId);
        if (!target) {
          dangling.push(`${species.id} -> ${risk.confusedWithId}`);
          continue;
        }
        expect(risk.confusedWithStatus).toBe(target.status);
        expect(MUSHROOM_IDS.has(risk.confusedWithId)).toBe(true);
      }
    }

    expect(dangling).toEqual([]);
  });

  test('an empty look-alike list is not a sourced all-clear', () => {
    const empty = MUSHROOMS_DATABASE.filter((species) => species.confusionRisks.length === 0);
    expect(empty.map((species) => species.id).sort()).toEqual([
      'amanita_muscaria',
      'paxillus_involutus',
      'suillus_luteus',
    ]);

    for (const species of MUSHROOMS_DATABASE) {
      expect(species.noDangerousLookAlikes).toBeUndefined();
    }

    expect(hasFatalLookAlikeRisk(empty[0])).toBe(false);
  });

  test('fatal look-alike risk follows the recorded flags', () => {
    const kania = MUSHROOMS_DATABASE.find((species) => species.id === 'macrolepiota_procera');
    const paxillus = MUSHROOMS_DATABASE.find((species) => species.id === 'paxillus_involutus');
    const russula = MUSHROOMS_DATABASE.find((species) => species.id === 'russula_virescens');

    expect(kania && hasFatalLookAlikeRisk(kania)).toBe(true);
    expect(paxillus && hasFatalLookAlikeRisk(paxillus)).toBe(false);
    expect(russula && hasFatalLookAlikeRisk(russula)).toBe(true);
  });

  test('minimal look-alike cards do not borrow another species photo', () => {
    const minimalIds = [
      'russula_virescens',
      'agaricus_campestris',
      'chlorophyllum_rhacodes',
      'hygrophoropsis_aurantiaca',
      'lactarius_torminosus',
      'morchella_esculenta',
    ];

    expect(getMushroomImage('boletus_edulis')).toBeTruthy();
    for (const id of minimalIds) {
      expect(MUSHROOMS_DATABASE.some((species) => species.id === id)).toBe(true);
      expect(getMushroomImage(id)).toBeNull();
    }
  });

  test('unfinished edible cards keep their stored status and are marked incomplete', () => {
    for (const id of ['russula_virescens', 'agaricus_campestris', 'morchella_esculenta']) {
      const card = MUSHROOMS_DATABASE.find((species) => species.id === id);
      expect(card?.status).toBe('EDIBLE');
      expect(card?.incompleteCard).toBe(true);
    }

    const shaggy = MUSHROOMS_DATABASE.find((species) => species.id === 'chlorophyllum_rhacodes');
    expect(shaggy?.status).toBe('INEDIBLE');
    expect(shaggy?.incompleteCard).toBeUndefined();
  });

  test('smardz protection note follows the 2014 regulation wording', () => {
    const morel = MUSHROOMS_DATABASE.find((species) => species.id === 'morchella_esculenta');
    const note = morel?.warningNotes ?? '';

    expect(note).toContain('Dz.U. poz. 1408');
    expect(note).toContain(
      'poza terenem ogrodów, upraw ogrodniczych, szkółek leśnych oraz poza terenami zieleni'
    );
    expect(note).toContain('§ 6 ust. 2 pkt 4');
    expect(note).toContain('ręczny zbiór owocników');
    expect(note).toContain('§ 7 pkt 2');
    expect(note).not.toMatch(/w lesie (jest )?zakaz/i);
    expect(note).not.toMatch(/w parku (jest )?dozwol/i);
  });

  test('szatan is not a name for goryczak and borowik szatański is absent', () => {
    const goryczak = MUSHROOMS_DATABASE.find((species) => species.id === 'tylopilus_felleus');
    expect(goryczak).toBeDefined();
    const names = [goryczak?.namePl, goryczak?.nameLatin, ...(goryczak?.commonNicknames ?? [])]
      .join(' ')
      .toLowerCase();
    expect(names).not.toMatch(/szatan/);

    const bolete = MUSHROOMS_DATABASE.find((species) => species.id === 'boletus_edulis');
    const boleteLookalike = bolete?.confusionRisks.find((risk) => risk.confusedWithId === 'tylopilus_felleus');
    expect(boleteLookalike?.confusedWithName).toBe('Goryczak żółciowy');
    expect(boleteLookalike?.confusedWithName.toLowerCase()).not.toMatch(/szatan/);

    expect(
      MUSHROOMS_DATABASE.some((species) => /satana|szatańsk/i.test(`${species.namePl} ${species.nameLatin}`))
    ).toBe(false);
  });

  test('Golden rules and toxicology hotlines are properly configured', () => {
    expect(GOLDEN_RULES.length).toBeGreaterThanOrEqual(4);
    expect(TOXICOLOGY_CENTERS.length).toBeGreaterThanOrEqual(4);

    const warsaw = TOXICOLOGY_CENTERS.find((c) => c.city === 'Warszawa');
    expect(warsaw).toBeDefined();
    expect(warsaw?.phone).toContain('22');
  });
});

describe('Mushroom Classifier Offline Engine', () => {
  test('PlatformReactNative properly validates typed arrays for Hermes/React Native', () => {
    const { PlatformReactNative } = require('../utils/tfjsPlatform');
    const platform = new PlatformReactNative();

    expect(platform.isTypedArray(new Float32Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Int32Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Uint8Array([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray(new Uint8ClampedArray([1, 2, 3]))).toBe(true);
    expect(platform.isTypedArray([1, 2, 3])).toBe(false);
    expect(platform.isTypedArray('not an array')).toBe(false);
    expect(platform.isTypedArray(null)).toBe(false);
  });
});

