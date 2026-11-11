import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';

let overrideDb: SpeciesSql | null = null;
let instance: SpeciesSql | null = null;

/** Pozwala testom wstrzyknąć bazę zastępczą (np. in-memory SQLite). */
export function setSpeciesDb(db: SpeciesSql | null): void {
  overrideDb = db;
}

/** Pobiera instancję bazy danych species.db w trybie odczytu. */
export function getSpeciesDb(databaseName = 'species.db'): SpeciesSql {
  if (overrideDb) return overrideDb;
  if (instance) return instance;

  const db: SQLiteDatabase = openDatabaseSync(databaseName);
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
