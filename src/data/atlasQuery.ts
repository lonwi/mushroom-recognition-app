import { EdibilityStatus, HymenophoreType, MushroomSpecies } from '../types/mushroom';

export type StatusFilter = EdibilityStatus | 'ALL';
export type HymenophoreFilter = HymenophoreType | 'ALL';

export interface AtlasFilterOptions {
  query: string;
  status: StatusFilter;
  hymenophore: HymenophoreFilter;
}

export function normalizeAtlasQuery(query: string): string {
  return query.toLowerCase().trim();
}

export function speciesMatchesSearch(species: MushroomSpecies, query: string): boolean {
  const normalized = normalizeAtlasQuery(query);
  if (normalized === '') {
    return true;
  }

  return (
    species.namePl.toLowerCase().includes(normalized) ||
    species.nameLatin.toLowerCase().includes(normalized) ||
    species.commonNicknames.some((nickname) => nickname.toLowerCase().includes(normalized))
  );
}

/** Status, hymenophore and search all have to match. An empty query does not filter. */
export function filterAtlasSpecies(
  species: readonly MushroomSpecies[],
  options: AtlasFilterOptions
): MushroomSpecies[] {
  return species.filter((item) => {
    const matchesStatus = options.status === 'ALL' || item.status === options.status;
    const matchesHymenophore =
      options.hymenophore === 'ALL' || item.hymenophore === options.hymenophore;
    return matchesStatus && matchesHymenophore && speciesMatchesSearch(item, options.query);
  });
}

export function countByStatus(
  species: readonly MushroomSpecies[]
): Record<'ALL' | EdibilityStatus, number> {
  return {
    ALL: species.length,
    EDIBLE: species.filter((item) => item.status === 'EDIBLE').length,
    INEDIBLE: species.filter((item) => item.status === 'INEDIBLE').length,
    POISONOUS: species.filter((item) => item.status === 'POISONOUS').length,
    DEADLY_POISONOUS: species.filter((item) => item.status === 'DEADLY_POISONOUS').length,
  };
}
