import { isUsableCoordinate } from '../journalLocation';
import { journalPhotoFileName } from '../journalPhotos';
import {
  JournalCandidate,
  JournalRecognition,
  SightingRecord,
} from '../../types/mushroom';

function textField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function legacyFromFields(source: Record<string, unknown>): JournalRecognition | null {
  const speciesId = textField(source.speciesId);
  const speciesNamePl = textField(source.speciesNamePl);
  const speciesNameLatin = textField(source.speciesNameLatin);
  const confidence = finiteNumber(source.confidence);
  if (!speciesId && !speciesNamePl && !speciesNameLatin && confidence === undefined) {
    return null;
  }
  return {
    status: 'legacy',
    ...(speciesId ? { speciesId } : {}),
    ...(speciesNamePl ? { speciesNamePl } : {}),
    ...(speciesNameLatin ? { speciesNameLatin } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

function sanitizeCandidate(value: unknown): JournalCandidate | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.namePl !== 'string' ||
    typeof candidate.nameLatin !== 'string' ||
    typeof candidate.confidence !== 'number' ||
    !Number.isFinite(candidate.confidence) ||
    typeof candidate.rank !== 'number' ||
    !Number.isFinite(candidate.rank)
  ) {
    return null;
  }
  return {
    id: candidate.id,
    namePl: candidate.namePl,
    nameLatin: candidate.nameLatin,
    confidence: candidate.confidence,
    rank: candidate.rank,
  };
}

export function sanitizeRecognition(value: unknown): JournalRecognition {
  if (!value || typeof value !== 'object') {
    return { status: 'unavailable' };
  }
  const record = value as Record<string, unknown>;
  if (
    record.status === 'rejected' &&
    (record.reason === 'not_a_mushroom' || record.reason === 'unknown_mushroom' || record.reason === 'unclear')
  ) {
    return { status: 'rejected', reason: record.reason };
  }
  if (record.status === 'candidates' && Array.isArray(record.top3)) {
    const warningReasons = Array.isArray(record.warningReasons)
      ? record.warningReasons.filter(
          (reason): reason is 'dangerous_genus' | 'low_confidence' =>
            reason === 'dangerous_genus' || reason === 'low_confidence',
        )
      : [];
    return {
      status: 'candidates',
      top3: record.top3.flatMap((item) => {
        const candidate = sanitizeCandidate(item);
        return candidate ? [candidate] : [];
      }),
      expertVerificationRequired: record.expertVerificationRequired === true || warningReasons.length > 0,
      warningReasons,
    };
  }
  if (record.status === 'legacy') {
    return legacyFromFields(record) ?? { status: 'legacy' };
  }
  return { status: 'unavailable' };
}

function trimmedNotes(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function photoNameFromRaw(raw: Record<string, unknown>): string | null {
  const storedPhoto =
    typeof raw.photoFile === 'string' ? raw.photoFile : typeof raw.photoUri === 'string' ? raw.photoUri : undefined;
  return journalPhotoFileName(storedPhoto);
}

function sightingCoordinates(
  raw: Record<string, unknown>,
): { latitude: number; longitude: number } | undefined {
  const { latitude, longitude } = raw;
  if (isUsableCoordinate(latitude, longitude) && typeof longitude === 'number') {
    return { latitude, longitude };
  }
  return undefined;
}

function legacyHasIdentity(recognition: Extract<JournalRecognition, { status: 'legacy' }>): boolean {
  return Boolean(
    recognition.speciesId || recognition.speciesNamePl || recognition.speciesNameLatin || recognition.confidence !== undefined,
  );
}

function withLegacyParent(raw: Record<string, unknown>): JournalRecognition {
  const recognition = sanitizeRecognition(raw.recognition);
  if (recognition.status !== 'unavailable' && recognition.status !== 'legacy') return recognition;
  const fromParent = legacyFromFields(raw);
  if (recognition.status === 'legacy') {
    return legacyHasIdentity(recognition) ? recognition : fromParent ?? recognition;
  }
  return fromParent ?? recognition;
}

function finiteTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function sanitizeSighting(value: unknown): SightingRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;

  const notes = trimmedNotes(raw.notes);
  const photoFile = photoNameFromRaw(raw);
  const coordinates = sightingCoordinates(raw);
  return {
    id: raw.id,
    timestamp: finiteTimestamp(raw.timestamp),
    recognition: withLegacyParent(raw),
    ...(photoFile ? { photoFile } : {}),
    ...(coordinates ?? {}),
    ...(notes ? { notes } : {}),
  };
}
