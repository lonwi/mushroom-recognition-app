import type { ClassificationResult } from './classifierService';
import { readFindLocation, type FindCoordinates } from './journalLocation';
import { deleteManagedJournalPhoto, isLocalCaptureUri, persistJournalPhoto } from './journalPhotos';
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

export type JournalPhotoOutcome = { state: 'stored'; fileName: string } | { state: 'missing' };

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

async function discardCopiedPhoto(fileName: string | undefined): Promise<void> {
  if (!fileName) return;
  try {
    await deleteManagedJournalPhoto(fileName);
  } catch (error) {
    console.error('Nie udało się usunąć zdjęcia po nieudanym zapisie:', error);
  }
}

/**
 * Stores the scan that actually happened. Unclear and non-mushroom results
 * stay without a species name. Candidate confidence is copied, not raised.
 * The timestamp is taken once, here, and is not refreshed on later reads.
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
  const timestamp = now();

  let location: JournalLocationOutcome = { state: 'skipped' };
  if (includeLocation) {
    const coordinates = await readLocation();
    location = coordinates
      ? { state: 'recorded', latitude: coordinates.latitude, longitude: coordinates.longitude }
      : { state: 'unavailable' };
  }

  let photo: JournalPhotoOutcome = { state: 'missing' };
  let storedFile: string | undefined;
  const sourceUri = result.processedImageUri;
  if (sourceUri && isLocalCaptureUri(sourceUri)) {
    try {
      storedFile = await persistPhoto(sourceUri, id);
      photo = { state: 'stored', fileName: storedFile };
    } catch (error) {
      console.error('Nie udało się skopiować zdjęcia do pamięci dziennika:', error);
    }
  }

  const record: SightingRecord = {
    id,
    timestamp,
    recognition,
    ...(storedFile ? { photoFile: storedFile } : {}),
    ...(location.state === 'recorded'
      ? { latitude: location.latitude, longitude: location.longitude }
      : {}),
  };

  try {
    const saved = await save(record);
    if (storedFile && saved.photoFile !== storedFile) {
      await discardCopiedPhoto(storedFile);
      photo = { state: 'missing' };
    }
    return { record: saved, location, photo };
  } catch (error) {
    await discardCopiedPhoto(storedFile);
    throw error;
  }
}
