/**
 * Training-photo credits bundled with a shipped model.
 * training/export_tflite.py rewrites this file from attributions.jsonl on install.
 * Null means no model is installed, so there is nothing to credit.
 */
export interface PhotoCredit {
  creator: string;
  license: string;
  licenseNormalized: string;
  imageUrl: string;
  sourceUrl: string;
  classId: string;
  taxonName: string;
}

export const PACKAGED_PHOTO_CREDITS: PhotoCredit[] | null = null;
