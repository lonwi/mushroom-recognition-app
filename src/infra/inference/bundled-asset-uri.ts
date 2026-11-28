import { Asset } from 'expo-asset';

/**
 * W release Androida `require()` assetu to nazwa zasobu (`assets_inference_…`),
 * bez schematu. `Image` ją przyjmuje. LiteRT i dekoder zdjęć potrzebują `file://`.
 * `file:///android_res/…` też nie jest plikiem na dysku.
 */
const ANDROID_RESOURCE_PREFIX = 'file:///android_res/';

export type BundledAsset = {
  uri: string;
  localUri: string | null;
  downloaded: boolean;
  downloadAsync: () => Promise<{ localUri: string | null }>;
};

/** Ścieżka pliku w cache albo w systemie plików. Nazwa zasobu i android_res odpadają. */
export function selectBundledFileUri(candidate: string | null | undefined): string | null {
  if (!candidate || !candidate.startsWith('file://')) return null;
  if (candidate.startsWith(ANDROID_RESOURCE_PREFIX)) return null;
  if (candidate.length <= 'file://'.length) return null;
  return candidate;
}

/**
 * Gdy `localUri` jest już plikiem, zwraca go. W przeciwnym razie zmusza
 * `downloadAsync`, także gdy Expo oznaczyło obraz jako pobrany nazwą zasobu.
 */
export async function resolveBundledAsset(asset: BundledAsset): Promise<string> {
  const ready = selectBundledFileUri(asset.localUri);
  if (ready) return ready;

  const source = asset.uri;
  asset.downloaded = false;
  asset.localUri = null;
  let updated: { localUri: string | null };
  try {
    updated = await asset.downloadAsync();
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'pobranie nie doszło do końca';
    throw new Error(`Nie udało się zapisać assetu do pliku (${source}): ${detail}`);
  }
  const local = selectBundledFileUri(updated.localUri ?? asset.localUri);
  if (!local) {
    const seen = updated.localUri ?? asset.localUri ?? source;
    throw new Error(`Asset nie ma ścieżki file:// (${seen}).`);
  }
  return local;
}

export async function resolveBundledAssetUri(moduleId: number): Promise<string> {
  return resolveBundledAsset(Asset.fromModule(moduleId));
}
