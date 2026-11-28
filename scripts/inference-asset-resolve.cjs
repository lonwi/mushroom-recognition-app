'use strict';

/**
 * Metro ładuje zaślepkę `package-asset.ts`, a gdy flaga dev i wygenerowany
 * moduł już są, podmienia ją na plik z require modelu i złotych zdjęć.
 * @param {string} resolvedPath
 * @param {string} generatedPath
 * @param {boolean} enabled
 * @returns {string}
 */
function inferenceAssetResolveTarget(resolvedPath, generatedPath, enabled) {
  if (!enabled) return resolvedPath;
  const normalized = resolvedPath.replaceAll('\\', '/');
  if (!normalized.endsWith('/src/infra/inference/package-asset.ts')) return resolvedPath;
  return generatedPath;
}

module.exports = { inferenceAssetResolveTarget };
