import { readFileSync } from 'node:fs';

import {
  ATLAS_TOKEN_VOCAB,
  FEATURE_KEYS,
  PRESENT_STATUSES,
  NULLABLE_IMPORT_FIELDS,
  TASTE_WITHHELD,
  WITHHELD_STATUS,
  structureProblem,
} from '../data/atlasFeatureVocab';
import { ATLAS_FILTER_FACTS } from '../data/atlasFilterModel';
import factsTable from '../data/atlasFilterFacts.json';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { en } from '../i18n/en';
import { pl } from '../i18n/pl';

interface ProvenanceRecord {
  speciesId: string;
  field: string;
  appField: string;
  status: string;
  value: unknown;
  source: string;
  checkedAt: string;
  sourceUrls?: string[];
}

interface ProvenanceFile {
  records: ProvenanceRecord[];
}

const provenance = JSON.parse(readFileSync('data/sources/atlas_cechy_20261022.json', 'utf8')) as ProvenanceFile;
const POISONOUS = new Set(['POISONOUS', 'DEADLY_POISONOUS']);
const NULLABLE = new Set<string>(NULLABLE_IMPORT_FIELDS);
const ALLOWED_STATUS = new Set<string>([...PRESENT_STATUSES, WITHHELD_STATUS]);
const LABEL_FIELDS = FEATURE_KEYS.filter((field) => field !== 'capSizeCm');

function factValue(speciesId: string, appField: string): unknown {
  const row = ATLAS_FILTER_FACTS[speciesId];
  if (!row) return undefined;
  const entry = Object.entries(row).find(([key]) => key === appField);
  return entry?.[1];
}

describe('atlas species features', () => {
  test('covers 44 species and imports only sourced, allowed statuses', () => {
    const species = new Set(provenance.records.map((record) => record.speciesId));
    const cardIds = new Set(MUSHROOMS_DATABASE.map((item) => item.id));
    let imported = 0;
    let withheld = 0;

    expect(species).toEqual(cardIds);
    expect(provenance.records).toHaveLength(44 * 15);
    expect(Object.keys(factsTable)).toHaveLength(44);

    for (const record of provenance.records) {
      expect(record.source.trim().length).toBeGreaterThan(0);
      expect(record.checkedAt).toBe('2026-10-22');
      expect(ALLOWED_STATUS.has(record.status)).toBe(true);
      for (const url of record.sourceUrls ?? []) {
        expect(url.startsWith('https://')).toBe(true);
      }
      const current = factValue(record.speciesId, record.appField);
      if (record.status === WITHHELD_STATUS) {
        withheld += 1;
        expect(record.value).toBeNull();
        expect(current).toBe(NULLABLE.has(record.appField) ? null : undefined);
      } else {
        imported += 1;
        expect(current).toEqual(record.value);
      }
    }

    expect(imported).toBe(613);
    expect(withheld).toBe(47);
  });

  test('keeps pominiete and istniejace distinct from zweryfikowane', () => {
    const counts = { zweryfikowane: 0, wniosek_z_klucza: 0, istniejace: 0, pominiete: 0, do_weryfikacji: 0 };
    for (const record of provenance.records) {
      const status = record.status as keyof typeof counts;
      counts[status] += 1;
    }
    expect(counts).toEqual({
      zweryfikowane: 413,
      wniosek_z_klucza: 110,
      istniejace: 71,
      pominiete: 19,
      do_weryfikacji: 47,
    });
    const withheldTaste = provenance.records.filter(
      (record) => record.field === 'taste' && record.status === 'pominiete',
    );
    expect(withheldTaste).toHaveLength(19);
    expect(withheldTaste.every((record) => Array.isArray(record.value) && record.value[0] === 'nie_podaje_sie')).toBe(
      true,
    );
    const existing = provenance.records.filter((record) => record.status === 'istniejace');
    expect(existing.every((record) => ['ring', 'volva', 'sporePrint'].includes(record.field))).toBe(true);
  });

  test('keeps withheld values out of the app and inside the vocabulary', () => {
    const factsText = JSON.stringify(factsTable);
    const provenanceText = JSON.stringify(provenance);
    expect(factsText).not.toMatch(/do_weryfikacji|not_given|globose|Stamets|http:\/\//);
    expect(provenanceText).not.toMatch(/Stamets|stamets|http:\/\/|stipe is bare|stipe has a ring/);
    expect(factValue('cantharellus_cibarius', 'hostTrees')).toBeUndefined();
    expect(factValue('cortinarius_orellanus', 'ring')).toBeNull();
    expect(factValue('boletus_edulis', 'volva')).toBeNull();

    for (const [id, facts] of Object.entries(ATLAS_FILTER_FACTS)) {
      expect({ id, problem: structureProblem(facts) }).toEqual({ id, problem: null });
    }
  });

  test('poisonous and deadly species have no taste value to show', () => {
    const shown = ATLAS_TOKEN_VOCAB.taste.filter((token) => token !== TASTE_WITHHELD);
    for (const species of MUSHROOMS_DATABASE) {
      const taste = ATLAS_FILTER_FACTS[species.id]?.taste;
      if (!POISONOUS.has(species.status)) {
        expect(taste ?? []).not.toContain(TASTE_WITHHELD);
        continue;
      }
      expect(taste).toEqual([TASTE_WITHHELD]);
      expect(shown.some((token) => taste?.includes(token))).toBe(false);
    }
  });

  test('feature tokens have Polish and English labels outside the data file', () => {
    const tokens = new Set<string>();
    for (const field of LABEL_FIELDS) {
      for (const token of ATLAS_TOKEN_VOCAB[field]) tokens.add(token);
    }
    for (const token of tokens) {
      const key = token as keyof typeof pl.atlas.features.tokens;
      expect(pl.atlas.features.tokens[key]?.length).toBeGreaterThan(0);
      expect(en.atlas.features.tokens[key]?.length).toBeGreaterThan(0);
    }
    for (const field of FEATURE_KEYS) {
      expect(pl.atlas.features.fields[field].length).toBeGreaterThan(0);
      expect(en.atlas.features.fields[field].length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(factsTable)).not.toMatch(/Kulisty|Globose|Kształt kapelusza/);
  });
});
