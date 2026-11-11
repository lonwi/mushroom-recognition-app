export type UiLicense = 'cc0' | 'cc-by';

/**
 * Licencja z CSV datasetu. Przyjmowane są tylko CC0 i CC BY.
 * BY-NC, BY-SA, ND i pd-self odpadają. Nazwy z planu (`cc_by`) i z CSV (`CC BY`) są tym samym.
 */
export function uiLicense(raw: string): UiLicense | null {
  const normalized = raw.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (
    normalized.includes('nc') ||
    normalized.includes('-sa') ||
    normalized.includes('nd') ||
    normalized.includes('pd')
  ) {
    return null;
  }
  if (normalized === 'cc0' || normalized.startsWith('cc0-') || normalized.startsWith('cc-0')) {
    return 'cc0';
  }
  if (normalized === 'cc-by' || normalized.startsWith('cc-by-')) return 'cc-by';
  return null;
}
