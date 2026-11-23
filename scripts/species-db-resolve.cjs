'use strict';

/**
 * Metro ładuje `src/infra/db/species-db-asset.ts` (eksport `null`),
 * a gdy `assets/db/species.db` już jest, podmienia moduł na ten plik.
 * @param {string} resolvedPath
 * @param {string} dbPath
 * @param {boolean} dbExists
 * @returns {string}
 */
function speciesDbResolveTarget(resolvedPath, dbPath, dbExists) {
  if (!dbExists) return resolvedPath;
  const normalized = resolvedPath.replaceAll('\\', '/');
  if (!normalized.endsWith('/src/infra/db/species-db-asset.ts')) return resolvedPath;
  return dbPath;
}

module.exports = { speciesDbResolveTarget };
