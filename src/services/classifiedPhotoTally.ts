let classifiedPhotos = 0;

/**
 * One classified photo counts once. A CPU retry of that same photo is not
 * a second scan, so achievements and the journal must not see it twice.
 */
export function recordClassifiedPhoto(): void {
  classifiedPhotos += 1;
}

export function classifiedPhotoCount(): number {
  return classifiedPhotos;
}

export function resetClassifiedPhotoCountForTests(): void {
  classifiedPhotos = 0;
}
