import {
  emergencyContactViolations,
  emergencyNumberPattern,
} from '@/core/safety/emergency-contacts';
import { preparationHits } from '@/core/db/preparation-text';
import { uiLicense } from '@/core/db/ui-license';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';

const TEXT_SCANS: { table: string; id: string; columns: string[] }[] = [
  {
    table: 'species_texts',
    id: 'species_id',
    columns: [
      'name',
      'warning',
      'note',
      'cap',
      'hymenophore',
      'stem',
      'flesh',
      'habitat',
      'taste',
      'nicknames',
    ],
  },
  { table: 'look_alike_texts', id: 'pair_id', columns: ['traits'] },
  { table: 'uncovered_look_alikes', id: 'id', columns: ['warning'] },
  {
    table: 'generated_images',
    id: 'id',
    columns: ['prompt', 'negative_prompt', 'review_notes'],
  },
  { table: 'species', id: 'id', columns: ['latin_name', 'family'] },
];

const FORBIDDEN_COLUMN = /culin|preparat|recipe|obrob|instruction/i;
const IDENTIFIER = /^[a-z_]+$/;
const DANGEROUS_GENERA = ['Amanita', 'Galerina', 'Lepiota'];

export interface GateOptions {
  phrases: readonly string[];
  requiredClassIds: readonly string[];
  manifestClassIds: readonly string[];
}

function query<T extends Record<string, SqlValue>>(
  db: SpeciesSql,
  sql: string,
  params: readonly SqlValue[] = [],
): T[] {
  return db.all<T>(sql, params);
}

function enabledLocales(db: SpeciesSql): string[] {
  return query<{ locale: string }>(
    db,
    'SELECT locale FROM content_locale WHERE enabled = 1 ORDER BY locale',
  ).map((row) => row.locale);
}

export function evaluateContentGates(db: SpeciesSql, options: GateOptions): string[] {
  const violations: string[] = [];
  violations.push(...emergencyContactViolations());
  if (enabledLocales(db).length === 0) violations.push('żadne locale nie jest włączone');
  violations.push(...forbiddenColumns(db));
  violations.push(...missingWarnings(db));
  violations.push(...missingNotes(db));
  violations.push(...missingClasses(db, options));
  violations.push(...photoViolations(db));
  violations.push(...preparationViolations(db, options.phrases));
  violations.push(...phoneViolations(db));
  violations.push(...illustrationViolations(db));
  return violations;
}

function forbiddenColumns(db: SpeciesSql): string[] {
  const violations: string[] = [];
  const tables = query<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')",
  );
  for (const table of tables) {
    if (!IDENTIFIER.test(table.name) || table.name.startsWith('sqlite_')) continue;
    const columns = query<{ name: string }>(db, `PRAGMA table_info(${table.name})`);
    for (const column of columns) {
      if (FORBIDDEN_COLUMN.test(column.name)) {
        violations.push(`${table.name}.${column.name}: kolumna wygląda na instrukcję obróbki`);
      }
    }
  }
  return violations;
}

function missingWarnings(db: SpeciesSql): string[] {
  const violations: string[] = [];
  for (const locale of enabledLocales(db)) {
    const rows = query<{ id: string }>(
      db,
      `SELECT s.id AS id FROM species s
       WHERE s.edibility IN ('POISONOUS', 'DEADLY_POISONOUS')
         AND NOT EXISTS (
           SELECT 1 FROM species_texts t
           WHERE t.species_id = s.id AND t.locale = ? AND length(trim(t.warning)) > 0
         )
       ORDER BY s.id`,
      [locale],
    );
    for (const row of rows) {
      violations.push(`${row.id}: brak ostrzeżenia w locale ${locale}`);
    }
  }
  return violations;
}

function missingNotes(db: SpeciesSql): string[] {
  const violations: string[] = [];
  for (const locale of enabledLocales(db)) {
    const rows = query<{ id: string }>(
      db,
      `SELECT s.id AS id FROM species s
       WHERE (s.edibility = 'CONDITIONALLY_EDIBLE' OR s.status_disputed = 1)
         AND NOT EXISTS (
           SELECT 1 FROM species_texts t
           WHERE t.species_id = s.id AND t.locale = ? AND length(trim(t.note)) > 0
         )
       ORDER BY s.id`,
      [locale],
    );
    for (const row of rows) {
      violations.push(`${row.id}: brak notki przy statusie spornym lub warunkowym (${locale})`);
    }
  }
  return violations;
}

function missingClasses(db: SpeciesSql, options: GateOptions): string[] {
  const present = new Set(
    query<{ class_id: string }>(db, 'SELECT class_id FROM model_class_species').map(
      (row) => row.class_id,
    ),
  );
  const required = new Set([...options.requiredClassIds, ...options.manifestClassIds]);
  return [...required]
    .filter((classId) => !present.has(classId))
    .sort()
    .map((classId) => `${classId}: brak wiersza w model_class_species`);
}

function photoViolations(db: SpeciesSql): string[] {
  const violations: string[] = [];
  const photos = query<{ id: string; license: string; species_id: string }>(
    db,
    'SELECT id, license, species_id FROM species_photos',
  );
  const counts = new Map<string, number>();
  for (const photo of photos) {
    counts.set(photo.species_id, (counts.get(photo.species_id) ?? 0) + 1);
    if (!uiLicense(photo.license)) {
      violations.push(`${photo.id}: licencja spoza CC0/CC BY`);
    }
  }
  for (const [speciesId, count] of counts) {
    if (count > 3) violations.push(`${speciesId}: więcej niż 3 zdjęcia w APK`);
  }
  return violations;
}

function preparationViolations(db: SpeciesSql, phrases: readonly string[]): string[] {
  const violations: string[] = [];
  for (const scan of TEXT_SCANS) {
    const columns = scan.columns.join(', ');
    const rows = query<Record<string, string | null>>(
      db,
      `SELECT ${scan.id} AS row_id, ${columns} FROM ${scan.table}`,
    );
    for (const row of rows) {
      for (const column of scan.columns) {
        const value = row[column];
        if (typeof value !== 'string' || value.length === 0) continue;
        const hits = preparationHits(value, phrases);
        if (hits.length > 0) {
          violations.push(
            `${scan.table}.${String(row.row_id)}.${column}: słownik obróbki (${hits.join(', ')})`,
          );
        }
      }
    }
  }
  return violations;
}

function phoneViolations(db: SpeciesSql): string[] {
  const violations: string[] = [];
  for (const scan of TEXT_SCANS) {
    const columns = scan.columns.join(', ');
    const rows = query<Record<string, string | null>>(
      db,
      `SELECT ${scan.id} AS row_id, ${columns} FROM ${scan.table}`,
    );
    for (const row of rows) {
      for (const column of scan.columns) {
        const value = row[column];
        if (typeof value !== 'string') continue;
        if (emergencyNumberPattern().test(value)) {
          violations.push(
            `${scan.table}.${String(row.row_id)}.${column}: numer alarmowy poza modułem`,
          );
        }
      }
    }
  }
  return violations;
}

function illustrationViolations(db: SpeciesSql): string[] {
  const violations: string[] = [];
  const images = query<Record<string, SqlValue>>(db, 'SELECT * FROM generated_images');
  const photoHashes = new Set(
    query<{ sha256: string }>(db, 'SELECT sha256 FROM species_photos').map((row) => row.sha256),
  );
  for (const image of images) {
    const id = String(image.id);
    if (image.label !== 'ilustracja')
      violations.push(`${id}: etykieta ryciny nie jest „ilustracja”`);
    if (image.excluded_from_training !== 1) {
      violations.push(`${id}: rycina nie jest wyłączona z treningu`);
    }
    if (image.file_present === 0 && image.review_status !== 'pending') {
      violations.push(`${id}: brak pliku, a status nie jest pending`);
    }
    if (typeof image.sha256 === 'string' && photoHashes.has(image.sha256)) {
      violations.push(`${id}: sha256 ryciny jest też w galerii zdjęć`);
    }
    violations.push(...baseLicenseViolations(id, image.base_photo_licenses ?? null));
    violations.push(
      ...sentPhotoViolations(id, image.params_json ?? null, image.base_photo_licenses ?? null),
    );
  }
  const unsafePilot = query<{ id: string }>(
    db,
    `SELECT g.id AS id FROM generated_images g
     JOIN species s ON s.id = g.species_id
     WHERE g.kind IN ('ilustracja_zdjecie', 'zblizenie_cechy')
       AND (
         s.edibility IN ('POISONOUS', 'DEADLY_POISONOUS', 'CONDITIONALLY_EDIBLE')
         OR s.status_disputed = 1
         OR NOT EXISTS (SELECT 1 FROM illustration_pilot p WHERE p.species_id = g.species_id)
       )`,
  );
  for (const row of unsafePilot) {
    violations.push(`${row.id}: ilustracja ze zdjęcia poza pilotażem albo przy statusie ostrym`);
  }
  const genera = DANGEROUS_GENERA.map(() => '?').join(', ');
  const missingFeaturePhoto = query<{ id: string }>(
    db,
    `SELECT g.id AS id FROM generated_images g
     JOIN species s ON s.id = g.species_id
     WHERE g.review_status = 'approved'
       AND s.genus IN (${genera})
       AND NOT EXISTS (
         SELECT 1 FROM species_photos p
         WHERE p.species_id = g.species_id AND p.feature_tag = g.feature
       )`,
    DANGEROUS_GENERA,
  );
  for (const row of missingFeaturePhoto) {
    violations.push(
      `${row.id}: zatwierdzona rycina Amanita/Galerina/Lepiota bez zdjęcia tej cechy`,
    );
  }
  return violations;
}

function baseLicenseViolations(id: string, raw: SqlValue): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [`${id}: base_photo_licenses nie jest JSON`];
  }
  if (!Array.isArray(parsed)) return [`${id}: base_photo_licenses nie jest tablicą`];
  const violations: string[] = [];
  for (const item of parsed) {
    const license =
      item && typeof item === 'object' && 'license' in item ? String(item.license) : '';
    if (!uiLicense(license)) violations.push(`${id}: baza ryciny spoza CC0/CC BY`);
  }
  return violations;
}

function sentPhotoViolations(id: string, raw: SqlValue, licenses: SqlValue): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [`${id}: params_json nie jest JSON`];
  }
  if (!parsed || typeof parsed !== 'object' || !('photos_sent_to_generator' in parsed)) return [];
  const sent = parsed.photos_sent_to_generator;
  const hasLicenses = typeof licenses === 'string' && licenses.trim() !== '' && licenses !== '[]';
  if (Array.isArray(sent) && sent.length > 0 && !hasLicenses) {
    return [`${id}: do generatora poszły zdjęcia, a brakuje licencji bazowych`];
  }
  return [];
}
