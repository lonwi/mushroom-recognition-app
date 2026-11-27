/**
 * Siew z `donor-cards.json` znaczy tę wersję w każdym wierszu `species`.
 * Zbudowana baza niesie `data/sources/content-version.txt` i nie może użyć tego napisu,
 * bo po nim poznajemy, że lokalny plik SQLite trzeba zastąpić assetem.
 */
export const FALLBACK_CONTENT_VERSION = '2026-11-seed';

export type SpeciesDbSource = 'asset' | 'fallback';

/** Pusta lista albo same wiersze siewu to fallback. Jedna inna wersja znaczy zbudowaną bazę. */
export function speciesDbSourceFromVersions(versions: readonly string[]): SpeciesDbSource {
  if (versions.length === 0) return 'fallback';
  return versions.every((version) => version === FALLBACK_CONTENT_VERSION) ? 'fallback' : 'asset';
}

/**
 * Asset zastępuje lokalny plik, gdy go nie ma albo jest siewem.
 * Zbudowana baza zostaje: kolejne otwarcie nie kopiuje assetu od nowa.
 */
export function shouldReplaceDatabaseWithAsset(input: {
  assetBundled: boolean;
  populated: boolean;
  source: SpeciesDbSource;
}): boolean {
  if (!input.assetBundled) return false;
  if (!input.populated) return true;
  return input.source === 'fallback';
}
