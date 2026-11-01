/**
 * Species catalog with synchronous access.
 *
 * The atlas and scanner call `getSpecies` synchronously, so the catalog holds
 * the current dataset in memory instead of reading storage on every call. The
 * in-memory dataset starts as the bundled offline baseline and is replaced only
 * after a validated remote refresh (see `rehydrateSpeciesDataset`). This keeps
 * every existing synchronous consumer working while allowing the underlying data
 * to be refreshed without an app reinstall.
 */
import type { MushroomSpecies } from '../types/mushroom';
import type { SpeciesDataset } from '../services/speciesData';
import { bundledBaselineDataset } from '../services/speciesData';

let currentDataset: SpeciesDataset = bundledBaselineDataset();
let speciesById: ReadonlyMap<string, MushroomSpecies> = buildIndex(currentDataset.species);

function buildIndex(species: MushroomSpecies[]): ReadonlyMap<string, MushroomSpecies> {
  return new Map(species.map((species) => [species.id, species]));
}

/**
 * Replace the in-memory dataset after a validated remote refresh. Returns false
 * when `dataset` is null, leaving the current dataset untouched.
 */
export function rehydrateSpeciesDataset(dataset: SpeciesDataset | null): boolean {
  if (!dataset || dataset.species.length === 0) {
    return false;
  }
  currentDataset = dataset;
  speciesById = buildIndex(dataset.species);
  return true;
}

/** The current dataset, including its version. */
export function currentSpeciesDataset(): SpeciesDataset {
  return currentDataset;
}

/** The current dataset version, e.g. "2026-10-31". */
export function currentDatasetVersion(): string {
  return currentDataset.datasetVersion;
}

export function getSpecies(id: string): MushroomSpecies | undefined {
  return speciesById.get(id);
}

/** All current species. Callers that need the count should use `currentSpeciesDataset`. */
export function allSpecies(): readonly MushroomSpecies[] {
  return currentDataset.species;
}

