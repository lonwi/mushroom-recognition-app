/**
 * Jedno źródło numerów alarmowych (Q19).
 * Pola `phone` są puste, dopóki właściciel nie wskaże zweryfikowanego źródła.
 * Nie wpisuj tu numeru bez `verified: true` i adresu https.
 * Wzorzec poniżej służy tylko do wykrywania numerów skopiowanych do kart. To nie jest publikacja numeru.
 */

const EMERGENCY_NUMBER_SOURCE = String.raw`\b(?:112|999|998|997)\b`;

export function emergencyNumberPattern(): RegExp {
  return new RegExp(EMERGENCY_NUMBER_SOURCE, 'g');
}

export function redactEmergencyNumbers(text: string): string {
  return text.replace(emergencyNumberPattern(), 'numer alarmowy');
}

export interface EmergencyContact {
  id: string;
  role: 'emergency' | 'ambulance' | 'toxicology';
  phone: string;
  verified: boolean;
  sourceUrl: string;
}

export const emergencyContacts = [
  {
    id: 'emergency',
    role: 'emergency',
    phone: '',
    verified: false,
    sourceUrl: '',
  },
  {
    id: 'ambulance',
    role: 'ambulance',
    phone: '',
    verified: false,
    sourceUrl: '',
  },
  {
    id: 'toxicology',
    role: 'toxicology',
    phone: '',
    verified: false,
    sourceUrl: '',
  },
] as const satisfies readonly EmergencyContact[];

export function emergencyContactViolations(
  contacts: readonly EmergencyContact[] = emergencyContacts,
): string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const contact of contacts) {
    if (seen.has(contact.id)) violations.push(`powtórzony kontakt: ${contact.id}`);
    seen.add(contact.id);
    if (contact.phone.trim() === '') continue;
    if (!contact.verified) {
      violations.push(`${contact.id}: numer bez weryfikacji (Q19)`);
    }
    if (!contact.sourceUrl.startsWith('https://')) {
      violations.push(`${contact.id}: numer bez źródła https`);
    }
  }
  return violations;
}
