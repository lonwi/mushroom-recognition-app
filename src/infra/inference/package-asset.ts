/**
 * Zaślepka assetów paczki inferencji.
 * Metro podmienia ten plik na `assets/inference/package-asset.js`, gdy build
 * z EXPO_PUBLIC_DEV_TOOLS=1 już pobrał model i złote zdjęcia.
 * Produkcja zostawia `null` i nie wkłada wag ani JPEG do paczki.
 */
type InferencePackageAsset = {
  model: number | null;
  manifest: unknown;
  goldenIndex: unknown;
  golden: readonly number[];
  p1: { exifOrient6: number | null };
};

const asset: InferencePackageAsset = {
  model: null,
  manifest: null,
  goldenIndex: null,
  golden: [],
  p1: { exifOrient6: null },
};

export default asset;
