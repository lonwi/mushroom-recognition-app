import { MUSHROOMS_DATABASE } from './mushrooms';
import type { MushroomSpecies } from '../types/mushroom';

const speciesById: ReadonlyMap<string, MushroomSpecies> = new Map(
  MUSHROOMS_DATABASE.map((species) => [species.id, species]),
);

export function getSpecies(id: string): MushroomSpecies | undefined {
  return speciesById.get(id);
}

export function hasSpecies(id: string): boolean {
  return speciesById.has(id);
}
