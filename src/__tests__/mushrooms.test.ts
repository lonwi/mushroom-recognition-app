/// <reference types="jest" />
import {
  ATLAS_NO_VERDICT_NOTE,
  hasFatalLookAlikeRisk,
  LOOKALIKES_WITHOUT_CARD,
  MUSHROOM_IDS,
  MUSHROOMS_DATABASE,
  NOT_FOR_COLLECTION_NOTE,
  showsKitchenSection,
} from '../data/mushrooms';
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
      (r) => r.confusedWithId === 'macrolepiota_procera' && r.fatal === false
    );
    expect(hasKaniaConfusion).toBe(true);

    const kania = MUSHROOMS_DATABASE.find((m) => m.id === 'macrolepiota_procera');
    const kaniaFlagsDeathCap = kania?.confusionRisks.some(
      (r) => r.confusedWithId === 'amanita_phalloides' && r.fatal === true
    );
    expect(kaniaFlagsDeathCap).toBe(true);
  });

  test('every look-alike id points at a real species card or a closed list', () => {
    const dangling: string[] = [];

    for (const species of MUSHROOMS_DATABASE) {
      for (const risk of species.confusionRisks) {
        const target = MUSHROOMS_DATABASE.find((item) => item.id === risk.confusedWithId);
        if (!target) {
          const allowed = LOOKALIKES_WITHOUT_CARD[risk.confusedWithId];
          if (!allowed) {
            dangling.push(`${species.id} -> ${risk.confusedWithId}`);
            continue;
          }
          expect(risk.confusedWithStatus).toBe(allowed.status);
          if (allowed.status === 'NO_ATLAS_VERDICT') {
            expect(allowed.note).toBe(
              risk.confusedWithId === 'amanita_excelsa' ? NOT_FOR_COLLECTION_NOTE : ATLAS_NO_VERDICT_NOTE,
            );
          } else {
            expect(allowed.status).toBe('POISONOUS');
            expect(risk.fatal).toBe(false);
            expect(allowed.note).toBe(ATLAS_NO_VERDICT_NOTE);
          }
          expect(allowed.reason.trim().length).toBeGreaterThan(0);
          continue;
        }
        expect(risk.confusedWithStatus).toBe(target.status);
        expect(MUSHROOM_IDS.has(risk.confusedWithId)).toBe(true);
      }
    }

    expect(dangling).toEqual([]);

    for (const id of Object.keys(LOOKALIKES_WITHOUT_CARD)) {
      expect(MUSHROOMS_DATABASE.some((species) => species.id === id)).toBe(false);
      expect(
        MUSHROOMS_DATABASE.some((species) =>
          species.confusionRisks.some((risk) => risk.confusedWithId === id)
        )
      ).toBe(true);
    }
  });

  test('look-alikes without a card do not use a normal edibility status', () => {
    const normalStatuses = ['EDIBLE', 'INEDIBLE', 'POISONOUS', 'DEADLY_POISONOUS'];
    expect(Object.keys(LOOKALIKES_WITHOUT_CARD).sort()).toEqual([
      'amanita_excelsa',
      'calocybe_gambosa',
      'craterellus_tubaeformis',
      'hypholoma_capnoides',
      'imperator_rhodopurpureus',
      'imperator_torosus',
      'rubroboletus_other',
      'rubroboletus_satanas',
      'suillellus_luridus',
    ]);

    const poisonousWithoutCard = new Set([
      'imperator_rhodopurpureus',
      'imperator_torosus',
      'rubroboletus_other',
      'rubroboletus_satanas',
    ]);

    for (const [id, entry] of Object.entries(LOOKALIKES_WITHOUT_CARD)) {
      const mentions = MUSHROOMS_DATABASE.flatMap((species) =>
        species.confusionRisks.filter((risk) => risk.confusedWithId === id),
      );
      expect(mentions.length).toBeGreaterThan(0);
      if (poisonousWithoutCard.has(id)) {
        expect(entry.status).toBe('POISONOUS');
        for (const risk of mentions) {
          expect(risk.confusedWithStatus).toBe('POISONOUS');
          expect(risk.fatal).toBe(false);
        }
      } else {
        expect(normalStatuses).not.toContain(entry.status);
        expect(entry.status).toBe('NO_ATLAS_VERDICT');
        for (const risk of mentions) {
          expect(normalStatuses).not.toContain(risk.confusedWithStatus);
          expect(risk.confusedWithStatus).toBe('NO_ATLAS_VERDICT');
        }
      }
    }

    expect(LOOKALIKES_WITHOUT_CARD.amanita_excelsa.note).toBe(NOT_FOR_COLLECTION_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.calocybe_gambosa.note).toBe(ATLAS_NO_VERDICT_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.rubroboletus_satanas.note).toBe(ATLAS_NO_VERDICT_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.calocybe_gambosa.note).not.toBe(NOT_FOR_COLLECTION_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.rubroboletus_satanas.status).toBe('POISONOUS');
  });

  test('fatal is set only when the named look-alike is deadly', () => {
    for (const species of MUSHROOMS_DATABASE) {
      for (const risk of species.confusionRisks) {
        expect(risk.fatal).toBe(risk.confusedWithStatus === 'DEADLY_POISONOUS');
      }
    }
  });

  test('an empty look-alike list is not a sourced all-clear', () => {
    const empty = MUSHROOMS_DATABASE.filter((species) => species.confusionRisks.length === 0);
    expect(empty.map((species) => species.id).sort()).toEqual(['amanita_muscaria']);

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
    expect(paxillus?.confusionRisks.every((risk) => risk.fatal === false)).toBe(true);
    expect(paxillus && hasFatalLookAlikeRisk(paxillus)).toBe(true);
    expect(russula && hasFatalLookAlikeRisk(russula)).toBe(true);

    const deathCap = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_phalloides');
    expect(deathCap?.confusionRisks.every((risk) => risk.fatal === false)).toBe(true);
    expect(deathCap && hasFatalLookAlikeRisk(deathCap)).toBe(true);
  });

  test('minimal look-alike cards do not borrow another species photo', () => {
    const withPhoto = new Set([
      'boletus_edulis',
      'amanita_phalloides',
      'macrolepiota_procera',
      'cantharellus_cibarius',
      'imleria_badia',
      'suillus_luteus',
      'leccinum_scabrum',
      'tylopilus_felleus',
      'amanita_muscaria',
      'lactarius_deliciosus',
      'gyromitra_esculenta',
      'paxillus_involutus',
    ]);

    expect(getMushroomImage('boletus_edulis')).toBeTruthy();
    for (const species of MUSHROOMS_DATABASE) {
      if (withPhoto.has(species.id)) {
        expect(getMushroomImage(species.id)).toBeTruthy();
      } else {
        expect(getMushroomImage(species.id)).toBeNull();
      }
    }
  });

  test('unfinished edible cards keep their stored status and are marked incomplete', () => {
    for (const id of [
      'russula_virescens',
      'agaricus_campestris',
      'amanita_rubescens',
      'morchella_esculenta',
      'hydnum_repandum',
      'neoboletus_luridiformis',
      'xerocomellus_chrysenteron',
      'leccinum_aurantiacum',
      'xerocomus_subtomentosus',
      'suillus_grevillei',
      'suillus_bovinus',
      'suillus_variegatus',
      'armillaria_mellea',
      'kuehneromyces_mutabilis',
    ]) {
      const card = MUSHROOMS_DATABASE.find((species) => species.id === id);
      expect(card?.status).toBe('EDIBLE');
      expect(card?.incompleteCard).toBe(true);
    }

    const shaggy = MUSHROOMS_DATABASE.find((species) => species.id === 'chlorophyllum_rhacodes');
    expect(shaggy?.status).toBe('POISONOUS');
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

  test('the green kitchen section is only for a finished edible card', () => {
    const shaggy = MUSHROOMS_DATABASE.find((species) => species.id === 'chlorophyllum_rhacodes');
    const bitter = MUSHROOMS_DATABASE.find((species) => species.id === 'tylopilus_felleus');
    const bolete = MUSHROOMS_DATABASE.find((species) => species.id === 'boletus_edulis');
    const russula = MUSHROOMS_DATABASE.find((species) => species.id === 'russula_virescens');

    expect(shaggy && showsKitchenSection(shaggy)).toBe(false);
    expect(bitter && showsKitchenSection(bitter)).toBe(false);
    expect(bolete && showsKitchenSection(bolete)).toBe(true);
    expect(russula && showsKitchenSection(russula)).toBe(false);

    for (const species of MUSHROOMS_DATABASE) {
      if (species.status !== 'EDIBLE' || species.incompleteCard === true) {
        expect(showsKitchenSection(species)).toBe(false);
      }
    }
  });

  test('reviewed card facts stay within the safer wording', () => {
    const deathCap = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_phalloides');
    const destroyingAngel = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_virosa');
    const fibrecap = MUSHROOMS_DATABASE.find((species) => species.id === 'inocybe_erubescens');
    const panther = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_pantherina');
    const hedgehog = MUSHROOMS_DATABASE.find((species) => species.id === 'hydnum_repandum');
    const yellowStainer = MUSHROOMS_DATABASE.find((species) => species.id === 'agaricus_xanthodermus');
    const bitter = MUSHROOMS_DATABASE.find((species) => species.id === 'tylopilus_felleus');
    const shaggy = MUSHROOMS_DATABASE.find((species) => species.id === 'chlorophyllum_rhacodes');

    const amatoxin = `${deathCap?.culinaryValue} ${deathCap?.warningNotes} ${destroyingAngel?.culinaryValue}`;
    expect(amatoxin).not.toMatch(/10–12/);
    expect(amatoxin).not.toMatch(/50 g/);
    expect(amatoxin).toMatch(/6–24 h/);
    expect(deathCap?.culinaryValue).toMatch(/jeden owocnik/);

    expect(destroyingAngel?.capDescription).toMatch(/Brzeg gładki, bez prążków/);
    expect(destroyingAngel?.capDescription).not.toMatch(/prążkowany/);

    expect(fibrecap?.months[0]).toBe(5);
    expect(fibrecap?.nameLatin).toMatch(/Inosperma erubescens/);
    expect(fibrecap?.nameLatin).toMatch(/Inocybe erubescens/);
    expect(fibrecap?.commonNicknames).toContain('Włókniak ceglasty');
    expect(fibrecap?.status).toBe('DEADLY_POISONOUS');
    expect(fibrecap?.confusionRisks[0]?.confusedWithId).toBe('calocybe_gambosa');

    expect(panther?.confusionRisks.map((risk) => risk.confusedWithId)).toEqual(
      expect.arrayContaining(['amanita_rubescens', 'amanita_excelsa'])
    );
    const pantherText = `${panther?.capDescription} ${JSON.stringify(panther?.confusionRisks)}`;
    expect(pantherText).toMatch(/pierścień gładki/);
    expect(pantherText).toMatch(/nie czerwienieje/);
    expect(pantherText).toMatch(/pierścień prążkowany/);
    expect(pantherText).toMatch(/rąbek/);
    expect(pantherText).toMatch(/f\. abietum/);
    expect(pantherText).toMatch(/w górach, pod jodłami i świerkami/);
    expect(pantherText).not.toMatch(/Twardawy ma brzeg bez prążków/);
    expect(pantherText).not.toMatch(/Plamisty ma brzeg prążkowany/);

    expect(hedgehog?.commonNicknames.join(' ')).not.toMatch(/Sarna/);
    expect(JSON.stringify(hedgehog)).not.toMatch(/lekko truj/);
    expect(hedgehog?.fleshDescription).toMatch(/obróbce termicznej/);
    expect(hedgehog?.warningNotes).toMatch(/^NIE JEDZ NA PODSTAWIE TEJ KARTY\. W literaturze jadalny tylko po obróbce termicznej\./);

    const yellowKnight = MUSHROOMS_DATABASE.find((species) => species.id === 'tricholoma_equestre');
    expect(yellowKnight?.status).toBe('POISONOUS');
    expect(yellowKnight?.nameEn).toBe('Yellow knight');
    expect(`${yellowKnight?.culinaryValue} ${yellowKnight?.warningNotes}`).toMatch(/Dz\.U\. 2026 poz\. 258/);
    expect(`${yellowKnight?.culinaryValue} ${yellowKnight?.warningNotes}`).toMatch(/rabdomioliz/i);
    expect(yellowKnight?.confusionRisks.some((risk) => risk.confusedWithId === 'amanita_phalloides' && risk.fatal)).toBe(true);

    const groups = ['boletus_edulis', 'lactarius_deliciosus', 'armillaria_mellea', 'suillus_luteus'] as const;
    const groupNames = groups.map((id) => MUSHROOMS_DATABASE.find((species) => species.id === id)?.namePl);
    expect(groupNames).toEqual(['Prawdziwki', 'Rydze', 'Opieńki', 'Maślak zwyczajny i ziarnisty']);

    expect(yellowStainer?.stemDescription).toMatch(/szerokim, wyraźnym/);
    expect(yellowStainer?.fleshDescription).toMatch(/potarciu/);
    expect(yellowStainer?.tasteAndSmell).toMatch(/atramentu/);

    expect(bitter?.months).toEqual([6, 7, 8, 9, 10]);
    expect(shaggy?.status).toBe('POISONOUS');
    expect(shaggy?.culinaryValue).toMatch(
      /^W części źródeł nadal opisywany jako jadalny; u części osób powoduje poważne dolegliwości żołądkowo-jelitowe; łatwo pomylić z trującymi czubajnikami/
    );

    const webcap = MUSHROOMS_DATABASE.find((species) => species.id === 'cortinarius_rubellus');
    expect(webcap?.commonNicknames).toContain('Zasłonak spiczasty');
    expect(JSON.stringify(MUSHROOMS_DATABASE)).not.toMatch(/szpiczast/);
    expect(JSON.stringify(MUSHROOMS_DATABASE)).toMatch(/Rudawy \(spiczasty\)/);

    const blusher = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_rubescens');
    const excelsa = blusher?.confusionRisks.find((risk) => risk.confusedWithId === 'amanita_excelsa');
    const excelsaText = excelsa?.keyDifferences.join('\n') ?? '';
    expect(excelsaText).toMatch(/nie czerwienieje/);
    expect(excelsaText).toMatch(/różowieje/);
    expect(excelsaText).toMatch(/Gładki brzeg nie rozstrzyga/);
    expect(excelsaText).toMatch(/też ma brzeg gładki/);
    expect(excelsaText).not.toMatch(/różowieje po uszkodzeniu i ma brzeg gładki/);
  });

  test('a zigzag on the stem is not treated as proof that the mushroom is a parasol', () => {
    const parasol = MUSHROOMS_DATABASE.find((species) => species.id === 'macrolepiota_procera');
    const deathCap = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_phalloides');
    const text = JSON.stringify([parasol?.confusionRisks, deathCap?.confusionRisks, deathCap?.stemDescription]);

    expect(text.toLowerCase()).not.toMatch(/muchomor ma gładki/);
    expect(text.toLowerCase()).toMatch(/zygzak/);
    expect(text).toMatch(/pochw/);
  });

  test('Golden rules and toxicology hotlines are properly configured', () => {
    expect(GOLDEN_RULES.length).toBeGreaterThanOrEqual(4);
    expect(TOXICOLOGY_CENTERS.length).toBeGreaterThanOrEqual(4);

    const warsaw = TOXICOLOGY_CENTERS.find((c) => c.city === 'Warszawa');
    expect(warsaw).toBeDefined();
    expect(warsaw?.phone).toContain('22');

    const ids = GOLDEN_RULES.map((rule) => rule.id);
    const wholeIndex = ids.indexOf('rule_whole_mushroom');
    const tubeCutIndex = ids.indexOf('rule_tube_mushrooms_cut');
    const bagsIndex = ids.indexOf('rule_no_plastic_bags');
    expect(wholeIndex).toBeGreaterThan(-1);
    expect(tubeCutIndex).toBe(wholeIndex + 1);
    expect(wholeIndex).toBeLessThan(bagsIndex);

    const byId = Object.fromEntries(GOLDEN_RULES.map((rule) => [rule.id, rule]));
    expect(byId.rule_tubes_first?.critical).toBe(true);
    expect(byId.rule_tubes_first?.title).toMatch(/początkujących/);
    expect(byId.rule_tubes_first?.description).toMatch(/rurkami/);
    expect(byId.rule_tubes_first?.description).toMatch(/blaszki/);

    expect(byId.rule_whole_mushroom?.critical).toBe(true);
    expect(byId.rule_whole_mushroom?.title).toMatch(/bulwą i pochwą/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/kurkę/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/kolczaka/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/bez rurek/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/nie ucinaj/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/rurk/);
    expect(byId.rule_whole_mushroom?.description).toMatch(/luźna pochwa/);
    expect(byId.rule_whole_mushroom?.description).not.toMatch(/pierścienia/);

    expect(byId.rule_tube_mushrooms_cut?.critical).toBe(false);
    expect(byId.rule_tube_mushrooms_cut?.title).toMatch(/rurk/);
    expect(byId.rule_tube_mushrooms_cut?.description).toMatch(/rurk/);
    expect(byId.rule_tube_mushrooms_cut?.description).toMatch(/nie ścinaj/);
    expect(byId.rule_tube_mushrooms_cut?.description).toMatch(/Leśnicy dopuszczają obie metody/);
    expect(byId.rule_tube_mushrooms_cut?.description).toMatch(/grzyboznawcy/);
    expect(byId.rule_tube_mushrooms_cut?.description).not.toMatch(/bezpodstawny/);
    expect(byId.rule_tube_mushrooms_cut?.description).not.toMatch(/grzybni/);

    expect(byId.rule_protect_forest_floor?.critical).toBe(false);
    expect(byId.rule_protect_forest_floor?.description).toMatch(/Nie grab leśnej ściółki/);
    expect(byId.rule_protect_forest_floor?.description).toMatch(/niejadalnych/);
    expect(byId.rule_protect_forest_floor?.description).toMatch(/chronionych/);
    expect(byId.rule_protect_forest_floor?.description).toMatch(/smardz/);
    expect(byId.rule_protect_forest_floor?.description).toMatch(/całkowitą pewność/);
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

