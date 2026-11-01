/**
 * Species dataset loader. Bundled species.json is the offline-first baseline;
 * a remote copy can refresh it. The remote payload is validated before use so a
 * malformed or mismatched copy never reaches the UI.
 *
 * Fallback chain: fresh remote -> cached remote -> bundled baseline.
 * The app never requires a network connection.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from './storage/keyValueStore';
import { asyncStorageStore } from './storage/keyValueStore';
import { speciesManifest } from './speciesManifest';
import speciesJson from '../../assets/models/species.json';
import type { MushroomSpecies } from '../types/mushroom';
import type { RemoteSpeciesPayload } from '../types/speciesData';

/** Storage keys. The versioned key keeps the cached remote payload separately. */
export const SPECIES_CACHE_KEY = '@grzybobranie_ai:species_v1';
export const SPECIES_CACHE_VERSION_KEY = '@grzybobranie_ai:species_v1_version';

/** The schema the cached and remote payloads must satisfy. */
export const SPECIES_SCHEMA_VERSION = 1;


export interface SpeciesDataset {
  species: MushroomSpecies[];
  datasetVersion: string;
}

/**
 * Validate a parsed payload against the schema. Returns the dataset or null when
 * the payload is not the right shape or schema. `status` and `confusionRisks`
 * stay safety data, so a payload missing them is rejected.
 */
export function validateSpeciesPayload(payload: unknown): SpeciesDataset | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const candidate = payload as Partial<RemoteSpeciesPayload>;
  const manifest = candidate.manifest;
  const species = candidate.species;
  if (!manifest || typeof manifest !== 'object') {
    return null;
  }
  if (manifest.schemaVersion !== SPECIES_SCHEMA_VERSION) {
    return null;
  }
  if (!Array.isArray(species) || species.length === 0) {
    return null;
  }
  const requiredFields: (keyof MushroomSpecies)[] = [
    'id',
    'namePl',
    'nameLatin',
    'commonNicknames',
    'family',
    'status',
    'hymenophore',
    'months',
    'habitat',
    'capDescription',
    'hymenophoreDescription',
    'stemDescription',
    'fleshDescription',
    'tasteAndSmell',
    'culinaryValue',
    'confusionRisks',
  ];
  for (const item of species) {
    for (const field of requiredFields) {
      if (!(field in item)) {
        return null;
      }
    }
    if (!Array.isArray(item.confusionRisks)) {
      return null;
    }
  }
  return {
    species,
    datasetVersion: manifest.datasetVersion ?? 'unknown',
  };
}

/**
 * Read and validate the bundled baseline. Always present in the offline bundle.
 * This is the offline-first default the catalog indexes on startup.
 */
export function bundledBaselineDataset(): SpeciesDataset {
  return {
    species: speciesJson as MushroomSpecies[],
    datasetVersion: speciesManifest.datasetVersion,
  };
}

/**
 * Fetch a remote payload if `url` responds. Returns null on any failure so the
 * caller falls back to cache or baseline. The response is validated before use.
 */
export async function fetchRemoteDataset(url: string): Promise<SpeciesDataset | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return validateSpeciesPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Load the dataset. Prefers a validated cached remote copy, then the bundled
 * baseline. The cache stores the raw payload so it can be validated against the
 * current schema. A cached copy is only used when it matches the manifest schema
 * version, so a schema change forces a rebuild.
 */
export async function loadSpeciesDataset(
  cache: KeyValueStore = asyncStorageStore,
): Promise<SpeciesDataset> {
  const cachedVersion = await cache.getItem(SPECIES_CACHE_VERSION_KEY);
  if (cachedVersion && cachedVersion === speciesManifest.datasetVersion) {
    const raw = await cache.getItem(SPECIES_CACHE_KEY);
    if (raw) {
      const parsed = validateSpeciesPayload(parseRaw(raw));
      if (parsed) {
        return parsed;
      }
    }
  }
  return bundledBaselineDataset();
}

/**
 * Cache a validated remote payload. Returns the dataset that was cached, or null
 * when the payload is invalid.
 */
export async function cacheRemoteDataset(
  payload: RemoteSpeciesPayload | null,
  cache: KeyValueStore = asyncStorageStore,
): Promise<SpeciesDataset | null> {
  const dataset = validateSpeciesPayload(payload);
  if (!dataset) {
    return null;
  }
  await cache.setItem(SPECIES_CACHE_KEY, JSON.stringify(payload));
  await cache.setItem(SPECIES_CACHE_VERSION_KEY, dataset.datasetVersion);
  return dataset;
}

/** Refresh the dataset from `url`. Caches the remote copy on success. */
export async function refreshSpeciesDataset(
  url: string,
  cache: KeyValueStore = asyncStorageStore,
): Promise<SpeciesDataset> {
  const remote = await fetchRemoteDataset(url);
  if (remote) {
    const cached = await cacheRemoteDataset(
      { species: remote.species, manifest: speciesManifest } as RemoteSpeciesPayload,
      cache,
    );
    if (cached) {
      return cached;
    }
  }
  return bundledBaselineDataset();
}

function parseRaw(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
