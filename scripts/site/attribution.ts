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
    throw new Error(
      `Baza gatunków ${dbPath} nie istnieje. Uruchom pnpm build:species przed generowaniem strony.`,
    );
  }

  const db = new DatabaseSync(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT species_id as speciesId, author, license, license_url as licenseUrl, source, source_url as sourceUrl
         FROM photo_attributions
         ORDER BY species_id, author`,
      )
      .all() as unknown as PhotoAttribution[];
    return rows;
  } finally {
    db.close();
  }
}
