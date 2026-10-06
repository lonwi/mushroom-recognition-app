import { showsKitchenSection } from './mushrooms';
import { EdibilityStatus, HymenophoreType, MushroomSpecies } from '../types/mushroom';

export type StatusFilter = EdibilityStatus | 'INCOMPLETE' | 'ALL';
export type HymenophoreFilter = HymenophoreType | 'ALL';

export interface AtlasFilterOptions {
  query: string;
  status: StatusFilter;
  hymenophore: HymenophoreFilter;
}

/**
 * Lowercase, then NFD with combining marks removed. ł/Ł do not decompose, so they become l first.
 * „zolciowy” then matches „żółciowy”, and „wlokniak” matches „włókniak”.
 */
export function normalizeAtlasQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function speciesMatchesSearch(species: MushroomSpecies, query: string): boolean {
  const normalized = normalizeAtlasQuery(query);
  if (normalized === '') {
    return true;
  }

  const matches = (value: string) => normalizeAtlasQuery(value).includes(normalized);
  return (
    matches(species.namePl) ||
    matches(species.nameLatin) ||
    species.commonNicknames.some((nickname) => matches(nickname))
  );
}

/** Status, hymenophore and search all have to match. An empty query does not filter. */
export function filterAtlasSpecies(
  species: readonly MushroomSpecies[],
  options: AtlasFilterOptions
): MushroomSpecies[] {
  return species.filter((item) => {
    const matchesStatus =
      options.status === 'ALL' ||
      (options.status === 'INCOMPLETE'
        ? item.incompleteCard === true
        : options.status === 'EDIBLE'
          ? showsKitchenSection(item)
          : item.status === options.status);
    const matchesHymenophore =
      options.hymenophore === 'ALL' || item.hymenophore === options.hymenophore;
    return matchesStatus && matchesHymenophore && speciesMatchesSearch(item, options.query);
  });
}

export function countByStatus(
  species: readonly MushroomSpecies[]
): Record<'ALL' | 'INCOMPLETE' | EdibilityStatus, number> {
  return {
    ALL: species.length,
    INCOMPLETE: species.filter((item) => item.incompleteCard === true).length,
    EDIBLE: species.filter((item) => showsKitchenSection(item)).length,
    INEDIBLE: species.filter((item) => item.status === 'INEDIBLE').length,
    POISONOUS: species.filter((item) => item.status === 'POISONOUS').length,
    DEADLY_POISONOUS: species.filter((item) => item.status === 'DEADLY_POISONOUS').length,
  };
}
