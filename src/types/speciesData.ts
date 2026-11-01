import type { MushroomSpecies } from './mushroom';

/**
 * Descriptive contract for the packaged species asset. Kept in source control
 * so the loader is not replaced by an inlined copy. `datasetVersion` is the
 * identity the app compares when deciding whether a remote copy is newer.
 */
export interface SpeciesManifest {
  /** Bump only when the JSON schema of species.json changes. */
  schemaVersion: number;
  /** Opaque dataset identity, e.g. "2026-10-31". Changes whenever species.json changes. */
  datasetVersion: string;
  /** ISO date the dataset was published. */
  publishedAt: string;
  /** Number of species in the package. */
  speciesCount: number;
  /** sha256 of the exact species.json bytes. Used to reject a mismatched remote copy. */
  sha256: string;
}

/**
 * Shape the loader accepts from a remote fetch. It is validated against
 * MushroomSpecies[] before it is used, so a malformed remote payload never
 * reaches the UI.
 */
export type RemoteSpeciesPayload = {
  species: MushroomSpecies[];
  manifest: SpeciesManifest;
};

export { type MushroomSpecies };
