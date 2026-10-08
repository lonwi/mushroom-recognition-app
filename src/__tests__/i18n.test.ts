import { pl } from '../i18n/pl';
import { en } from '../i18n/en';
import { translate } from '../contexts/LanguageContext';
import { GOLDEN_RULES, POISON_SYNDROMES } from '../data/safetyRules';
import { ATLAS_NO_VERDICT_NOTE, NOT_FOR_COLLECTION_NOTE } from '../data/mushrooms';

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
    expect(en.safetyGuide.rules.rule_whole_mushroom.title).toMatch(/[Gg]illed/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/death cap/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/parasol/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/field mushroom/);
    expect(en.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/volva/);
    expect(en.safetyGuide.rules.rule_larger_boletes.description).toMatch(/knife/);
    expect(en.safetyGuide.rules.rule_larger_boletes.description).toMatch(/mycelium/);
    expect(en.safetyGuide.rules.rule_larger_boletes.description).toMatch(/litter or moss/);
    expect(en.safetyGuide.rules.rule_larger_boletes.description).toMatch(/baseless/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/completely sure/);
    expect(en.safetyGuide.rules.rule_protect_forest_floor.description).toMatch(/inedible/);
    expect(pl.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/muchomora sromotnikowego/);
    expect(pl.safetyGuide.rules.rule_whole_mushroom.description).toMatch(/kani/);
    expect(pl.safetyGuide.rules.rule_tubes_first.title).toMatch(/początkujących/);
    expect(en.journal.legacyEdibility).toMatch(/^Do not eat/);

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
});
