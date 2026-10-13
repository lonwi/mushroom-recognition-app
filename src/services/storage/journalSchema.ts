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

export function sanitizeSighting(value: unknown): SightingRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;

  const latitude = raw.latitude;
  const longitude = raw.longitude;
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
  const storedPhoto =
    typeof raw.photoFile === 'string' ? raw.photoFile : typeof raw.photoUri === 'string' ? raw.photoUri : undefined;
  const photoFile = journalPhotoFileName(storedPhoto);
  const coordinates =
    isUsableCoordinate(latitude, longitude) && typeof longitude === 'number'
      ? { latitude, longitude }
      : {};

  let recognition = sanitizeRecognition(raw.recognition);
  if (recognition.status === 'unavailable' || recognition.status === 'legacy') {
    const fromParent = legacyFromFields(raw);
    if (recognition.status === 'legacy') {
      recognition = recognition.speciesId || recognition.speciesNamePl || recognition.speciesNameLatin || recognition.confidence !== undefined
        ? recognition
        : fromParent ?? recognition;
    } else if (fromParent) {
      recognition = fromParent;
    }
  }

  return {
    id: raw.id,
    timestamp: typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : 0,
    recognition,
    ...(photoFile ? { photoFile } : {}),
    ...coordinates,
    ...(notes ? { notes } : {}),
  };
}
