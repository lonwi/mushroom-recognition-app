import * as FileSystem from 'expo-file-system/legacy';

export const JOURNAL_PHOTO_FOLDER = 'journal-photos';

const LOCAL_CAPTURE_URI = /^(file:|content:|ph:|assets-library:|blob:)/;
const DISPLAYABLE_CAPTURE_URI = /^(file:|content:|data:|blob:|ph:|assets-library:)/;
const SAFE_SIGHTING_ID = /^[a-zA-Z0-9_-]+$/;

export function isDisplayableCaptureUri(uri: string): boolean {
  return DISPLAYABLE_CAPTURE_URI.test(uri);
}

export function isLocalCaptureUri(uri: string): boolean {
  return LOCAL_CAPTURE_URI.test(uri);
}

export function journalPhotoDirectory(documentDirectory: string): string {
  const root = documentDirectory.endsWith('/') ? documentDirectory : `${documentDirectory}/`;
  return `${root}${JOURNAL_PHOTO_FOLDER}/`;
}

export function isManagedJournalPhoto(
  uri: string | undefined | null,
  documentDirectory: string | null = FileSystem.documentDirectory,
): boolean {
  if (!uri || !documentDirectory) return false;
  return uri.startsWith(journalPhotoDirectory(documentDirectory));
}

/**
 * Copies a camera or gallery capture into the app document directory.
 * The returned URI is the only photo URI the journal is allowed to store.
 */
export async function persistJournalPhoto(sourceUri: string, sightingId: string): Promise<string> {
  const root = FileSystem.documentDirectory;
  if (!root) {
    throw new Error('document directory unavailable');
  }
  if (!isLocalCaptureUri(sourceUri)) {
    throw new Error('photo uri is not a local capture');
  }
  if (!SAFE_SIGHTING_ID.test(sightingId)) {
    throw new Error('unsafe sighting id');
  }

  const directory = journalPhotoDirectory(root);
  const destination = `${directory}${sightingId}.jpg`;
  if (sourceUri === destination) {
    return destination;
  }

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function deleteManagedJournalPhoto(uri: string | undefined): Promise<void> {
  if (!isManagedJournalPhoto(uri)) return;
  await FileSystem.deleteAsync(uri as string, { idempotent: true });
}
