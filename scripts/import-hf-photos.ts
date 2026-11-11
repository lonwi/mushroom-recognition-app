import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { parseCsv } from '../src/core/db/csv-table';
import { rankUiPhotos } from '../src/core/db/pick-ui-photos';
import type { SqlValue } from '../src/core/db/sql-db';

/**
 * Układ sprawdzony 2026-11-11 w `lonwi/grzybobranie-zdjecia` (nie nazwy z planu).
 * Kolumny: species, image_url, author, license, source_url, mo_observation_id,
 * id_confidence, inat_photo_id, inat_observation_id, commons_file, inat_observer,
 * license_url, license_url_source, license_checked_at, mo_image_id,
 * mo_inat_observation_id, identificationVerificationStatus, czasem proposed_split.
 * Plik bez sufiksu to kandydat UI. `_by_nc`, `_by_sa` i `_pd_self` są odrzucane.
 * Licencja i tak jest czytana z kolumny `license` (`CC0`, `CC BY`, `CC BY-NC`, `CC BY-SA`).
 */
const HF_DATASET = 'lonwi/grzybobranie-zdjecia';

const REQUIRED_COLUMNS = ['image_url', 'license', 'author'];

export function readHfToken(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.HF_TOKEN_READONLY;
  if (typeof raw !== 'string') return null;
  const token = raw.trim();
  return token.length > 0 ? token : null;
}

export function safeError(error: unknown, token: string | null): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!token) return message;
  return message.split(token).join('[token]');
}

function csvCandidates(classId: string): string[] {
  return [
    `data/miniplus-new16-addendum-20261110/output/${classId}.csv`,
    `data/miniplus-new16-20261110/output/${classId}.csv`,
    `data/20261108-v3/${classId}.csv`,
    `data/${classId}.csv`,
  ];
}

export interface PhotoImport {
  rows: Record<string, SqlValue>[];
  problems: { speciesId: string; detail: string }[];
}

export async function importHfPhotos(options: {
  token: string;
  classIds: readonly string[];
  photoDir: string;
}): Promise<PhotoImport> {
  const rows: Record<string, SqlValue>[] = [];
  const problems: PhotoImport['problems'] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, options.classIds.length) }, async () => {
    while (cursor < options.classIds.length) {
      const index = cursor;
      cursor += 1;
      const classId = options.classIds[index];
      if (!classId) continue;
      try {
        const imported = await importClass(options.token, classId, options.photoDir);
        rows.push(...imported);
      } catch (error) {
        if (error instanceof HfAuthError) throw error;
        problems.push({ speciesId: classId, detail: safeError(error, options.token) });
      }
    }
  });
  await Promise.all(workers);
  return { rows, problems };
}

class HfAuthError extends Error {}

async function importClass(
  token: string,
  classId: string,
  photoDir: string,
): Promise<Record<string, SqlValue>[]> {
  const csv = await firstCsv(token, classId);
  if (!csv) return [];
  const table = parseCsv(csv);
  if (table.length > 0) {
    const header = Object.keys(table[0] ?? {});
    for (const column of REQUIRED_COLUMNS) {
      if (!header.includes(column)) {
        throw new Error(`CSV ${classId} nie ma kolumny ${column}. Nagłówek: ${header.join(', ')}`);
      }
    }
  }
  const ranked = rankUiPhotos(table);
  const saved: Record<string, SqlValue>[] = [];
  for (const candidate of ranked) {
    if (saved.length === 3) break;
    const bytes = await fetchBytes(candidate.imageUrl);
    if (!bytes) continue;
    const webp = await encodeWebp(bytes);
    const digest = createHash('sha256').update(webp).digest('hex');
    const filename = `${safeSegment(candidate.photoId)}.webp`;
    const relative = path.posix.join('species-photos', classId, filename);
    const target = path.join(photoDir, classId, filename);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, webp);
    saved.push({
      id: `${classId}__${safeSegment(candidate.photoId)}`,
      species_id: classId,
      file: relative,
      sha256: digest,
      byte_size: webp.length,
      mime: 'image/webp',
      license: candidate.license,
      license_url: candidate.licenseUrl,
      author: candidate.author,
      source: candidate.source,
      source_url: candidate.sourceUrl,
      observation_id: candidate.observationId,
      image_url: candidate.imageUrl,
      feature_tag: null,
      sort_index: saved.length,
    });
  }
  return saved;
}

async function firstCsv(token: string, classId: string): Promise<string | null> {
  for (const relativePath of csvCandidates(classId)) {
    if (/_(by_nc|by_sa|by_nd|pd_self)\.csv$/.test(relativePath)) {
      throw new Error(`Odrzucono plik licencji spoza UI: ${relativePath}`);
    }
    const text = await hfText(token, relativePath);
    if (text !== null) return text;
  }
  return null;
}

async function hfText(token: string, relativePath: string): Promise<string | null> {
  const response = await hfFetch(token, relativePath);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Hugging Face zwrócił ${response.status} dla ${relativePath}`);
  }
  return response.text();
}

async function fetchBytes(imageUrl: string): Promise<Buffer | null> {
  if (!imageUrl.startsWith('https://')) return null;
  const response = await fetch(imageUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function hfFetch(token: string, relativePath: string): Promise<Response> {
  const url = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main/${relativePath}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new HfAuthError(
      'Hugging Face odrzucił HF_TOKEN_READONLY. Wartość tokenu nie trafia do logu.',
    );
  }
  return response;
}

async function encodeWebp(bytes: Buffer): Promise<Buffer> {
  const sharpModule = await import('sharp');
  return sharpModule
    .default(bytes)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

function safeSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return cleaned.slice(0, 80) || 'photo';
}
