/**
 * Bundled species dataset manifest. Installed by `scripts/build-species-bundle.mjs`
 * into assets/models/species-manifest.json. The manifest is a descriptive contract
 * (like labels.json for the model), not the data itself.
 */
import manifestJson from '../../assets/models/species-manifest.json';
import type { SpeciesManifest } from '../types/speciesData';

export const speciesManifest: SpeciesManifest = manifestJson as SpeciesManifest;