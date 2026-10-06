import type { ClassificationResult } from './classifierService';
import { readFindLocation, type FindCoordinates } from './journalLocation';
import { isLocalCaptureUri, persistJournalPhoto } from './journalPhotos';
import { storageService } from './storageService';
import type { JournalCandidate, JournalRecognition, SightingRecord } from '../types/mushroom';

export function createSightingId(now = Date.now(), random = Math.random()): string {
  return `sighting_${now}_${random.toString(36).slice(2, 8)}`;
}

export function recognitionFromClassification(result: ClassificationResult): JournalRecognition {
  if (result.status === 'rejected') {
    return { status: 'rejected', reason: result.reason };
  }
  if (result.status === 'candidates') {
    const top3: JournalCandidate[] = result.top3.map((candidate) => ({
      id: candidate.id,
      namePl: candidate.namePl,
      nameLatin: candidate.nameLatin,
      confidence: candidate.confidence,
      rank: candidate.rank,
    }));
    return {
      status: 'candidates',
      top3,
      expertVerificationRequired: result.expertVerificationRequired,
      warningReasons: [...result.warningReasons],
    };
  }
  return { status: 'unavailable' };
}

export type JournalLocationOutcome =
  | { state: 'recorded'; latitude: number; longitude: number }
  | { state: 'skipped' }
  | { state: 'unavailable' };

export type JournalPhotoOutcome = { state: 'stored'; uri: string } | { state: 'missing' };

export interface SavedJournalEntry {
  record: SightingRecord;
  location: JournalLocationOutcome;
  photo: JournalPhotoOutcome;
}

export interface CreateJournalEntryDependencies {
  createId?: () => string;
  now?: () => number;
  readLocation?: () => Promise<FindCoordinates | null>;
  persistPhoto?: (sourceUri: string, sightingId: string) => Promise<string>;
  save?: (record: SightingRecord) => Promise<SightingRecord>;
}

/**
 * Stores the scan that actually happened. Unclear and non-mushroom results
 * stay without a species name. Candidate confidence is copied, not raised.
 */
export async function createJournalEntryFromScan(
  result: ClassificationResult,
  includeLocation: boolean,
  dependencies: CreateJournalEntryDependencies = {},
): Promise<SavedJournalEntry> {
  const createId = dependencies.createId ?? createSightingId;
  const now = dependencies.now ?? Date.now;
  const readLocation = dependencies.readLocation ?? readFindLocation;
  const persistPhoto = dependencies.persistPhoto ?? persistJournalPhoto;
  const save = dependencies.save ?? ((record: SightingRecord) => storageService.saveSighting(record));

  const id = createId();
  const recognition = recognitionFromClassification(result);

  let location: JournalLocationOutcome = { state: 'skipped' };
  if (includeLocation) {
    const coordinates = await readLocation();
    location = coordinates
      ? { state: 'recorded', latitude: coordinates.latitude, longitude: coordinates.longitude }
      : { state: 'unavailable' };
  }

  let photo: JournalPhotoOutcome = { state: 'missing' };
  const sourceUri = result.processedImageUri;
  if (sourceUri && isLocalCaptureUri(sourceUri)) {
    try {
      photo = { state: 'stored', uri: await persistPhoto(sourceUri, id) };
    } catch (error) {
      console.error('Nie udało się skopiować zdjęcia do pamięci dziennika:', error);
    }
  }

  const record: SightingRecord = {
    id,
    timestamp: now(),
    recognition,
    ...(photo.state === 'stored' ? { photoUri: photo.uri } : {}),
    ...(location.state === 'recorded'
      ? { latitude: location.latitude, longitude: location.longitude }
      : {}),
  };

  const saved = await save(record);
  return { record: saved, location, photo };
}
