import { useCallback, useMemo, useState } from 'react';
import { applyAtlasFilters } from '../data/atlasFilterModel';
import type { MushroomSpecies } from '../types/mushroom';

/** One place owns the search box and the chips, so the list and the counter cannot diverge. */
export function useAtlasFilters(species: readonly MushroomSpecies[]) {
  const [query, setQuery] = useState('');
  const [chipIds, setChipIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleChip = useCallback((id: string) => {
    setChipIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(
    () => applyAtlasFilters(species, { query, chipIds }),
    [species, query, chipIds],
  );

  return {
    query,
    setQuery,
    chipIds,
    toggleChip,
    matches: filtered.matches,
    unverified: filtered.unverified,
    resultCount: filtered.matches.length,
  };
}
