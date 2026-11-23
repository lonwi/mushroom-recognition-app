import {
  deleteDatabaseSync,
  importDatabaseFromAssetAsync,
  openDatabaseSync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { foldForSearch } from '@/core/db/fold-search';
import {
  FALLBACK_CONTENT_VERSION,
  shouldReplaceDatabaseWithAsset,
  speciesDbSourceFromVersions,
  type SpeciesDbSource,
} from '@/core/db/species-db-source';
import { SPECIES_DDL } from '@/core/db/species-ddl';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';
import speciesDbAssetId from '@/infra/db/species-db-asset';
import donorCardsData from '../../../data/sources/donor-cards.json';

let overrideDb: SpeciesSql | null = null;
let instance: SpeciesSql | null = null;
let nativeDb: SQLiteDatabase | null = null;
let openInfo: SpeciesDbOpenInfo | null = null;
let opening: Promise<void> | null = null;

export type SpeciesDbOpenInfo = {
  source: SpeciesDbSource;
  openMilliseconds: number;
  speciesCount: number | null;
  ftsCount: number | null;
  contentVersions: readonly string[];
  /** Czy to otwarcie skopiowało asset nad pusty plik albo nad siew. */
  importedAsset: boolean;
  error: string | null;
};

/** Wynik pierwszego otwarcia w tym procesie. Ekran spike'a C stąd bierze źródło i czas. */
export function getSpeciesDbOpenInfo(): SpeciesDbOpenInfo | null {
  return openInfo;
}

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
        FALLBACK_CONTENT_VERSION,
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
          const pairId = `${card.id}__${risk.confusedWithId}__${index}`;
          db.runSync(
            `INSERT OR REPLACE INTO look_alike_pairs (
              id, species_id, lookalike_species_id, fatal, review_status, pair_group, sort_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            pairId,
            card.id,
            risk.confusedWithId,
            risk.fatal ? 1 : 0,
            'approved',
            'karta',
            index,
          );
          db.runSync(
            `INSERT OR REPLACE INTO look_alike_texts (
              pair_id, locale, traits
            ) VALUES (?, ?, ?)`,
            pairId,
            'pl',
            risk.keyDifferences.join('\n'),
          );
          db.runSync(
            `INSERT OR REPLACE INTO look_alike_texts (
              pair_id, locale, traits
            ) VALUES (?, ?, ?)`,
            pairId,
            'en',
            risk.keyDifferences.join('\n'),
          );
        });
      }
    }
  } catch (err) {
    console.warn('[species-db] seedFallbackDatabase error:', err);
  }
}

function clock(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się otworzyć bazy.';
}

function wrap(db: SQLiteDatabase): SpeciesSql {
  return {
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
}

function readVersions(db: SQLiteDatabase): string[] {
  const rows = db.getAllSync<{ content_version: string }>(
    'SELECT DISTINCT content_version FROM species',
  );
  return rows.map((row) => row.content_version);
}

function readCount(db: SQLiteDatabase, table: 'species' | 'species_fts'): number {
  const rows = db.getAllSync<{ count: number }>(`SELECT count(*) as count FROM ${table}`);
  return rows[0]?.count ?? 0;
}

function remember(
  db: SQLiteDatabase,
  started: number,
  importedAsset: boolean,
  error: string | null,
): void {
  nativeDb = db;
  instance = wrap(db);
  let speciesCount: number | null = null;
  let ftsCount: number | null = null;
  let contentVersions: string[] = [];
  let source: SpeciesDbSource = 'fallback';
  try {
    contentVersions = readVersions(db);
    source = speciesDbSourceFromVersions(contentVersions);
    speciesCount = readCount(db, 'species');
    ftsCount = readCount(db, 'species_fts');
  } catch (err) {
    error = error ?? errorText(err);
  }
  openInfo = {
    source,
    openMilliseconds: clock() - started,
    speciesCount,
    ftsCount,
    contentVersions,
    importedAsset: importedAsset && source === 'asset',
    error,
  };
}

function assetIsBundled(): boolean {
  return typeof speciesDbAssetId === 'number';
}

/**
 * `openDatabaseSync` tworzy pusty plik, więc import musi iść z forceOverwrite.
 * Najpierw zamykamy połączenie i kasujemy plik razem z -wal/-shm, potem kopiujemy asset.
 * To jest ten sam import, którego używa SQLiteProvider (`assetSource`).
 */
async function replaceWithBundledAsset(databaseName: string, assetId: number): Promise<void> {
  if (nativeDb) {
    nativeDb.closeSync();
    nativeDb = null;
    instance = null;
  }
  try {
    deleteDatabaseSync(databaseName);
  } catch {
    // Pusty albo już skasowany plik. Kopiowanie assetu i tak nadpisuje główny plik.
  }
  await importDatabaseFromAssetAsync(databaseName, { assetId, forceOverwrite: true });
}

async function populate(databaseName: string): Promise<void> {
  const started = clock();
  try {
    let db = nativeDb ?? openDatabaseSync(databaseName);
    let importedAsset = false;
    const assetId = speciesDbAssetId;
    if (
      typeof assetId === 'number' &&
      shouldReplaceDatabaseWithAsset({
        assetBundled: true,
        populated: checkDatabasePopulated(db),
        source: checkDatabasePopulated(db)
          ? speciesDbSourceFromVersions(readVersions(db))
          : 'fallback',
      })
    ) {
      db.closeSync();
      nativeDb = null;
      instance = null;
      await replaceWithBundledAsset(databaseName, assetId);
      importedAsset = true;
      db = openDatabaseSync(databaseName);
    }
    if (!checkDatabasePopulated(db)) seedFallbackDatabase(db);
    remember(db, started, importedAsset, null);
  } catch (err) {
    console.warn('[species-db] initSpeciesDbAsync error:', err);
    try {
      const db = openDatabaseSync(databaseName);
      if (!checkDatabasePopulated(db)) seedFallbackDatabase(db);
      remember(db, started, false, errorText(err));
    } catch (inner) {
      openInfo = {
        source: 'fallback',
        openMilliseconds: clock() - started,
        speciesCount: null,
        ftsCount: null,
        contentVersions: [],
        importedAsset: false,
        error: errorText(inner),
      };
    }
  }
}

/** Inicjalizuje bazę danych gatunków przed startem UI. */
export async function initSpeciesDbAsync(databaseName = 'species.db'): Promise<void> {
  if (overrideDb) return;
  if (openInfo?.source === 'asset' && instance) return;
  if (!assetIsBundled() && openInfo && instance) return;
  if (!opening) {
    // Skończona próba nie zostaje w `opening`. Kolejny init powtarza import,
    // gdy asset jest w paczce, a poprzednie kopiowanie spadło na siew.
    const attempt = populate(databaseName).finally(() => {
      if (opening === attempt) opening = null;
    });
    opening = attempt;
  }
  await opening;
}

/** Pobiera instancję bazy danych species.db w trybie odczytu. */
export function getSpeciesDb(databaseName = 'species.db'): SpeciesSql {
  if (overrideDb) return overrideDb;
  if (instance) return instance;

  const started = clock();
  const db = openDatabaseSync(databaseName);
  if (!checkDatabasePopulated(db)) seedFallbackDatabase(db);
  remember(db, started, false, null);
  if (!instance) {
    throw new Error('Baza gatunków nie została otwarta.');
  }
  return instance;
}
