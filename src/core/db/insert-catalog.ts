import type { Catalog } from '@/core/db/assemble-catalog';
import { insertRow, type SpeciesSql, type SqlValue } from '@/core/db/sql-db';

export function insertCatalog(
  db: SpeciesSql,
  catalog: Catalog,
  photos: readonly Record<string, SqlValue>[] = [],
): void {
  db.exec('BEGIN');
  try {
    for (const row of catalog.locales) insertRow(db, 'content_locale', row);
    for (const row of catalog.facets) insertRow(db, 'atlas_facet', row);
    for (const row of catalog.species) insertRow(db, 'species', row);
    for (const row of catalog.texts) insertRow(db, 'species_texts', row);
    for (const row of catalog.features) insertRow(db, 'atlas_feature', row);
    for (const row of catalog.classLinks) insertRow(db, 'model_class_species', row);
    for (const row of catalog.pairs) insertRow(db, 'look_alike_pairs', row);
    for (const row of catalog.pairTexts) insertRow(db, 'look_alike_texts', row);
    for (const row of catalog.uncovered) insertRow(db, 'uncovered_look_alikes', row);
    for (const row of catalog.pilots) insertRow(db, 'illustration_pilot', row);
    for (const row of catalog.images) insertRow(db, 'generated_images', row);
    for (const row of photos) insertRow(db, 'species_photos', row);
    for (const row of catalog.fts) {
      db.run('INSERT INTO species_fts (species_id, search_folded) VALUES (?, ?)', [
        row.species_id,
        row.search_folded,
      ]);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
