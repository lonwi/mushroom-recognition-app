/// <reference types="jest" />
import {
  ATLAS_NO_VERDICT_NOTE,
  hasFatalLookAlikeRisk,
  LOOKALIKES_WITHOUT_CARD,
  MUSHROOM_IDS,
  MUSHROOMS_DATABASE,
  showsKitchenSection,
  WEAKLY_POISONOUS_NOTE,
} from '../data/mushrooms';
import { getMushroomImage } from '../utils/mushroomImages';
import { GOLDEN_RULES, TOXICOLOGY_CENTERS } from '../data/safetyRules';
import { type MushroomSpecies } from '../types/mushroom';

function mustSpecies(id: string): MushroomSpecies {
  const species = MUSHROOMS_DATABASE.find((item) => item.id === id);
  if (!species) {
    throw new Error(`Missing atlas card: ${id}`);
  }
  return species;
}

function noteForPoisonousLookalike(id: string): string {
  if (id === 'amanita_porphyria') {
    return WEAKLY_POISONOUS_NOTE;
  }
  return ATLAS_NO_VERDICT_NOTE;
}

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
            expect(allowed.note).toBe(ATLAS_NO_VERDICT_NOTE);
          } else {
            expect(allowed.status).toBe('POISONOUS');
            expect(risk.fatal).toBe(false);
            expect(allowed.note).toBe(noteForPoisonousLookalike(risk.confusedWithId));
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
      'amanita_caesarea',
      'amanita_porphyria',
      'craterellus_tubaeformis',
      'entoloma_sinuatum',
      'imperator_rhodopurpureus',
      'imperator_torosus',
      'rubroboletus_other',
    ]);

    const poisonousWithoutCard = new Set([
      'amanita_porphyria',
      'entoloma_sinuatum',
      'imperator_rhodopurpureus',
      'imperator_torosus',
      'rubroboletus_other',
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

    expect(LOOKALIKES_WITHOUT_CARD.amanita_caesarea.note).toBe(ATLAS_NO_VERDICT_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.amanita_caesarea.status).toBe('NO_ATLAS_VERDICT');
    expect(LOOKALIKES_WITHOUT_CARD.entoloma_sinuatum.status).toBe('POISONOUS');
    expect(LOOKALIKES_WITHOUT_CARD.entoloma_sinuatum.note).toBe(ATLAS_NO_VERDICT_NOTE);
    expect(LOOKALIKES_WITHOUT_CARD.amanita_porphyria.status).toBe('POISONOUS');
    expect(LOOKALIKES_WITHOUT_CARD.amanita_porphyria.note).toBe(WEAKLY_POISONOUS_NOTE);
    expect(`${LOOKALIKES_WITHOUT_CARD.amanita_porphyria.note} ${LOOKALIKES_WITHOUT_CARD.amanita_porphyria.reason}`).not.toMatch(
      /śmiertel|lethal|deadly/i,
    );
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
    expect(empty.map((species) => species.id).sort()).toEqual([]);

    for (const species of MUSHROOMS_DATABASE) {
      expect(species.noDangerousLookAlikes).toBeUndefined();
    }

    const flyAgaric = MUSHROOMS_DATABASE.find((species) => species.id === 'amanita_muscaria');
    expect(flyAgaric?.confusionRisks.map((risk) => risk.confusedWithId)).toEqual([
      'amanita_caesarea',
      'amanita_rubescens',
    ]);
    expect(JSON.stringify(flyAgaric?.confusionRisks)).not.toMatch(/Russula|gołąbek/i);
    expect(flyAgaric && hasFatalLookAlikeRisk(flyAgaric)).toBe(false);
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
      'calocybe_gambosa',
      'hypholoma_capnoides',
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

  test('sourced atlas lines replace placeholders and keep the unfinished-card limits', () => {
    const byId = Object.fromEntries(MUSHROOMS_DATABASE.map((species) => [species.id, species]));
    const russula = byId.russula_virescens;
    const fieldMushroom = byId.agaricus_campestris;
    const morel = byId.morchella_esculenta;
    const variegated = byId.suillus_variegatus;
    const blusher = byId.amanita_rubescens;
    const orangeBolete = byId.leccinum_aurantiacum;
    const scarletina = byId.neoboletus_luridiformis;
    const honey = byId.armillaria_mellea;
    const woodtuft = byId.kuehneromyces_mutabilis;

    expect(russula.nameEn).toBe('Greencracked brittlegill');
    expect(russula.commonNicknames).toContain('Surowiatka');
    expect(russula.commonNicknames).not.toContain('Gołąbek siwy');
    expect(russula.habitat).toMatch(/czerwca/);
    expect(russula.tasteAndSmell).toMatch(/owocowo-orzechowo/);
    expect(russula.capDescription).toMatch(/skrócona karta/);
    expect(russula.culinaryValue).toMatch(/muchomorem zielonawym/);
    expect(russula.culinaryValue).not.toMatch(/najsmaczniejsz/);

    expect(fieldMushroom.nameEn).toBe('Field mushroom');
    expect(fieldMushroom.commonNicknames).toEqual([]);
    expect(fieldMushroom.culinaryValue).toContain(
      'rozporządzenie MZ z 17.05.2011 (Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258, zał. nr 1)'
    );
    expect(fieldMushroom.culinaryValue).toMatch(/zbyt młodych egzemplarzy ze stanu naturalnego/);
    expect(fieldMushroom.culinaryValue).toMatch(/blaszki jeszcze nie poróżowiały/);
    expect(fieldMushroom.culinaryValue).not.toMatch(/Jadalna\./);
    expect(fieldMushroom.culinaryValue).not.toMatch(/Zarzyńsk|GPL/);

    expect(morel.commonNicknames).toContain('Murchel majowy');
    expect(morel.commonNicknames).not.toContain('Bedłka');
    expect(morel.commonNicknames).not.toContain('Kołpak');
    expect(morel.culinaryValue).toMatch(/niedogotowane są trujące/);
    expect(morel.culinaryValue).toMatch(/RDOŚ/);
    expect(morel.nameEn).toBe('Common morel');

    expect(variegated.tasteAndSmell).toMatch(/chlorowy/);
    expect(variegated.tasteAndSmell).toMatch(/metaliczny/);
    expect(variegated.tasteAndSmell).toMatch(/igliwie/);

    const larch = byId.suillus_grevillei;
    expect(larch.fleshDescription).toMatch(/Jasnożółty/);
    expect(larch.fleshDescription).toMatch(/brudnoróż/);
    expect(larch.fleshDescription).not.toMatch(/czerwien/);
    expect(larch.fleshDescription).not.toMatch(/biaław/i);
    expect(larch.tasteAndSmell).toMatch(/jasnożółty/);
    expect(larch.tasteAndSmell).toMatch(/Zarzyński, 2021/);

    expect(blusher.culinaryValue).toMatch(/hemolizyn/);
    expect(blusher.culinaryValue).toMatch(/kilkunastominutowe gotowanie/);
    expect(blusher.culinaryValue).toMatch(/muchomor plamisty/);
    expect(blusher.culinaryValue).toMatch(/Nie jeść na surowo/);
    expect(blusher.culinaryValue).not.toMatch(/Smaczny grzyb/);
    expect(blusher.warningNotes).toMatch(/hemolizyn/);
    expect(blusher.fleshDescription).toMatch(/hemolizyn/);
    expect(blusher.tasteAndSmell).toMatch(/Czerwienienie nie jest dowodem/);

    expect(orangeBolete.culinaryValue).toContain(
      'Koźlarz czerwony (L. aurantiacum, w wykazie MZ jako L. rufum) jest dopuszczony do obrotu, koźlarz pomarańczowożółty (L. versipelle) nie.'
    );
    const rawStatement = /surowy i niedogotowany jest trujący/gi;
    const scarletinaText = [
      scarletina.fleshDescription,
      scarletina.tasteAndSmell,
      scarletina.culinaryValue,
      scarletina.warningNotes,
    ].join('\n');
    const honeyText = [honey.fleshDescription, honey.tasteAndSmell, honey.culinaryValue, honey.warningNotes].join(
      '\n'
    );
    expect(scarletinaText.match(rawStatement)).toHaveLength(1);
    expect(honeyText.match(rawStatement)).toHaveLength(1);
    expect(scarletinaText).not.toMatch(/lekko truj/);
    expect(honeyText).not.toMatch(/lekko truj/);
    expect(honey.culinaryValue).toMatch(/oparów/);
    expect(honey.culinaryValue).toMatch(/łykowate/);
    expect(woodtuft.culinaryValue).toMatch(/hełmówką jadowitą/);
    expect(woodtuft.culinaryValue).toMatch(/uprawy/);
    expect(woodtuft.culinaryValue).not.toMatch(/Tylko dla doświadczonych/);
    expect(woodtuft.culinaryValue).not.toMatch(/Jadalny po obróbce/);

    const unfinished = MUSHROOMS_DATABASE.filter((species) => species.incompleteCard === true);
    const tasteJudgment = /najsmaczniejsz|\bsmaczn|smakowo|smakiem ustępuje|wyśmienit|rarytas/i;
    const polishLetter = String.raw`\p{L}\p{N}_`;
    const cookingOrder = new RegExp(
      `(?<![${polishLetter}])(?:obgotować|obgotuj|odlać|odlej|zdjąć|zdejmij|odciąć|odetnij|zeskrob)(?![${polishLetter}])|Tylko dla doświadczonych|(?<=^|[.!?]\\s+)Jadaln`,
      'iu'
    );
    expect('Jadalny po obróbce').toMatch(cookingOrder);
    expect('Zdanie. Jadalne tylko po obróbce').toMatch(cookingOrder);
    expect('Zdanie! jadalne tylko po obróbce').toMatch(cookingOrder);
    expect('Pytanie? Jadalny grzyb').toMatch(cookingOrder);
    expect('W literaturze jadalny wyłącznie po obróbce').not.toMatch(cookingOrder);
    expect('W literaturze jadalne tylko po obróbce').not.toMatch(cookingOrder);
    for (const order of ['obgotować', 'obgotuj', 'odlać', 'odlej', 'zdjąć', 'zdejmij', 'odciąć', 'odetnij', 'zeskrob']) {
      expect(order).toMatch(cookingOrder);
      expect(`W literaturze ${order}e się`).not.toMatch(cookingOrder);
    }
    expect('Odlej wodę').toMatch(cookingOrder);
    expect('W literaturze kosmki z trzonu zeskrobuje się przed jedzeniem').not.toMatch(cookingOrder);
    expect(unfinished.length).toBeGreaterThan(0);
    for (const species of unfinished) {
      expect(species.culinaryValue).toMatch(/W literaturze|Według |Wg /);
      expect(species.culinaryValue).toContain('Ta karta nie uprawnia do zbioru ani spożycia');
      expect(species.culinaryValue).not.toMatch(tasteJudgment);
      expect(species.culinaryValue).not.toMatch(cookingOrder);
    }
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

  test('szatan is not a name for goryczak', () => {
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
  });

  test('borowik szatański has its own card without unverified habitat', () => {
    const satanas = mustSpecies('rubroboletus_satanas');
    const page = `${satanas.culinaryValue} ${satanas.habitat} ${satanas.warningNotes}`;
    expect(satanas.namePl).toBe('Borowik szatański');
    expect(satanas.nameLatin).toMatch(/Rubroboletus satanas/);
    expect(satanas.status).toBe('POISONOUS');
    expect(satanas.months).toEqual([]);
    expect(satanas.habitat).toMatch(/nie są podane/);
    expect(satanas.habitat).not.toMatch(/dąb|buk|grab|wapien/i);
    expect(page).toMatch(/Dz\.U\. 2014 poz\. 1408/);
    expect(satanas.warningNotes).toMatch(/ochroną ścisłą|Ochrona ścisła/);
    expect(satanas.warningNotes).toMatch(/Zbiór jest zakazany/);
    expect(page).not.toMatch(/Czerwon\w* liś/i);
    expect(page).not.toMatch(/wymiot/);
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
    expect(hedgehog?.nameEn).toBe('Wood hedgehog');
    expect(hedgehog?.culinaryValue).toMatch(/Według Zarzyńskiego \(2021\)/);
    expect(hedgehog?.culinaryValue).toMatch(/na surowo lekko trujący/);
    expect(hedgehog?.culinaryValue).toMatch(/jeść tylko po obróbce termicznej/);
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
    expect(shaggy?.namePl).toBe('Czubajnik czerwieniejący');
    expect(shaggy?.commonNicknames).toContain('Czubajka czerwieniejąca');
    expect(shaggy?.warningNotes).not.toMatch(/Zarzyński/);
    expect(shaggy?.warningNotes).not.toMatch(/s\. 110/);
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

  test('sobowtór cards keep unverified fields off the page', () => {
    const byId = Object.fromEntries(MUSHROOMS_DATABASE.map((species) => [species.id, species]));
    const excelsa = byId.amanita_excelsa;
    const gambosa = byId.calocybe_gambosa;
    const luridus = byId.suillellus_luridus;
    const capnoides = byId.hypholoma_capnoides;
    const polishLetter = String.raw`\p{L}\p{N}_`;
    const cookingOrder = new RegExp(
      `(?<![${polishLetter}])(?:obgotować|obgotuj|odlać|odlej|zdjąć|zdejmij|odciąć|odetnij|zeskrob)(?![${polishLetter}])|Tylko dla doświadczonych|(?<=^|[.!?]\\s+)Jadaln`,
      'iu',
    );
    const collectingOrder = new RegExp(
      `(?<![${polishLetter}])(?:zbieraj|zbierz|zostaw|nie niszcz)(?![${polishLetter}])`,
      'iu',
    );

    expect(excelsa.status).toBe('INEDIBLE');
    expect(excelsa.habitat).not.toMatch(/dąb|buk|sosn|świerk|jodł|brzoz|grab|lipa/i);
    expect(excelsa.nameLatin).toMatch(/Amanita spissa/);

    expect(gambosa.incompleteCard).toBe(true);
    expect(gambosa.culinaryValue).toMatch(/gęśnica indyjska/);
    expect(gambosa.confusionRisks.some((risk) => risk.confusedWithId === 'inocybe_erubescens' && risk.fatal)).toBe(
      true,
    );

    const luridusText = [luridus.culinaryValue, luridus.warningNotes, luridus.fleshDescription].join('\n');
    expect(luridus.status).toBe('POISONOUS');
    expect(luridusText).toMatch(/żołądkowo-jelitow/);
    expect(luridusText).toMatch(/Dz\.U\. 2026 poz\. 258/);
    expect(luridus.warningNotes).toContain(
      'Źródła są rozbieżne (Zarzyński 2021: niejadalny; Poradnik grzybiarza: trujący); karta przyjmuje wersję ostrożniejszą.',
    );
    expect(luridusText).not.toMatch(/alkohol/);
    expect(luridusText).not.toMatch(/surow/);

    const galerina = capnoides.confusionRisks.find((risk) => risk.confusedWithId === 'galerina_marginata');
    if (!galerina) {
      throw new Error('galerina look-alike missing');
    }
    expect(galerina.confusedWithId).toBe('galerina_marginata');
    expect(galerina.fatal).toBe(true);
    const galerinaText = [galerina.keyDifferences.join('\n'), capnoides.culinaryValue, capnoides.warningNotes].join(
      '\n',
    );
    expect(galerinaText).toMatch(/karcie hełmówki jadowitej/);
    expect(galerinaText).toMatch(/cynamonowobrązow/);
    expect(galerinaText).toMatch(/włóknisty/);
    expect(galerinaText).not.toMatch(/rdzawobrązow/);
    expect(galerinaText).not.toMatch(/galerina_marginata/);

    for (const id of [
      'amanita_excelsa',
      'calocybe_gambosa',
      'suillellus_luridus',
      'hypholoma_capnoides',
      'rubroboletus_satanas',
    ]) {
      expect(JSON.stringify(byId[id])).not.toMatch(cookingOrder);
      expect(JSON.stringify(byId[id])).not.toMatch(collectingOrder);
    }
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

