import * as FileSystem from 'expo-file-system/legacy';

export const JOURNAL_PHOTO_FOLDER = 'journal-photos';

const LOCAL_CAPTURE_URI = /^(file:|content:|ph:|assets-library:|blob:)/;
const DISPLAYABLE_CAPTURE_URI = /^(file:|content:|data:|blob:|ph:|assets-library:)/;
const SAFE_SIGHTING_ID = /^[a-zA-Z0-9_-]+$/;
const SAFE_PHOTO_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*\.(jpg|png|heic|webp)$/;
const PHOTO_EXTENSIONS = new Set(['jpg', 'png', 'heic', 'webp']);

export function isDisplayableCaptureUri(uri: string): boolean {
  return DISPLAYABLE_CAPTURE_URI.test(uri);
}

export function isLocalCaptureUri(uri: string): boolean {
  return LOCAL_CAPTURE_URI.test(uri);
}

export function photoExtensionForSource(sourceUri: string): string {
  const path = sourceUri.split('?')[0].split('#')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(path);
  const raw = match?.[1]?.toLowerCase();
  if (raw === 'jpeg') return 'jpg';
  if (raw && PHOTO_EXTENSIONS.has(raw)) return raw;
  return 'jpg';
}

export function journalPhotoDirectory(documentDirectory: string): string {
  const root = documentDirectory.endsWith('/') ? documentDirectory : `${documentDirectory}/`;
  return `${root}${JOURNAL_PHOTO_FOLDER}/`;
}

function hasTraversal(value: string): boolean {
  return value.includes('..') || value.includes('\\') || value.includes('\0') || /%2e|%2f|%5c/i.test(value);
}

/**
 * Accepts a bare file name or an older absolute path inside journal-photos.
 * Anything that could leave that folder is rejected.
 */
export function journalPhotoFileName(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || hasTraversal(trimmed)) return null;
  if (!trimmed.includes('/')) {
    return SAFE_PHOTO_NAME.test(trimmed) ? trimmed : null;
  }
  const marker = `/${JOURNAL_PHOTO_FOLDER}/`;
  const index = trimmed.lastIndexOf(marker);
  if (index < 0) return null;
  const rest = trimmed.slice(index + marker.length);
  if (!rest || rest.includes('/')) return null;
  return SAFE_PHOTO_NAME.test(rest) ? rest : null;
}

export function resolveJournalPhotoUri(
  stored: string | undefined | null,
  documentDirectory: string | null = FileSystem.documentDirectory,
): string | undefined {
  const name = journalPhotoFileName(stored);
  if (!name || !documentDirectory) return undefined;
  return `${journalPhotoDirectory(documentDirectory)}${name}`;
}

export function isManagedJournalPhoto(
  uri: string | undefined | null,
  documentDirectory: string | null = FileSystem.documentDirectory,
): boolean {
  if (!uri || !documentDirectory || hasTraversal(uri)) return false;
  const name = journalPhotoFileName(uri);
  if (!name) return false;
  const full = `${journalPhotoDirectory(documentDirectory)}${name}`;
  return uri === full || uri === name;
}

/**
 * Copies a camera or gallery capture into the app document directory.
 * The journal stores only the file name; the absolute path is built when the photo is shown.
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

  const fileName = `${sightingId}.${photoExtensionForSource(sourceUri)}`;
  if (!journalPhotoFileName(fileName)) {
    throw new Error('unsafe photo name');
  }
  const directory = journalPhotoDirectory(root);
  const destination = `${directory}${fileName}`;
  if (sourceUri !== destination) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    try {
      await FileSystem.copyAsync({ from: sourceUri, to: destination });
    } catch (error) {
      try {
        await FileSystem.deleteAsync(destination, { idempotent: true });
      } catch (cleanupError) {
        console.error('Nie udało się usunąć niepełnej kopii zdjęcia:', cleanupError);
      }
      throw error;
    }
  }
  return fileName;
}

export async function deleteManagedJournalPhoto(stored: string | undefined): Promise<void> {
  const uri = resolveJournalPhotoUri(stored);
  if (!uri || hasTraversal(uri) || !isManagedJournalPhoto(uri)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
