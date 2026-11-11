import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import {
  assembleCatalog,
  type CatalogInput,
  type LookalikeFile,
} from '../src/core/db/assemble-catalog';
import { parseCsv } from '../src/core/db/csv-table';
import { evaluateContentGates } from '../src/core/db/content-gates';
import { insertCatalog } from '../src/core/db/insert-catalog';
import { SPECIES_DDL } from '../src/core/db/species-ddl';
import type { SpeciesSql, SqlValue } from '../src/core/db/sql-db';
import { importHfPhotos, readHfToken, safeError } from './import-hf-photos';

const APK_BUDGET_BYTES = 100 * 1024 * 1024;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface Options {
  root: string;
  outFile: string;
  photoDir: string;
  reportFile: string;
}

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
}

function buildOptions(root = ROOT): Options {
  return {
    root,
    outFile: path.resolve(arg('--out', path.join(root, 'assets/db/species.db'))),
    photoDir: path.resolve(arg('--photos', path.join(root, 'assets/species-photos'))),
    reportFile: path.resolve(
      arg('--report', path.join(root, 'artifacts/content-gates-report.json')),
    ),
  };
}

async function buildSpeciesDatabase(options: Options, env = process.env): Promise<number> {
  const token = readHfToken(env);
  const input = loadInput(options.root);
  const catalog = assembleCatalog(input);
  rmSync(options.photoDir, { recursive: true, force: true });
  mkdirSync(options.photoDir, { recursive: true });
  let photoImport = 'skipped_no_token';
  let photoProblems: { speciesId: string; detail: string }[] = [];
  let photos: Record<string, SqlValue>[] = [];
  if (!token) {
    console.warn(
      'Zdjęcia HF pominięte: brak sekretu HF_TOKEN_READONLY. Reszta builda i bramki idą dalej.',
    );
  } else {
    try {
      const imported = await importHfPhotos({
        token,
        classIds: input.classes.map((row) => row.classId),
        photoDir: options.photoDir,
      });
      photos = imported.rows;
      photoProblems = imported.problems;
      photoImport = 'imported';
    } catch (error) {
      throw new Error(safeError(error, token));
    }
  }

  mkdirSync(path.dirname(options.outFile), { recursive: true });
  const temporary = `${options.outFile}.building`;
  rmSync(temporary, { force: true });
  const db = openDatabase(temporary);
  try {
    db.exec(SPECIES_DDL);
    insertCatalog(db, catalog, photos);
    const manifestClassIds = loadManifestClassIds(options.root);
    const violations = evaluateContentGates(db, {
      phrases: input.phrases,
      requiredClassIds: input.classes.map((row) => row.classId),
      manifestClassIds,
    });
    const databaseBytes = statSync(temporary).size;
    const photoBytes = directoryBytes(options.photoDir);
    const totalBytes = databaseBytes + photoBytes;
    if (totalBytes > APK_BUDGET_BYTES) {
      violations.push(
        `Baza i zdjęcia mają ${totalBytes} B, a budżet wycinka APK to ${APK_BUDGET_BYTES} B`,
      );
    }
    const report = {
      contentVersion: input.contentVersion,
      builtAt: new Date().toISOString(),
      photoImport,
      photoCount: photos.length,
      photoProblems,
      speciesCount: catalog.species.length,
      classLinks: catalog.classLinks.length,
      pairReviewStatus: catalog.pairReviewStatus,
      redactions: catalog.redactions,
      excludedPairs: catalog.excludedPairs,
      statusReview: catalog.statusReview,
      gates: { ok: violations.length === 0, violations },
      bytes: {
        database: databaseBytes,
        photos: photoBytes,
        total: totalBytes,
        apkBudget: APK_BUDGET_BYTES,
        withinBudget: totalBytes <= APK_BUDGET_BYTES,
        note: 'To jest sam wycinek bazy i zdjęć. Budżet 100 MB dotyczy całego APK, razem z JS i modelem, których tu nie ma.',
      },
    };
    mkdirSync(path.dirname(options.reportFile), { recursive: true });
    writeFileSync(options.reportFile, `${JSON.stringify(report, null, 2)}\n`);
    db.close();
    rmSync(options.outFile, { force: true });
    renameSync(temporary, options.outFile);
    console.info(
      `species.db: ${catalog.species.length} kart, ${photos.length} zdjęć, ${totalBytes} B, bramki ${violations.length === 0 ? 'czyste' : violations.length}`,
    );
    if (violations.length > 0) {
      for (const violation of violations) console.error(violation);
      return 1;
    }
    return 0;
  } catch (error) {
    db.close();
    rmSync(temporary, { force: true });
    throw error;
  }
}

function openDatabase(file: string): SpeciesSql & { close: () => void } {
  const db = new DatabaseSync(file);
  return {
    exec: (sql) => {
      db.exec(sql);
    },
    run: (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    all: <T extends Record<string, SqlValue>>(sql: string, params: readonly SqlValue[] = []) =>
      db.prepare(sql).all(...params) as T[],
    close: () => {
      db.close();
    },
  };
}

function loadInput(root: string): CatalogInput {
  const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
  const classes = parseCsv(read('data/sources/pokrycie-67.csv')).map((row) => ({
    classId: row.class ?? '',
    latin: row.nazwa_lacinska ?? '',
    polish: row.nazwa_pl ?? '',
    highStakes: row.high_stakes === 'true',
    notes: row.uwagi ?? '',
  }));
  const donor = JSON.parse(read('data/sources/donor-cards.json')) as {
    cards: CatalogInput['donorCards'];
  };
  const facetsFile = JSON.parse(read('data/sources/atlas-filter-facets.json')) as {
    facets: CatalogInput['filterFacets'];
  };
  const lookalikes = JSON.parse(read('data/sources/karty-sobowtory.json')) as LookalikeFile;
  const provenance = JSON.parse(read('data/sources/provenance.json')) as {
    images: CatalogInput['provenanceImages'];
  };
  const featureFile = JSON.parse(read('data/sources/illustration-features.json')) as {
    by_file: Record<string, string>;
  };
  const phrases = JSON.parse(read('data/sources/preparation-phrases.json')) as {
    phrases: string[];
  };
  const facetFlags = JSON.parse(read('data/sources/atlas-facets.json')) as {
    facets: CatalogInput['facets'];
  };
  const locales = JSON.parse(read('data/sources/locales.json')) as {
    locales: CatalogInput['locales'];
  };
  const present = new Set<string>();
  for (const file of Object.keys(featureFile.by_file)) {
    const full = path.join(root, 'assets/illustrations', file);
    try {
      if (statSync(full).isFile()) present.add(file);
    } catch {
      // Brak pliku zostawia rycinę jako pending.
    }
  }
  return {
    contentVersion: read('data/sources/content-version.txt').trim(),
    classes,
    donorCards: donor.cards,
    filterFacets: facetsFile.facets,
    lookalikes,
    provenanceImages: provenance.images,
    featuresByFile: featureFile.by_file,
    presentIllustrationFiles: present,
    phrases: phrases.phrases,
    facets: facetFlags.facets,
    locales: locales.locales,
  };
}

function loadManifestClassIds(root: string): string[] {
  const manifest = JSON.parse(
    readFileSync(path.join(root, 'fixtures/model-manifest.example.json'), 'utf8'),
  ) as { classes?: { classId?: string }[] };
  return (manifest.classes ?? []).flatMap((row) => (row.classId ? [row.classId] : []));
}

function directoryBytes(dir: string): number {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? directoryBytes(full) : statSync(full).size;
  }
  return total;
}

const ranAsCli = process.argv[1]?.endsWith('build-species-db.ts') === true;
if (ranAsCli) {
  buildSpeciesDatabase(buildOptions())
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(safeError(error, readHfToken()));
      process.exitCode = 1;
    });
}
