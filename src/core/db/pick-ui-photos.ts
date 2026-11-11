import { uiLicense, type UiLicense } from '@/core/db/ui-license';

const UI_PHOTOS_PER_SPECIES = 3;

export interface PhotoCandidate {
  imageUrl: string;
  author: string;
  license: UiLicense;
  licenseUrl: string;
  sourceUrl: string;
  source: string;
  observationId: string;
  photoId: string;
}

function cell(row: Record<string, string>, name: string): string {
  return (row[name] ?? '').trim();
}

function photoSource(row: Record<string, string>): string {
  if (cell(row, 'inat_observation_id')) return 'inaturalist';
  if (cell(row, 'mo_observation_id')) return 'mushroom_observer';
  if (cell(row, 'commons_file')) return 'wikimedia_commons';
  const sourceUrl = cell(row, 'source_url');
  if (!sourceUrl) return '';
  try {
    return new URL(sourceUrl).host;
  } catch {
    return '';
  }
}

function observationKey(row: Record<string, string>): string {
  const inat = cell(row, 'inat_observation_id');
  if (inat) return `inat:${inat}`;
  const mo = cell(row, 'mo_observation_id');
  if (mo) return `mo:${mo}`;
  return '';
}

/** Kolejka CC0/CC BY: najpierw różne obserwacje, CC0 przed CC BY. */
export function rankUiPhotos(rows: readonly Record<string, string>[]): PhotoCandidate[] {
  const accepted: PhotoCandidate[] = [];
  for (const row of rows) {
    const license = uiLicense(cell(row, 'license'));
    const imageUrl = cell(row, 'image_url');
    const author = cell(row, 'author');
    if (!license || !imageUrl.startsWith('https://') || !author) continue;
    const licenseUrl = cell(row, 'license_url');
    const sourceUrl = cell(row, 'source_url');
    if (!licenseUrl.startsWith('https://') && !sourceUrl.startsWith('https://')) continue;
    const photoId =
      cell(row, 'inat_photo_id') || cell(row, 'mo_image_id') || cell(row, 'commons_file');
    if (!photoId) continue;
    accepted.push({
      imageUrl,
      author,
      license,
      licenseUrl: licenseUrl.startsWith('https://') ? licenseUrl : sourceUrl,
      sourceUrl,
      source: photoSource(row),
      observationId: observationKey(row),
      photoId,
    });
  }
  accepted.sort((left, right) => {
    const licenseOrder = Number(left.license !== 'cc0') - Number(right.license !== 'cc0');
    if (licenseOrder !== 0) return licenseOrder;
    return left.photoId.localeCompare(right.photoId);
  });
  const ranked: PhotoCandidate[] = [];
  const seenObservations = new Set<string>();
  for (const candidate of accepted) {
    if (candidate.observationId && seenObservations.has(candidate.observationId)) continue;
    ranked.push(candidate);
    if (candidate.observationId) seenObservations.add(candidate.observationId);
  }
  for (const candidate of accepted) {
    if (!ranked.includes(candidate)) ranked.push(candidate);
  }
  return ranked;
}

export function pickUiPhotos(rows: readonly Record<string, string>[]): PhotoCandidate[] {
  return rankUiPhotos(rows).slice(0, UI_PHOTOS_PER_SPECIES);
}
