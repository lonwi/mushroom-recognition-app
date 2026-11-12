import { importDatabaseFromAssetAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import speciesDbAsset from '../../../assets/db/species.db';
import { foldForSearch } from '@/core/db/fold-search';
import { SPECIES_DDL } from '@/core/db/species-ddl';
import type { SpeciesSql, SqlValue } from '@/core/db/sql-db';

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

interface FallbackSpeciesSeed {
  id: string;
  latinName: string;
  genus: string;
  edibility: string;
  hymenophore: string;
  months: number[];
  name: string;
  warning: string;
  habitat: string;
  cap: string;
  stem: string;
  flesh: string;
  nicknames: string;
}

const FALLBACK_SPECIES: FallbackSpeciesSeed[] = [
  {
    id: 'boletus_edulis',
    latinName: 'Boletus edulis',
    genus: 'Boletus',
    edibility: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10, 11],
    name: 'Borowik szlachetny',
    warning: '',
    habitat: 'Lasy iglaste i mieszane, pod świerkami i sosnami',
    cap: 'Poduszkowaty, brązowy, gładki, 6-25 cm',
    stem: 'Baryłkowaty, z białą siateczką w górnej części',
    flesh: 'Biały, niezmienny po przekrojeniu, orzechowy zapach',
    nicknames: 'prawdziwek, borowik, prawdziwka',
  },
  {
    id: 'amanita_phalloides',
    latinName: 'Amanita phalloides',
    genus: 'Amanita',
    edibility: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    name: 'Muchomor zielonawy',
    warning: 'Śmiertelnie trujący! Zawiera amanitotoksyny niszczące wątrobę i nerki.',
    habitat: 'Lasy liściaste i mieszane, pod dębami, bukami i grabami',
    cap: 'Oliwkowozielony do żółtawozielonego, gładki z delikatnymi promienistymi włókienkami',
    stem: 'Białawy z zielonkawym zygzakowatym wzorem, wyraźny wiszący pierścień, bulwa w wiotkiej pochwie',
    flesh: 'Biały, pod skórką lekko zielonawy, słodkawy mdlący zapach',
    nicknames: 'muchomor sromotnikowy, sromotnik',
  },
  {
    id: 'cantharellus_cibarius',
    latinName: 'Cantharellus cibarius',
    genus: 'Cantharellus',
    edibility: 'EDIBLE',
    hymenophore: 'FOLDS',
    months: [6, 7, 8, 9, 10],
    name: 'Pieprznik jadalny',
    warning: '',
    habitat: 'Lasy iglaste i liściaste, w mchu, pod sosnami i świerkami',
    cap: 'Lejkowaty o pofałdowanym brzegu, intensywnie żółty',
    stem: 'Zwężający się ku dołowi, barwy kapelusza',
    flesh: 'Białawy, twardy, zapach owocowy (morelowy), lekko pieprzny smak',
    nicknames: 'kurka, lisica, pieprzyk',
  },
  {
    id: 'macrolepiota_procera',
    latinName: 'Macrolepiota procera',
    genus: 'Macrolepiota',
    edibility: 'EDIBLE',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10, 11],
    name: 'Czubajka kania',
    warning: 'Spożywać tylko kapelusze po usmażeniu. Trzon zdrewniały.',
    habitat: 'Obrzeża lasów, polany, zręby, pobocza leśnych dróg',
    cap: 'Parasolowaty z brunatnymi łuskami i garbkiem pośrodku, 10-30 cm',
    stem: 'Wysoki, smukły, poprzecznie łuskowaty, z ruchomym pierścieniem',
    flesh: 'Biały, miękki, watowaty w kapeluszu, przyjemny orzechowy zapach',
    nicknames: 'kania, sowa, parasolnik',
  },
  {
    id: 'tylopilus_felleus',
    latinName: 'Tylopilus felleus',
    genus: 'Tylopilus',
    edibility: 'INEDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    name: 'Goryczak żółciowy',
    warning: 'Niejadalny z powodu skrajnie gorzkiego smaku. Psuje całą potrawę.',
    habitat: 'Lasy iglaste, piaszczyste gleby, kwaśne podłoże pod sosnami',
    cap: 'Gładki, poduszkowaty, jasnobrązowy do szarobrązowego',
    stem: 'Z wyrazistą, ciemną, wypukłą siateczką na oliwkowobrązowym tle',
    flesh: 'Białawy, na przekroju lekko różowiejący, gorzki smak',
    nicknames: 'szatan, goryczak, borowik szatański (błędnie)',
  },
  {
    id: 'amanita_muscaria',
    latinName: 'Amanita muscaria',
    genus: 'Amanita',
    edibility: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10, 11],
    name: 'Muchomor czerwony',
    warning: 'Trujący! Zawiera kwas ibotenowy i muscymol. Powoduje zaburzenia neurologiczne.',
    habitat: 'Lasy iglaste i liściaste, zwłaszcza pod brzozami i świerkami',
    cap: 'Czerwony do pomarańczowoczerwonego z białymi łatkami, 8-20 cm',
    stem: 'Biały z trwałym zwisającym pierścieniem i bulwiastą podstawą z brodawkami',
    flesh: 'Biały, pod skórką żółtawoczerwony, bez wyraźnego zapachu',
    nicknames: 'muchar, muchomor',
  },
  {
    id: 'leccinum_scabrum',
    latinName: 'Leccinum scabrum',
    genus: 'Leccinum',
    edibility: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    name: 'Koźlarz babka',
    warning: '',
    habitat: 'Wyłącznie pod brzozami w lasach liściastych i na torfowiskach',
    cap: 'Poduszkowaty, szarobrązowy do ciemnobrązowego, suchy',
    stem: 'Smukły, białawy, pokryty gęstymi ciemnobrązowymi łuseczkami',
    flesh: 'Biały, niezmieniający barwy na przekroju, łagodny smak',
    nicknames: 'babka, koźlak, kozak',
  },
];

function seedFallbackDatabase(db: SQLiteDatabase): void {
  try {
    db.execSync(SPECIES_DDL);

    for (const item of FALLBACK_SPECIES) {
      db.runSync(
        `INSERT OR REPLACE INTO species (
          id, latin_name, genus, edibility, status_disputed, in_model,
          incomplete_card, content_version, hymenophore, months_json,
          family, high_stakes, card_origin, incomplete_fields
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.latinName,
        item.genus,
        item.edibility,
        0,
        1,
        0,
        '2026-11-fallback',
        item.hymenophore,
        JSON.stringify(item.months),
        null,
        item.edibility === 'DEADLY_POISONOUS' ? 1 : 0,
        'fallback_seed',
        '[]',
      );

      db.runSync(
        `INSERT OR REPLACE INTO species_texts (
          species_id, locale, name, warning, note, cap, hymenophore, stem, flesh, habitat, taste, nicknames
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        'pl',
        item.name,
        item.warning,
        '',
        item.cap,
        item.hymenophore,
        item.stem,
        item.flesh,
        item.habitat,
        '',
        item.nicknames,
      );

      const folded = foldForSearch(`${item.name} ${item.latinName} ${item.nicknames}`);
      db.runSync(
        'INSERT OR REPLACE INTO species_fts (species_id, search_folded) VALUES (?, ?)',
        item.id,
        folded,
      );

      db.runSync(
        "INSERT OR IGNORE INTO atlas_facet (facet, enabled) VALUES ('hymenophore', 1), ('season', 1), ('habitat', 1), ('edibility', 1)",
      );

      db.runSync(
        "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'hymenophore', ?)",
        item.id,
        item.hymenophore,
      );

      db.runSync(
        "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'edibility', ?)",
        item.id,
        item.edibility,
      );

      for (const month of item.months) {
        db.runSync(
          "INSERT OR REPLACE INTO atlas_feature (species_id, facet, value) VALUES (?, 'season', ?)",
          item.id,
          String(month),
        );
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
    const db = openDatabaseSync(databaseName);
    if (!checkDatabasePopulated(db)) {
      try {
        await importDatabaseFromAssetAsync(databaseName, {
          assetId: speciesDbAsset,
          forceOverwrite: true,
        });
        instance = null;
      } catch (assetErr) {
        console.warn('[species-db] Asset import skipped/failed:', assetErr);
      }
    }
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
