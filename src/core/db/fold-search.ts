const POLISH_FOLDS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'a',
  Ć: 'c',
  Ę: 'e',
  Ł: 'l',
  Ń: 'n',
  Ó: 'o',
  Ś: 's',
  Ź: 'z',
  Ż: 'z',
};

/** Składa polskie znaki, w tym „ł”, którego NFD nie rozkłada. */
export function foldForSearch(input: string): string {
  let mapped = '';
  for (const char of input) mapped += POLISH_FOLDS[char] ?? char;
  return mapped.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Zapytanie prefiksowe FTS5. Puste wejście nie buduje wzorca. */
export function toFtsQuery(raw: string): string | null {
  const tokens = foldForSearch(raw)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `"${token}"*`).join(' AND ');
}

export function speciesSearchSql(raw: string): { sql: string; args: [string] } | null {
  const match = toFtsQuery(raw);
  if (!match) return null;
  return {
    sql: 'SELECT species_id FROM species_fts WHERE species_fts MATCH ? ORDER BY species_id',
    args: [match],
  };
}
