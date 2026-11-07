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
  /** Deed for this file. A CC BY credit without an https URL has no version to open. */
  licenseUrl?: string;
  /** Set for atlas gallery photos, which were resized and saved as WebP. */
  modified?: boolean;
}

const PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = null;

function firstText(row: Record<string, string>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function creditFromRow(row: Record<string, string>): PhotoCredit {
  const licenseUrl = firstText(row, ['license_url', 'licenseUrl']);
  const credit: PhotoCredit = {
    creator: firstText(row, ['creator']),
    license: firstText(row, ['license']),
    licenseNormalized: firstText(row, ['license_normalized', 'licenseNormalized']),
    imageUrl: firstText(row, ['image_url', 'imageUrl']),
    sourceUrl: firstText(row, ['source_url', 'sourceUrl']),
    classId: firstText(row, ['class_id', 'classId']),
    taxonName: firstText(row, ['taxon_name', 'taxonName']),
  };
  if (licenseUrl) {
    credit.licenseUrl = licenseUrl;
  }
  return credit;
}

export function creditsFromJsonl(text: string): PhotoCredit[] {
  const credits: PhotoCredit[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    credits.push(creditFromRow(JSON.parse(trimmed) as Record<string, string>));
  }
  return credits;
}

export function creditLicenseUrl(credit: PhotoCredit): string | null {
  const explicit = credit.licenseUrl?.trim() ?? '';
  if (/^https:\/\//i.test(explicit)) {
    return explicit;
  }
  const raw = credit.license.trim();
  if (/^https:\/\//i.test(raw)) {
    return raw;
  }
  const normalized = credit.licenseNormalized.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === 'CC0' || normalized === 'CC0 1.0') {
    return 'https://creativecommons.org/publicdomain/zero/1.0/';
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
