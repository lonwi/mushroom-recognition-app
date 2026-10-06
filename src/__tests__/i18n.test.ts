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
    expect(en.safetyGuide.rules.rule_tubes_first.description).toMatch(/NO deadly poisonous/);
    expect(en.journal.legacyEdibility).toMatch(/^Do not eat/);
  });
});
