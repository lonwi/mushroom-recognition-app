/// <reference types="jest" />
import fs from 'fs';
import path from 'path';

import { en } from '../i18n/en';
import { pl } from '../i18n/pl';
import { LOOKALIKES_WITHOUT_CARD, MUSHROOMS_DATABASE } from '../data/mushrooms';
import { GOLDEN_RULES, POISON_SYNDROMES } from '../data/safetyRules';
import { type MushroomSpecies } from '../types/mushroom';

const PL_RULE =
  'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.';
const EN_RULE =
  'Neither taste nor smell can tell a poisonous mushroom from an edible one.';

/**
 * A taste quality stated about a poisonous or deadly species.
 * The only allowed wording is the rule sentence itself (Polish or English).
 * "goryczak" is a species name, not the noun "gorycz".
 */
const TASTE_QUALITY =
  /\b(?:smak\p{L}*|smakuj\p{L}*|piekąc\p{L}*|kwaskowat\p{L}*|gorzk\p{L}*|gorycz(?!ak)\p{L}*)\b/iu;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALLOWED_TASTE_SENTENCE = new RegExp(`${escapeRegExp(PL_RULE)}|${escapeRegExp(EN_RULE)}`, 'g');

const STATED_TASTE =
  /łagodny i przyjemny|smak łagodny|ma smak|mild, pleasant|pleasant taste|has a mild|smak słodkawy|nie smakują|smak opisywany jako|Łagodny smak nie oznacza|silnie piekąc|piekąc\p{L}* mleczk|jak trucizna|Smak jest opisywany jako gorzki|Gorycz nie jest dowodem|nie traktuj goryczy/iu;

const POISONOUS = new Set(['POISONOUS', 'DEADLY_POISONOUS']);

function cardCopy(species: MushroomSpecies): string {
  return [
    species.habitat,
    species.capDescription,
    species.hymenophoreDescription,
    species.stemDescription,
    species.fleshDescription,
    species.tasteAndSmell,
    species.culinaryValue,
    species.warningNotes ?? '',
    ...species.commonNicknames,
    ...species.confusionRisks.flatMap((risk) => [risk.confusedWithName, ...risk.keyDifferences]),
  ].join('\n');
}

function withoutAllowedTasteSentence(text: string): string {
  return text.replace(ALLOWED_TASTE_SENTENCE, '');
}

function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      out.push(...filesUnder(full));
    } else if (/\.(ts|tsx|html|md|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('taste of poisonous species', () => {
  test('the safety rule says taste and smell do not separate poisonous from edible', () => {
    const rule = GOLDEN_RULES.find((item) => item.id === 'rule_no_taste_test');
    expect(rule?.description).toBe(
      `Mit o tym, że grzyby trujące są gorzkie lub piekące, jest śmiertelnie niebezpieczny. ${PL_RULE}`,
    );
    expect(pl.safetyGuide.rules.rule_no_taste_test.description).toBe(rule?.description);
    expect(en.safetyGuide.rules.rule_no_taste_test.description).toBe(
      `The myth that poisonous mushrooms are bitter or peppery is deadly dangerous. ${EN_RULE}`,
    );
    expect(en.safetyGuide.rules.rule_no_taste_test.description).toContain(EN_RULE);
  });

  test('safety texts do not describe how a poisonous species tastes', () => {
    const safety = [
      ...GOLDEN_RULES.map((rule) => `${rule.title}\n${rule.description}`),
      ...POISON_SYNDROMES.map((syndrome) =>
        [syndrome.name, syndrome.species, syndrome.latency, syndrome.symptoms, syndrome.action].join('\n'),
      ),
      JSON.stringify(pl.safetyGuide),
      JSON.stringify(en.safetyGuide),
    ].join('\n');

    expect(safety).toContain(PL_RULE);
    expect(safety).toContain(EN_RULE);
    expect(safety).not.toMatch(STATED_TASTE);
    expect(safety).not.toMatch(/sromotnik\p{L}*.*smak|death cap has a/iu);
  });

  test('poisonous and deadly cards, and lines about them, state no taste', () => {
    for (const species of MUSHROOMS_DATABASE) {
      if (!POISONOUS.has(species.status)) continue;
      const copy = withoutAllowedTasteSentence(cardCopy(species));
      expect(copy).not.toMatch(TASTE_QUALITY);
    }

    for (const species of MUSHROOMS_DATABASE) {
      for (const risk of species.confusionRisks) {
        if (!POISONOUS.has(risk.confusedWithStatus)) continue;
        const copy = withoutAllowedTasteSentence(risk.keyDifferences.join('\n'));
        expect(copy).not.toMatch(TASTE_QUALITY);
      }
    }

    for (const entry of Object.values(LOOKALIKES_WITHOUT_CARD)) {
      if (!POISONOUS.has(entry.status)) continue;
      expect(withoutAllowedTasteSentence(entry.note)).not.toMatch(TASTE_QUALITY);
    }
  });

  test('the site and the app sources do not state that taste', () => {
    const root = path.resolve(__dirname, '../..');
    const roots = ['src', 'site', 'docs'].map((dir) => path.join(root, dir));
    const hits: string[] = [];
    for (const dir of roots) {
      for (const file of filesUnder(dir)) {
        const text = fs.readFileSync(file, 'utf8');
        if (STATED_TASTE.test(text)) hits.push(path.relative(root, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
