import { DatabaseSync } from 'node:sqlite';

import { evaluateContentGates } from '@/core/db/content-gates';
import { SPECIES_DDL } from '@/core/db/species-ddl';
import { insertRow, type SpeciesSql, type SqlValue } from '@/core/db/sql-db';

function memory(): SpeciesSql {
  const db = new DatabaseSync(':memory:');
  db.exec(SPECIES_DDL);
  return {
    exec: (sql) => {
      db.exec(sql);
    },
    run: (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    all: <T extends Record<string, SqlValue>>(sql: string, params: readonly SqlValue[] = []) =>
      db.prepare(sql).all(...params) as T[],
  };
}

function species(id: string, extra: Record<string, SqlValue> = {}): Record<string, SqlValue> {
  return {
    id,
    latin_name: 'Amanita test',
    genus: 'Amanita',
    edibility: 'EDIBLE',
    status_disputed: 0,
    in_model: 1,
    incomplete_card: 0,
    content_version: 'test',
    hymenophore: null,
    months_json: '[]',
    family: null,
    high_stakes: 0,
    card_origin: 'test',
    incomplete_fields: '[]',
    ...extra,
  };
}

test('rejects a bad edibility and catches empty warnings', () => {
  const db = memory();
  expect(() => insertRow(db, 'species', species('bad', { edibility: 'YUMMY' }))).toThrow();
  insertRow(db, 'content_locale', { locale: 'pl', enabled: 1 });
  insertRow(db, 'content_locale', { locale: 'en', enabled: 0 });
  insertRow(db, 'species', species('poison', { edibility: 'POISONOUS', high_stakes: 1 }));
  insertRow(db, 'model_class_species', { class_id: 'poison', species_id: 'poison' });
  insertRow(
    db,
    'species',
    species('disputed', { edibility: 'EDIBLE', status_disputed: 1, genus: 'Boletus' }),
  );
  insertRow(db, 'species_texts', {
    species_id: 'disputed',
    locale: 'pl',
    name: 'sporny',
    warning: '',
    note: '',
    cap: '',
    hymenophore: '',
    stem: '',
    flesh: '',
    habitat: '',
    taste: 'po gotowaniu',
    nicknames: '[]',
  });
  insertRow(db, 'species', species('host', { genus: 'Boletus', latin_name: 'Boletus host' }));
  for (let index = 0; index < 4; index += 1) {
    insertRow(db, 'species_photos', {
      id: `photo-${index}`,
      species_id: 'host',
      file: `${index}.webp`,
      sha256: `hash-${index}`,
      byte_size: 10,
      mime: 'image/webp',
      license: 'cc0',
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      author: 'Autor',
      source: 'example',
      source_url: 'https://example.test/photo',
      observation_id: String(index),
      image_url: `https://example.test/${index}.jpg`,
      feature_tag: null,
      sort_index: index,
    });
  }
  insertRow(db, 'generated_images', {
    id: 'plate',
    species_id: 'poison',
    kind: 'rycina',
    feature: 'pochwa',
    file: 'plate.png',
    sha256: 'abc',
    label: 'ilustracja',
    provider: 'cursor',
    model: 'raster',
    model_version: null,
    style_id: null,
    prompt: 'brak tekstu',
    negative_prompt: null,
    params_json: '{}',
    base_photo_ids: null,
    base_photo_licenses: null,
    created_at: '2026-11-11',
    review_status: 'approved',
    reviewer: null,
    reviewed_at: null,
    review_notes: null,
    provenance_signals: null,
    file_present: 1,
    excluded_from_training: 1,
  });
  const violations = evaluateContentGates(db, {
    phrases: ['gotowan'],
    requiredClassIds: ['poison'],
    manifestClassIds: [],
  });
  expect(violations).toEqual(
    expect.arrayContaining([
      'poison: brak ostrzeżenia w locale pl',
      'disputed: brak notki przy statusie spornym lub warunkowym (pl)',
      'host: więcej niż 3 zdjęcia w APK',
      'species_texts.disputed.taste: słownik obróbki (gotowan)',
      'plate: zatwierdzona rycina Amanita/Galerina/Lepiota bez zdjęcia tej cechy',
    ]),
  );
});
