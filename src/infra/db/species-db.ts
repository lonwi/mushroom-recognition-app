import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { foldForSearch } from '@/core/db/fold-search';
import { SPECIES_DDL } from '@/core/db/species-ddl';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import donorCardsData from '../../../data/sources/donor-cards.json';

let overrideDb: SpeciesSql | null = null;
let instance: SpeciesSql | null = null;

/** Pozwala testom wstrzyknąć bazę zastępczą (np. in-memory SQLite). */
export function setSpeciesDb(db: SpeciesSql | null): void {
  overrideDb = db;
}

function checkDatabasePopulated(db: SQLiteDatabase): boolean {
  try {
    const tables = db.getAllSync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='species'",
    );
    if ((tables[0]?.count ?? 0) === 0) return false;
    const countRows = db.getAllSync<{ count: number }>('SELECT count(*) as count FROM species');
    return (countRows[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

interface DonorCardConfusionRisk {
  confusedWithId: string;
  confusedWithName: string;
  confusedWithStatus: string;
  keyDifferences: string[];
  fatal: boolean;
}

interface DonorCardSeed {
  id: string;
  namePl: string;
  nameLatin: string;
  commonNicknames: string[];
  family: string;
  status: string;
  incompleteCard?: boolean;
  hymenophore: string;
  months: number[];
  habitat: string;
  capDescription: string;
  hymenophoreDescription: string;
  stemDescription: string;
  fleshDescription: string;
  tasteAndSmell: string;
  confusionRisks: DonorCardConfusionRisk[];
  warningNotes?: string;
}

function seedFallbackDatabase(db: SQLiteDatabase): void {
  try {
    db.execSync(SPECIES_DDL);

    const cards = (donorCardsData as { cards: DonorCardSeed[] }).cards;

    for (const card of cards) {
      const genus = card.nameLatin.split(' ')[0] ?? '';
      const isDeadly = card.status === 'DEADLY_POISONOUS';
      const warning =
        card.warningNotes ?? (isDeadly ? 'Śmiertelnie trujący! Zawiera groźne toksyny.' : '');

      db.runSync(
        `INSERT OR REPLACE INTO species (
          id, latin_name, genus, edibility, status_disputed, in_model,
          incomplete_card, content_version, hymenophore, months_json,
          family, high_stakes, card_origin, incomplete_fields
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        card.id,
        card.nameLatin,
        genus,
        card.status,
        0,
        1,
        card.incompleteCard ? 1 : 0,
        '2026-11-seed',
        card.hymenophore,
        JSON.stringify(card.months),
        card.family,
        isDeadly ? 1 : 0,
        'donor_cards',
        '[]',
      );

      db.runSync(
        `INSERT OR REPLACE INTO species_texts (
          species_id, locale, name, warning, note, cap, hymenophore, stem, flesh, habitat, taste, nicknames
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        card.id,
        'pl',
        card.namePl,
        warning,
        '',
        card.capDescription,
        card.hymenophoreDescription,
        card.stemDescription,
        card.fleshDescription,
        card.habitat,
        card.tasteAndSmell,
        card.commonNicknames.join(', '),
      );

      const folded = foldForSearch(
        `${card.namePl} ${card.nameLatin} ${card.commonNicknames.join(' ')}`,
      );
      db.runSync(
        'INSERT OR REPLACE INTO species_fts (species_id, search_folded) VALUES (?, ?)',
        card.id,
        folded,
      );

      db.runSync(
        "INSERT OR IGNORE INTO atlas_facet (facet, enabled) VALUES ('hymenophore', 1), ('season', 1), ('habitat', 1), ('edibility', 1)",
      );

      db.runSync(
        "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'hymenophore', ?)",
        card.id,
        card.hymenophore,
      );

      db.runSync(
        "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'edibility', ?)",
        card.id,
        card.status,
      );

      for (const month of card.months) {
        db.runSync(
          "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'season', ?)",
          card.id,
          String(month),
        );
      }

      if (card.confusionRisks) {
        card.confusionRisks.forEach((risk, index) => {
          const pairId = `${card.id}__${risk.confusedWithId}`;
          db.runSync(
            `INSERT OR REPLACE INTO look_alike_pairs (
              id, source_species_id, lookalike_species_id, fatal, review_status, order_index
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            pairId,
            card.id,
            risk.confusedWithId,
            risk.fatal ? 1 : 0,
            'approved',
            index,
          );
          db.runSync(
            `INSERT OR REPLACE INTO look_alike_texts (
              pair_id, locale, key_differences_json, source_trait, lookalike_trait
            ) VALUES (?, ?, ?, ?, ?)`,
            pairId,
            'pl',
            JSON.stringify(risk.keyDifferences),
            '',
            '',
          );
        });
      }
    }
  } catch (err) {
    console.warn('[species-db] seedFallbackDatabase error:', err);
  }
}

/** Inicjalizuje bazę danych gatunków przed startem UI. */
export async function initSpeciesDbAsync(databaseName = 'species.db'): Promise<void> {
  if (overrideDb) return;
  try {
    const freshDb = openDatabaseSync(databaseName);
    if (!checkDatabasePopulated(freshDb)) {
      seedFallbackDatabase(freshDb);
    }
  } catch (err) {
    console.warn('[species-db] initSpeciesDbAsync error:', err);
  }
}

/** Pobiera instancję bazy danych species.db w trybie odczytu. */
export function getSpeciesDb(databaseName = 'species.db'): SpeciesSql {
  if (overrideDb) return overrideDb;
  if (instance) return instance;

  const db: SQLiteDatabase = openDatabaseSync(databaseName);
  if (!checkDatabasePopulated(db)) {
    seedFallbackDatabase(db);
  }

  instance = {
    exec: (sql: string) => {
      db.execSync(sql);
    },
    run: (sql: string, params: readonly SqlValue[] = []) => {
      db.runSync(sql, ...(params as (string | number | null | Uint8Array)[]));
    },
    all: <T extends Record<string, SqlValue>>(
      sql: string,
      params: readonly SqlValue[] = [],
    ): T[] => {
      return db.getAllSync<T>(sql, ...(params as (string | number | null | Uint8Array)[]));
    },
  };
  return instance;
}
