import { pl } from '../i18n/pl';
import { en } from '../i18n/en';
import { interpolate, translate } from '../contexts/LanguageContext';
import { GOLDEN_RULES, POISON_SYNDROMES } from '../data/safetyRules';
import {
  ATLAS_NO_VERDICT_NOTE,
  FLY_AGARIC_POISONING_SYMPTOMS,
  GALERINA_PSILOCYBE_WARNING,
  GIS_MUSHROOM_FIRST_AID,
  NOT_FOR_COLLECTION_NOTE,
  PANTHER_POISONING_SYMPTOMS,
  POISONOUS_NOTE,
} from '../data/mushrooms';

function leaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('Polish and English dictionaries', () => {
  it('covers the same keys, with Polish as the string that translate returns by default', () => {
    expect(leaves(en).sort()).toEqual(leaves(pl).sort());
    expect(translate('pl', 'scanner.recognitionUnavailableTitle')).toBe(
      'Rozpoznawanie niedostępne',
    );
    expect(translate('en', 'scanner.recognitionUnavailableTitle')).toBe('Recognition unavailable');
    expect(translate('pl', 'scanner.rejectedUnclear')).toMatch(/zbyt niejednoznaczny/);
    expect(translate('en', 'scanner.rejectedNotMushroom')).toMatch(/No species was named/);
    expect(translate('pl', 'scanner.unknownMushroomBody')).toBe(
      'To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.',
    );
    expect(translate('en', 'scanner.unknownMushroomBody')).toMatch(/Do not pick it or eat it/);
    expect(translate('pl', 'scanner.unknownMushroomDeadly')).toBe('Ten grzyb może być śmiertelnie trujący.');
    expect(translate('en', 'scanner.unknownMushroomDeadly')).toBe('This mushroom may be deadly poisonous.');
    expect(translate('pl', 'scanner.rejectedVerify')).toMatch(/grzyboznawcy/);
    expect(translate('en', 'scanner.rejectedVerify')).toMatch(/Sanepid/);
  });

  it('keeps the Polish safety wording and does not soften the English warnings', () => {
    for (const rule of GOLDEN_RULES) {
      const copy = pl.safetyGuide.rules[rule.id as keyof typeof pl.safetyGuide.rules];
      expect(copy.title).toBe(rule.title);
      expect(copy.description).toBe(rule.description);
    }
    for (const syndrome of POISON_SYNDROMES) {
      const copy = pl.safetyGuide.syndromes[syndrome.id as keyof typeof pl.safetyGuide.syndromes];
      expect(copy.name).toBe(syndrome.name);
      expect(copy.species).toBe(syndrome.species);
      expect(copy.latency).toBe(syndrome.latency);
      expect(copy.symptoms).toBe(syndrome.symptoms);
      expect(copy.action).toBe(syndrome.action);
    }

    expect(pl.lookalike.noVerdict).toBe(ATLAS_NO_VERDICT_NOTE);
    expect(pl.lookalike.notForCollection).toBe(NOT_FOR_COLLECTION_NOTE);
    expect(pl.lookalike.poisonousNote).toBe(POISONOUS_NOTE);
    expect(pl.disclaimer.alertTitle).toMatch(/NIGDY NIE SPOŻYWAJ/);
    expect(pl.disclaimer.point2Body).toMatch(/ZOSTAW GRZYBA W LESIE/);
    expect(pl.cardWarnings.fatalBannerBody).toMatch(/^Nie jedz/);
    expect(pl.scanner.expertWarningBody).toMatch(/^Nie zbieraj/);

    expect(en.disclaimer.alertTitle).toMatch(/^NEVER EAT/);
    expect(en.disclaimer.point2Body).toMatch(/LEAVE THE MUSHROOM IN THE FOREST/);
    expect(en.cardWarnings.fatalBannerBody).toMatch(/^Do not eat/);
    expect(en.scanner.expertWarningBody).toMatch(/^Do not collect/);
    expect(en.lookalike.incompleteBody).toMatch(/does not mean there are no dangerous look-alikes/);
    expect(en.safetyGuide.syndromes.amatoxin.action).toMatch(/IMMEDIATELY/);
    expect(en.safetyGuide.rules.rule_tubes_first.title).toMatch(/beginners/i);
    expect(en.safetyGuide.rules.rule_tubes_first.description).toMatch(/NO deadly poisonous/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.title).toMatch(/bulb and volva/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/chanterelles/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/hedgehog/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/without tubes/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/Never cut/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/death cap/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/loose volva/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).not.toMatch(/ring/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.title).toMatch(/boletes/i);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/tubes/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/Never cut a gilled/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/Foresters accept both methods/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/whole fruiting bodies/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).not.toMatch(/baseless/);
    expect(en.safetyGuide.rules.rule_tube_mushrooms_cut.description).not.toMatch(/mycelium/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/completely sure/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/inedible/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/protected species/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/morels/);
    expect(pl.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/rurk/);
    expect(pl.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/nie ucinaj/);
    expect(pl.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/rurk/);
    expect(pl.safetyGuide.rules.rule_tube_mushrooms_cut.description).toMatch(/nie ścinaj/);
    expect(pl.safetyGuide.rules.rule_tube_mushrooms_cut.description).not.toMatch(/bezpodstawny/);
    expect(pl.disclaimer.point4Body).toMatch(/ze ściółki/);
    expect(pl.disclaimer.point4Body).not.toMatch(/z ściółki/);
    expect(pl.safetyGuide.rules.rule_tubes_first.title).toMatch(/początkujących/);
    expect(en.journal.legacyEdibility).toMatch(/^Do not eat/);

    expect(pl.cards.poisoningNoteTitle).toBe('Notka o zatruciu');
    expect(pl.cards.flyAgaricPoisoning).toBe(FLY_AGARIC_POISONING_SYMPTOMS);
    expect(pl.cards.pantherPoisoning).toBe(PANTHER_POISONING_SYMPTOMS);
    expect(pl.cards.poisoningFirstAid).toBe(GIS_MUSHROOM_FIRST_AID);
    expect(pl.cards.galerinaLookalikeWarning).toBe(GALERINA_PSILOCYBE_WARNING);
    expect(pl.cards.poisoningFirstAid).toMatch(/nie podaje się mleka ani alkoholu/);
    expect(pl.cards.poisoningFirstAid).not.toMatch(/podawaj/);
    expect(pl.cards.poisoningFirstAid).toMatch(/112/);
    expect(pl.cards.poisoningFirstAid).toMatch(/999/);
    expect(pl.cards.poisoningFirstAid).toMatch(/mleka/);
    expect(en.cards.poisoningNoteTitle).toBe('Poisoning warning');
    expect(en.cards.flyAgaricPoisoning).toMatch(/vomiting/);
    expect(en.cards.flyAgaricPoisoning).toMatch(/cardiac arrest/);
    expect(en.cards.pantherPoisoning).toMatch(/convulsions/);
    expect(en.cards.poisoningFirstAid).toMatch(/112 or 999/);
    expect(en.cards.poisoningFirstAid).toMatch(/Do not give milk or alcohol/);
    expect(en.cards.galerinaLookalikeWarning).toMatch(/deadly poisonous/);
    expect(en.cards.galerinaLookalikeWarning).toMatch(/Stamets 1996, pp\. 31–33, 144–145, 192–193/);
    expect(en.cards.galerinaLookalikeWarning).not.toMatch(/Stamets 1996, s\./);
    expect(en.cards.galerinaLookalikeWarning).not.toMatch(/Panaeolus/);
    const translatedNotes = [
      pl.cards.flyAgaricPoisoning,
      pl.cards.pantherPoisoning,
      pl.cards.poisoningFirstAid,
      pl.cards.galerinaLookalikeWarning,
      en.cards.flyAgaricPoisoning,
      en.cards.pantherPoisoning,
      en.cards.poisoningFirstAid,
      en.cards.galerinaLookalikeWarning,
    ].join('\n');
    expect(translatedNotes).not.toMatch(/psylocybin|psilocybin|cultivat|upraw|607 218 174/i);
    expect(pl.cards.useKitchen).toBe('W kuchni');
    expect(pl.cards.useToxic).toBe('Toksyczność i objawy');
    expect(pl.cards.useInedible).toBe('Nie do jedzenia');
    expect(pl.cards.useLiterature).toBe('Znaczenie w literaturze');
    expect(pl.cards.photoMissing).toBe('Brak zdjęcia');
    expect(pl.cards.family).toBe('RODZINA');
    expect(pl.cards.otherNames).toBe('INNE NAZWY');
    expect(pl.cards.seasonPoland).toBe('SEZON WYSTĘPOWANIA W POLSCE');
    expect(pl.cards.morphologyHabitat).toBe('Morfologia i siedlisko');
    expect(pl.cards.occurrence).toBe('Występowanie');
    expect(pl.cards.cap).toBe('Kapelusz');
    expect(pl.cards.underside).toBe('Spód ({type})');
    expect(pl.cards.stemVeil).toBe('Trzon i osłona');
    expect(pl.cards.fleshTasteSmell).toBe('Miąższ, smak i zapach');
    expect(pl.cards.significanceUse).toBe('Znaczenie i zastosowanie');
    expect(pl.nav.atlas).toBe('Atlas');
    expect(pl.atlas.hymenophoreTubes).toBe('Rurki');
    expect(pl.atlas.hymenophoreGills).toBe('Blaszki');
    expect(pl.atlas.hymenophoreFolds).toBe('Listewki');
    expect(pl.atlas.hymenophoreSpines).toBe('Kolce');
    expect(pl.atlas.hymenophoreOther).toBe('Inny spód');
    expect(en.cards.family).toBe('FAMILY');
    expect(en.cards.significanceUse).toBe('Significance and use');
    expect(en.cards.underside).toBe('Underside ({type})');
    expect(en.nav.atlas).toBe('Atlas');
    expect(en.atlas.hymenophoreOther).toBe('Other underside');
    expect(pl.atlas.unverifiedBody).toMatch(/nie oznacza, że grzyb jest jadalny/);
    expect(pl.atlas.unverifiedBody).toMatch(
      /Są tu też gatunki trujące, których nie da się wykluczyć na podstawie tej cechy/,
    );
    expect(en.atlas.unverifiedBody).toMatch(/does not mean the mushroom is edible/);
    expect(en.atlas.unverifiedBody).toMatch(
      /This group also contains poisonous species that cannot be ruled out by the selected trait/,
    );
    expect(pl.atlas.filters.unverified).toBe('Do weryfikacji');
    expect(pl.atlas.filters.open).toBe('Filtry ({count})');
    expect(pl.atlas.filters.clear).toBe('Wyczyść');
    expect(pl.atlas.filters.show).toBe('Pokaż {count}');
    expect(pl.atlas.filters.remove).toBe('Usuń filtr: {group}: {label}');
    expect(translate('pl', 'atlas.filters.remove', { group: 'Ochrona', label: 'Niechroniony' })).toBe(
      'Usuń filtr: Ochrona: Niechroniony',
    );
    expect(en.atlas.filters.unverified).toBe('To be verified');
    expect(en.atlas.filters.open).toBe('Filters ({count})');
    expect(en.atlas.filters.clear).toBe('Clear');
    expect(en.atlas.filters.show).toBe('Show {count}');
    expect(en.atlas.filters.remove).toBe('Remove filter: {group}: {label}');
    expect(translate('en', 'atlas.filters.remove', { group: 'Protection', label: 'Not protected' })).toBe(
      'Remove filter: Protection: Not protected',
    );
    expect(pl.atlas.lookAlikeTag).toBe('☠ Sobowtór!');
    expect(pl.atlas.monthRange).toBe('{start} - {end} mies.');
    expect(pl.months.jan).toBe('Sty');
    expect(pl.months.dec).toBe('Gru');
    expect(en.cards.sourceLanguageNote).toMatch(/source text in Polish/);
    expect(en.cards.sourceLanguageNote).toMatch(/Descriptions/);
    expect(en.cards.sourceLanguageNote).toMatch(/look-alike/);
    expect(en.cards.sourceLanguageNote).toMatch(/morphology/);
    expect(en.months.jan).toBe('Jan');
    expect(en.months.jun).toBe('Jun');
    expect(en.atlas.lookAlikeTag).toBe('☠ Look-alike!');
    expect(en.cards.photoMissing).toBe('No photo');
  });

  it('interpolates every placeholder, including a repeated one', () => {
    expect(interpolate('a {x} b {x}', { x: 1 })).toBe('a 1 b 1');
    expect(translate('pl', 'atlas.monthRange', { start: 6, end: 10 })).toBe('6 - 10 mies.');
    expect(translate('pl', 'atlas.colloquial', { names: 'prawdziwek' })).toBe('Potocznie: prawdziwek');
    expect(translate('en', 'atlas.colloquial', { names: 'penny bun' })).toBe('Commonly: penny bun');
    expect(translate('pl', 'preparation.allTab')).toBe('Wszystkie');
    expect(translate('en', 'preparation.allTab')).toBe('All');
    expect(pl.preparation.rules.clean.title).toBe('Czyszczenie na sucho');
    expect(pl.preparation.rules.cooking.description).toMatch(/borowiki ceglastopore/);
    expect(en.preparation.rules.cooking.description).toMatch(/scarletina boletes/);
    expect(en.preparation.rules.cooking.description).not.toMatch(/lurid/);
    expect(pl.settings.onDeviceTitle).toBe('⚡ 100% On-Device AI');
    expect(en.settings.onDeviceTitle).toBe('⚡ 100% On-Device AI');
  });
});
