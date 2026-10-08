/**
 * Training-photo credits bundled with a shipped model.
 * Install writes assets/models/attributions.jsonl only. This module stays in source
 * control so the loader is not replaced by an inlined credit array.
 * Null means no model is installed, so there is nothing to credit.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
export interface PhotoCredit {
  creator: string;
  license: string;
  licenseNormalized: string;
  imageUrl: string;
  sourceUrl: string;
  classId: string;
  taxonName: string;
}

export const PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = null;

export function creditsFromJsonl(text: string): PhotoCredit[] {
  const credits: PhotoCredit[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const row = JSON.parse(trimmed) as Record<string, string>;
    credits.push({
      creator: row.creator || '',
      license: row.license || '',
      licenseNormalized: row.license_normalized || row.licenseNormalized || '',
      imageUrl: row.image_url || row.imageUrl || '',
      sourceUrl: row.source_url || row.sourceUrl || '',
      classId: row.class_id || row.classId || '',
      taxonName: row.taxon_name || row.taxonName || '',
    });
  }
  return credits;
}

export function creditLicenseUrl(credit: PhotoCredit): string | null {
  const raw = credit.license.trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const normalized = credit.licenseNormalized.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === 'CC0' || normalized === 'CC0 1.0') {
    return 'https://creativecommons.org/publicdomain/zero/1.0/';
  }
  if (
    normalized === 'CC-BY' ||
    normalized === 'CC BY' ||
    normalized === 'CC BY 4.0' ||
    normalized === 'CC-BY-4.0'
  ) {
    return 'https://creativecommons.org/licenses/by/4.0/';
  }
  return null;
}

async function bundledAttributionText(): Promise<string | null> {
  try {
    const loaded = require('../../assets/models/attributions.jsonl') as unknown;
    if (typeof loaded === 'string') {
      return loaded;
    }
    if (typeof loaded === 'number') {
      const asset = Asset.fromModule(loaded);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      if (!uri) {
        return null;
      }
      return FileSystem.readAsStringAsync(uri);
    }
  } catch {
    return null;
  }
  return null;
}

/** Prefer the bundled jsonl, which includes train, test, and probe photos. */
export async function loadPhotoCredits(): Promise<PhotoCredit[] | null> {
  const text = await bundledAttributionText();
  if (text && text.trim()) {
    const parsed = creditsFromJsonl(text);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return PACKAGED_PHOTO_CREDITS;
}
