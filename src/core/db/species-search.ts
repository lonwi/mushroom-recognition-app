import { foldForSearch, toFtsQuery } from '@/core/db/fold-search';
import type { Edibility } from '@/core/db/assemble-catalog';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';

export { foldForSearch };

/**
 * Bezpieczne budowanie zapytania prefiksowego FTS5 (alias dla toFtsQuery wg D8/D13).
 * Zwraca null dla pustego wejścia lub samych znaków niedozwolonych.
 */
export function buildSpeciesMatch(raw: string): string | null {
  return toFtsQuery(raw);
}

export interface SpeciesFilter {
  query?: string;
  edibility?: readonly string[];
  hymenophore?: readonly string[];
  season?: readonly number[]; // miesiące 1..12
  habitat?: readonly string[];
  locale?: string; // domyślnie 'pl'
  limit?: number; // domyślnie 30
  offset?: number; // domyślnie 0
}

export interface SpeciesListItem {
  id: string;
  name: string;
  latinName: string;
  genus: string;
  edibility: Edibility | null;
  statusDisputed: boolean;
  inModel: boolean;
  incompleteCard: boolean;
  hymenophore: string | null;
  months: number[];
  primaryPhoto: {
    file: string;
    license: string;
    author: string;
  } | null;
  warning: string;
}

export interface SpeciesDetail {
  id: string;
  name: string;
  latinName: string;
  genus: string;
  family: string | null;
  edibility: Edibility | null;
  statusDisputed: boolean;
  inModel: boolean;
  incompleteCard: boolean;
  incompleteFields: string[];
  hymenophore: string | null;
  months: number[];
  warning: string;
  note: string;
  cap: string;
  hymenophoreDescription: string;
  stem: string;
  flesh: string;
  habitat: string;
  taste: string;
  nicknames: string[];
  photos: {
    id: string;
    file: string;
    license: string;
    licenseUrl: string;
    author: string;
    source: string;
    sourceUrl: string;
    featureTag: string | null;
  }[];
  lookAlikes: {
    id: string;
    lookalikeId: string;
    lookalikeName: string;
    lookalikeLatin: string;
    lookalikeEdibility: Edibility | null;
    fatal: boolean;
    traits: string;
    reviewStatus: string;
  }[];
  uncoveredLookAlikes: {
    id: string;
    lookalikeId: string;
    lookalikeName: string;
    lookalikeLatin: string;
    lookalikeEdibility: Edibility | null;
    warning: string;
    fatal: boolean;
  }[];
  illustrations: {
    id: string;
    feature: string;
    kind: string;
    file: string;
    label: string;
    reviewStatus: string;
  }[];
}

interface SqlClause {
  sql: string;
  params: SqlValue[];
}

const HYMENOPHORE_MAP: Record<string, string> = {
  rurki: 'TUBES',
  blaszki: 'GILLS',
  listewki: 'FOLDS',
  kolce: 'SPINES',
  inny: 'OTHER',
};

function buildWhere(
  filter: SpeciesFilter,
  ftsMatch: string | null,
  locale: string,
): { whereSql: string; params: SqlValue[] } {
  const conditions: string[] = ['t.locale = ?'];
  const params: SqlValue[] = [locale];

  if (ftsMatch) {
    conditions.push('fts.species_fts MATCH ?');
    params.push(ftsMatch);
  }

  if (filter.edibility && filter.edibility.length > 0) {
    const placeholders = filter.edibility.map(() => '?').join(', ');
    conditions.push(`s.edibility IN (${placeholders})`);
    params.push(...filter.edibility);
  }

  if (filter.hymenophore && filter.hymenophore.length > 0) {
    const values = new Set<string>();
    for (const item of filter.hymenophore) {
      values.add(item);
      const mapped = HYMENOPHORE_MAP[item.toLowerCase()];
      if (mapped) values.add(mapped);
    }
    const valArray = Array.from(values);
    const placeholders = valArray.map(() => '?').join(', ');
    conditions.push(
      `(s.hymenophore IN (${placeholders}) OR s.id IN (SELECT species_id FROM atlas_feature WHERE facet = 'hymenophore' AND value IN (${placeholders})))`,
    );
    params.push(...valArray, ...valArray);
  }

  if (filter.season && filter.season.length > 0) {
    const placeholders = filter.season.map(() => '?').join(', ');
    conditions.push(
      `s.id IN (SELECT species_id FROM atlas_feature WHERE facet = 'season' AND value IN (${placeholders}))`,
    );
    params.push(...filter.season.map((month) => String(month)));
  }

  if (filter.habitat && filter.habitat.length > 0) {
    const placeholders = filter.habitat.map(() => '?').join(', ');
    conditions.push(
      `s.id IN (SELECT species_id FROM atlas_feature WHERE facet = 'habitat' AND value IN (${placeholders}))`,
    );
    params.push(...filter.habitat);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

/** Buduje zapytanie wyszukiwania / filtrowania listy gatunków */
function buildSpeciesSearchQuery(filter: SpeciesFilter): SqlClause {
  const locale = filter.locale ?? 'pl';
  const ftsMatch = filter.query ? buildSpeciesMatch(filter.query) : null;
  const { whereSql, params } = buildWhere(filter, ftsMatch, locale);

  const limit = Math.max(1, filter.limit ?? 30);
  const offset = Math.max(0, filter.offset ?? 0);

  const ftsJoin = ftsMatch ? 'JOIN species_fts fts ON fts.species_id = s.id' : '';
  const orderBy = ftsMatch ? 'ORDER BY fts.rank, t.name ASC' : 'ORDER BY t.name ASC';

  const sql = `
    SELECT
      s.id,
      s.latin_name,
      s.genus,
      s.edibility,
      s.status_disputed,
      s.in_model,
      s.incomplete_card,
      s.hymenophore,
      s.months_json,
      t.name,
      t.warning,
      p.file AS photo_file,
      p.license AS photo_license,
      p.author AS photo_author
    FROM species s
    JOIN species_texts t ON t.species_id = s.id
    ${ftsJoin}
    LEFT JOIN species_photos p ON p.species_id = s.id AND p.sort_index = 0
    ${whereSql}
    ${orderBy}
    LIMIT ? OFFSET ?
  `.trim();

  return {
    sql,
    params: [...params, limit, offset],
  };
}

/** Buduje zapytanie zliczające pasujące gatunki */
function buildSpeciesCountQuery(filter: Omit<SpeciesFilter, 'limit' | 'offset'>): SqlClause {
  const locale = filter.locale ?? 'pl';
  const ftsMatch = filter.query ? buildSpeciesMatch(filter.query) : null;
  const { whereSql, params } = buildWhere(filter, ftsMatch, locale);

  const ftsJoin = ftsMatch ? 'JOIN species_fts fts ON fts.species_id = s.id' : '';

  const sql = `
    SELECT COUNT(DISTINCT s.id) AS count
    FROM species s
    JOIN species_texts t ON t.species_id = s.id
    ${ftsJoin}
    ${whereSql}
  `.trim();

  return { sql, params };
}

interface RawListItemRow {
  id: string;
  latin_name: string;
  genus: string;
  edibility: string | null;
  status_disputed: number;
  in_model: number;
  incomplete_card: number;
  hymenophore: string | null;
  months_json: string;
  name: string;
  warning: string;
  photo_file: string | null;
  photo_license: string | null;
  photo_author: string | null;
}

/** Wyszukuje gatunki z uwzględnieniem filtrów, FTS5 i stronicowania */
export function searchSpecies(db: SpeciesSql, filter: SpeciesFilter): SpeciesListItem[] {
  const { sql, params } = buildSpeciesSearchQuery(filter);
  const rows = db.all<RawListItemRow & Record<string, SqlValue>>(sql, params);

  return rows.map((row) => {
    let months: number[] = [];
    try {
      months = JSON.parse(row.months_json) as number[];
    } catch {
      months = [];
    }

    return {
      id: row.id,
      name: row.name,
      latinName: row.latin_name,
      genus: row.genus,
      edibility: (row.edibility as Edibility) ?? null,
      statusDisputed: Boolean(row.status_disputed),
      inModel: Boolean(row.in_model),
      incompleteCard: Boolean(row.incomplete_card),
      hymenophore: row.hymenophore,
      months,
      primaryPhoto: row.photo_file
        ? {
            file: row.photo_file,
            license: row.photo_license ?? '',
            author: row.photo_author ?? '',
          }
        : null,
      warning: row.warning,
    };
  });
}

/** Zlicza liczbę pasujących gatunków dla filtrów */
export function countSpecies(
  db: SpeciesSql,
  filter: Omit<SpeciesFilter, 'limit' | 'offset'>,
): number {
  const { sql, params } = buildSpeciesCountQuery(filter);
  const rows = db.all<{ count: number } & Record<string, SqlValue>>(sql, params);
  return rows[0]?.count ?? 0;
}

interface RawSpeciesRow {
  id: string;
  latin_name: string;
  genus: string;
  edibility: string | null;
  status_disputed: number;
  in_model: number;
  incomplete_card: number;
  content_version: string;
  hymenophore: string | null;
  months_json: string;
  family: string | null;
  high_stakes: number;
  card_origin: string;
  incomplete_fields: string;
}

interface RawTextRow {
  name: string;
  warning: string;
  note: string;
  cap: string;
  hymenophore: string;
  stem: string;
  flesh: string;
  habitat: string;
  taste: string;
  nicknames: string;
}

interface RawPhotoRow {
  id: string;
  file: string;
  license: string;
  license_url: string;
  author: string;
  source: string;
  source_url: string;
  feature_tag: string | null;
}

interface RawPairRow {
  pair_id: string;
  lookalike_id: string;
  lookalike_name: string;
  lookalike_latin: string;
  lookalike_edibility: string | null;
  fatal: number;
  review_status: string;
  traits: string;
}

interface RawUncoveredRow {
  uncovered_id: string;
  lookalike_id: string;
  lookalike_name: string;
  lookalike_latin: string;
  lookalike_edibility: string | null;
  warning: string;
  fatal: number;
}

interface RawImageRow {
  id: string;
  feature: string;
  kind: string;
  file: string;
  label: string;
  review_status: string;
}

/** Pobiera pełną kartę gatunku wraz ze zdjęciami, sobowtórami i rycinami */
export function getSpeciesDetail(db: SpeciesSql, id: string, locale = 'pl'): SpeciesDetail | null {
  const speciesRows = db.all<RawSpeciesRow & Record<string, SqlValue>>(
    'SELECT * FROM species WHERE id = ?',
    [id],
  );
  const speciesRow = speciesRows[0];
  if (!speciesRow) return null;

  const textRows = db.all<RawTextRow & Record<string, SqlValue>>(
    'SELECT * FROM species_texts WHERE species_id = ? AND locale = ?',
    [id, locale],
  );
  const textRow = textRows[0];

  const photoRows = db.all<RawPhotoRow & Record<string, SqlValue>>(
    `SELECT id, file, license, license_url, author, source, source_url, feature_tag
     FROM species_photos
     WHERE species_id = ?
     ORDER BY sort_index ASC`,
    [id],
  );

  const lookAlikeRows = db.all<RawPairRow & Record<string, SqlValue>>(
    `SELECT
       p.id AS pair_id,
       p.lookalike_species_id AS lookalike_id,
       target_t.name AS lookalike_name,
       target_s.latin_name AS lookalike_latin,
       target_s.edibility AS lookalike_edibility,
       p.fatal,
       p.review_status,
       COALESCE(lt.traits, '') AS traits
     FROM look_alike_pairs p
     JOIN species target_s ON target_s.id = p.lookalike_species_id
     LEFT JOIN species_texts target_t ON target_t.species_id = target_s.id AND target_t.locale = ?
     LEFT JOIN look_alike_texts lt ON lt.pair_id = p.id AND lt.locale = ?
     WHERE p.species_id = ?
     ORDER BY p.sort_index ASC`,
    [locale, locale, id],
  );

  const uncoveredRows = db.all<RawUncoveredRow & Record<string, SqlValue>>(
    `SELECT
       u.id AS uncovered_id,
       u.lookalike_species_id AS lookalike_id,
       target_t.name AS lookalike_name,
       target_s.latin_name AS lookalike_latin,
       target_s.edibility AS lookalike_edibility,
       u.warning,
       u.fatal
     FROM uncovered_look_alikes u
     JOIN species target_s ON target_s.id = u.lookalike_species_id
     LEFT JOIN species_texts target_t ON target_t.species_id = target_s.id AND target_t.locale = ?
     WHERE u.species_id = ?`,
    [locale, id],
  );

  const imageRows = db.all<RawImageRow & Record<string, SqlValue>>(
    `SELECT id, feature, kind, file, label, review_status
     FROM generated_images
     WHERE species_id = ?
     ORDER BY id ASC`,
    [id],
  );

  let months: number[] = [];
  try {
    months = JSON.parse(speciesRow.months_json) as number[];
  } catch {
    months = [];
  }

  let nicknames: string[] = [];
  try {
    nicknames = textRow?.nicknames ? (JSON.parse(textRow.nicknames) as string[]) : [];
  } catch {
    nicknames = [];
  }

  let incompleteFields: string[] = [];
  try {
    incompleteFields = speciesRow.incomplete_fields
      ? (JSON.parse(speciesRow.incomplete_fields) as string[])
      : [];
  } catch {
    incompleteFields = [];
  }

  return {
    id: speciesRow.id,
    name: textRow?.name ?? '',
    latinName: speciesRow.latin_name,
    genus: speciesRow.genus,
    family: speciesRow.family,
    edibility: (speciesRow.edibility as Edibility) ?? null,
    statusDisputed: Boolean(speciesRow.status_disputed),
    inModel: Boolean(speciesRow.in_model),
    incompleteCard: Boolean(speciesRow.incomplete_card),
    incompleteFields,
    hymenophore: speciesRow.hymenophore,
    months,
    warning: textRow?.warning ?? '',
    note: textRow?.note ?? '',
    cap: textRow?.cap ?? '',
    hymenophoreDescription: textRow?.hymenophore ?? '',
    stem: textRow?.stem ?? '',
    flesh: textRow?.flesh ?? '',
    habitat: textRow?.habitat ?? '',
    taste: textRow?.taste ?? '',
    nicknames,
    photos: photoRows.map((photo) => ({
      id: photo.id,
      file: photo.file,
      license: photo.license,
      licenseUrl: photo.license_url,
      author: photo.author,
      source: photo.source,
      sourceUrl: photo.source_url,
      featureTag: photo.feature_tag,
    })),
    lookAlikes: lookAlikeRows.map((pair) => ({
      id: pair.pair_id,
      lookalikeId: pair.lookalike_id,
      lookalikeName: pair.lookalike_name ?? pair.lookalike_id,
      lookalikeLatin: pair.lookalike_latin,
      lookalikeEdibility: (pair.lookalike_edibility as Edibility) ?? null,
      fatal: Boolean(pair.fatal),
      traits: pair.traits,
      reviewStatus: pair.review_status,
    })),
    uncoveredLookAlikes: uncoveredRows.map((uncovered) => ({
      id: uncovered.uncovered_id,
      lookalikeId: uncovered.lookalike_id,
      lookalikeName: uncovered.lookalike_name ?? uncovered.lookalike_id,
      lookalikeLatin: uncovered.lookalike_latin,
      lookalikeEdibility: (uncovered.lookalike_edibility as Edibility) ?? null,
      warning: uncovered.warning,
      fatal: Boolean(uncovered.fatal),
    })),
    illustrations: imageRows.map((img) => ({
      id: img.id,
      feature: img.feature,
      kind: img.kind,
      file: img.file,
      label: img.label,
      reviewStatus: img.review_status,
    })),
  };
}

export interface LookAlikeSpeciesInfo {
  id: string;
  name: string;
  latinName: string;
  edibility: Edibility | null;
  statusDisputed: boolean;
  hymenophore: string | null;
  cap: string;
  hymenophoreDescription: string;
  stem: string;
  flesh: string;
  habitat: string;
  taste: string;
  photo: { file: string; license: string; author: string } | null;
}

export interface LookAlikePairDetail {
  id: string;
  fatal: boolean;
  reviewStatus: string;
  pairGroup: string;
  traits: string;
  sourceSpecies: LookAlikeSpeciesInfo;
  lookalikeSpecies: LookAlikeSpeciesInfo;
}

interface RawPairRecord {
  id: string;
  species_id: string;
  lookalike_species_id: string;
  fatal: number;
  review_status: string;
  pair_group: string;
  traits: string | null;
}

interface RawSpeciesDetailRecord {
  id: string;
  latin_name: string;
  edibility: string | null;
  status_disputed: number;
  hymenophore: string | null;
  name: string | null;
  cap: string | null;
  hymenophore_desc: string | null;
  stem: string | null;
  flesh: string | null;
  habitat: string | null;
  taste: string | null;
  photo_file: string | null;
  photo_license: string | null;
  photo_author: string | null;
}

function fetchSpeciesLookAlikeInfo(
  db: SpeciesSql,
  speciesId: string,
  locale: string,
): LookAlikeSpeciesInfo | null {
  const rows = db.all<RawSpeciesDetailRecord & Record<string, SqlValue>>(
    `SELECT
       s.id,
       s.latin_name,
       s.edibility,
       s.status_disputed,
       s.hymenophore,
       t.name,
       t.cap,
       t.hymenophore AS hymenophore_desc,
       t.stem,
       t.flesh,
       t.habitat,
       t.taste,
       p.file AS photo_file,
       p.license AS photo_license,
       p.author AS photo_author
     FROM species s
     LEFT JOIN species_texts t ON t.species_id = s.id AND t.locale = ?
     LEFT JOIN species_photos p ON p.species_id = s.id AND p.sort_index = 0
     WHERE s.id = ?`,
    [locale, speciesId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name ?? '',
    latinName: row.latin_name,
    edibility: (row.edibility as Edibility) ?? null,
    statusDisputed: Boolean(row.status_disputed),
    hymenophore: row.hymenophore,
    cap: row.cap ?? '',
    hymenophoreDescription: row.hymenophore_desc ?? '',
    stem: row.stem ?? '',
    flesh: row.flesh ?? '',
    habitat: row.habitat ?? '',
    taste: row.taste ?? '',
    photo: row.photo_file
      ? {
          file: row.photo_file,
          license: row.photo_license ?? '',
          author: row.photo_author ?? '',
        }
      : null,
  };
}

/** Pobiera dane pary sobowtórów do porównania 50/50 */
export function getLookAlikePairDetail(
  db: SpeciesSql,
  pairId: string,
  locale = 'pl',
): LookAlikePairDetail | null {
  const pairRows = db.all<RawPairRecord & Record<string, SqlValue>>(
    `SELECT
       p.id,
       p.species_id,
       p.lookalike_species_id,
       p.fatal,
       p.review_status,
       p.pair_group,
       lt.traits
     FROM look_alike_pairs p
     LEFT JOIN look_alike_texts lt ON lt.pair_id = p.id AND lt.locale = ?
     WHERE p.id = ?`,
    [locale, pairId],
  );

  const pairRow = pairRows[0];
  if (!pairRow) return null;

  const sourceSpecies = fetchSpeciesLookAlikeInfo(db, pairRow.species_id, locale);
  const lookalikeSpecies = fetchSpeciesLookAlikeInfo(db, pairRow.lookalike_species_id, locale);

  if (!sourceSpecies || !lookalikeSpecies) return null;

  return {
    id: pairRow.id,
    fatal: Boolean(pairRow.fatal),
    reviewStatus: pairRow.review_status,
    pairGroup: pairRow.pair_group,
    traits: pairRow.traits ?? '',
    sourceSpecies,
    lookalikeSpecies,
  };
}
