import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { speciesSearchSql } from '@/core/db/fold-search';
import { speciesTables } from '@/core/db/species-schema';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

const root = path.resolve(__dirname, '../../..');

test('builds the species canon with folded search', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'species-db-'));
  const out = path.join(dir, 'species.db');
  execFileSync(
    'pnpm',
    [
      'exec',
      'tsx',
      'scripts/build-species-db.ts',
      '--out',
      out,
      '--report',
      path.join(dir, 'report.json'),
      '--photos',
      path.join(dir, 'photos'),
    ],
    {
      cwd: root,
      env: { ...process.env, HF_TOKEN_READONLY: '' },
      stdio: 'pipe',
    },
  );
  const db = new DatabaseSync(out, { readOnly: true });
  const search = (query: string) => {
    const built = speciesSearchSql(query);
    if (!built) return [];
    return db
      .prepare(built.sql)
      .all(built.args[0])
      .map((row) => String((row as { species_id: string }).species_id));
  };
  expect(search('golabek')).toEqual(
    expect.arrayContaining(['russula_emetica', 'russula_vesca', 'russula_virescens']),
  );
  expect(search('żółty')).toEqual(search('zolty'));
  expect(search('zolty')).toContain('suillus_grevillei');
  expect(search('phall')).toContain('amanita_phalloides');
  expect(search('łuskwiak')).toEqual(
    expect.arrayContaining(['kuehneromyces_mutabilis', 'pholiota_squarrosa']),
  );
  const classes = db
    .prepare('SELECT COUNT(DISTINCT class_id) AS count FROM model_class_species')
    .get() as {
    count: number;
  };
  expect(classes.count).toBe(67);
  const outside = db
    .prepare(
      "SELECT id, in_model, edibility FROM species WHERE id IN ('lepiota_subincarnata', 'lepiota_castanea') ORDER BY id",
    )
    .all() as { id: string; in_model: number; edibility: string }[];
  expect(outside).toEqual([
    { id: 'lepiota_castanea', in_model: 0, edibility: 'DEADLY_POISONOUS' },
    { id: 'lepiota_subincarnata', in_model: 0, edibility: 'DEADLY_POISONOUS' },
  ]);
  const conditional = db
    .prepare("SELECT COUNT(*) AS count FROM species WHERE edibility = 'CONDITIONALLY_EDIBLE'")
    .get() as { count: number };
  expect(conditional.count).toBe(0);
  for (const id of [
    'tricholoma_equestre',
    'suillellus_luridus',
    'amanita_excelsa',
    'leucocoprinus_leucothites',
  ]) {
    const row = db
      .prepare('SELECT status_disputed AS disputed FROM species WHERE id = ?')
      .get(id) as {
      disputed: number;
    };
    expect(row.disputed).toBe(1);
  }
  const proposed = db
    .prepare("SELECT COUNT(*) AS count FROM look_alike_pairs WHERE review_status != 'proposed'")
    .get() as { count: number };
  expect(proposed.count).toBe(0);
  const plates = db
    .prepare(
      'SELECT COUNT(*) AS count FROM generated_images WHERE file_present = 0 AND review_status = ?',
    )
    .get('pending') as { count: number };
  expect(plates.count).toBe(14);
  for (const table of speciesTables) {
    const config = getTableConfig(table);
    const columns = db.prepare(`PRAGMA table_info(${config.name})`).all() as { name: string }[];
    expect(columns.map((column) => column.name).sort()).toEqual(
      config.columns.map((column) => column.name).sort(),
    );
  }
  db.close();
}, 30_000);
