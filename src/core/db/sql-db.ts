export type SqlValue = string | number | null;

export interface SpeciesSql {
  exec(sql: string): void;
  run(sql: string, params?: readonly SqlValue[]): void;
  all<T extends Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): T[];
}

const TABLE_NAME = /^[a-z_]+$/;

export function insertRow(db: SpeciesSql, table: string, row: Record<string, SqlValue>): void {
  if (!TABLE_NAME.test(table)) throw new Error(`Niedozwolona tabela: ${table}`);
  const keys = Object.keys(row);
  for (const key of keys) {
    if (!/^[a-z0-9_]+$/.test(key)) throw new Error(`Niedozwolona kolumna: ${key}`);
  }
  db.run(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((key) => row[key] ?? null),
  );
}
