import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface PhotoAttribution {
  speciesId: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  sourceUrl: string;
}

export function loadPhotoAttributions(root = process.cwd()): PhotoAttribution[] {
  const dbPath = path.join(root, 'assets/db/species.db');
  if (!existsSync(dbPath)) {
    return [];
  }

  try {
    const db = new DatabaseSync(dbPath);
    const rows = db
      .prepare(
        `SELECT species_id as speciesId, author, license, license_url as licenseUrl, source, source_url as sourceUrl
         FROM photo_attributions
         ORDER BY species_id, author`,
      )
      .all() as unknown as PhotoAttribution[];
    db.close();
    return rows;
  } catch (error) {
    console.warn('Nie udało się odczytać tabeli photo_attributions z bazy:', error);
    return [];
  }
}
