import {
  HOURS_24_7,
  HOURS_24_7_DOCTOR_ADVICE,
  HOURS_24_7_DOCTOR_ON_DUTY,
  TOXICOLOGY_CENTERS,
  toTelUrl,
} from '../data/safetyRules';

// Numbers verified on 2026-10-17 against the sourceUrl of each entry.
const POLISH_PHONE = /^(\+48 )?\d{2,3}( \d{2,3}){2,3}$/;
const TEL_URL = /^tel:\+48\d{9}$/;
const byCity = (city: string) => TOXICOLOGY_CENTERS.find((c) => c.city === city);

describe('TOXICOLOGY_CENTERS', () => {
  it('every entry has a source URL and a check date', () => {
    for (const center of TOXICOLOGY_CENTERS) {
      expect(center.sourceUrl.startsWith('https://')).toBe(true);
      expect(center.sourceUrl).toMatch(/^https:\/\/\S+$/);
      expect(center.checkedAt).toBe('2026-10-17');
      expect(center.phones.length).toBeGreaterThan(0);
    }
  });

  it('every number is in Polish format and produces a valid tel: URL', () => {
    for (const phone of TOXICOLOGY_CENTERS.flatMap((c) => c.phones)) {
      expect(phone).toMatch(POLISH_PHONE);
      expect(toTelUrl(phone)).toMatch(TEL_URL);
    }
  });

  it('builds tel: URLs with +48 for national numbers and leaves short codes alone', () => {
    expect(toTelUrl('22 619 66 54')).toBe('tel:+48226196654');
    expect(toTelUrl('661 442 576')).toBe('tel:+48661442576');
    expect(toTelUrl('+48 538 81 99 61')).toBe('tel:+48538819961');
    expect(toTelUrl('112')).toBe('tel:112');
    expect(toTelUrl('999')).toBe('tel:999');
  });

  it('refuses empty numbers and numbers with an extension', () => {
    expect(toTelUrl('32 368 20 00 wew. 2116')).toBeNull();
    expect(toTelUrl('32 368 20 00 ext. 2116')).toBeNull();
    expect(toTelUrl('32 368 20 00 Wew 2116')).toBeNull();
    expect(toTelUrl('')).toBeNull();
    expect(toTelUrl('   ')).toBeNull();
    expect(toTelUrl('wew.')).toBeNull();
  });

  it('keeps the general emergency numbers out of the centre list', () => {
    const phones = TOXICOLOGY_CENTERS.flatMap((c) => c.phones.map((p) => p.replace(/\s+/g, '')));
    expect(phones).not.toContain('112');
    expect(phones).not.toContain('999');
  });

  it('lists exactly the verified centres', () => {
    expect(TOXICOLOGY_CENTERS.map((c) => c.city)).toEqual([
      'Warszawa',
      'Kraków',
      'Gdańsk',
      'Poznań',
      'Łódź',
      'Wrocław',
      'Sosnowiec',
    ]);
    for (const removed of ['Rzeszów', 'Tarnów', 'Lublin']) {
      expect(byCity(removed)).toBeUndefined();
    }
    expect(TOXICOLOGY_CENTERS.some((c) => /Rydygier/.test(c.address))).toBe(false);
  });

  it('uses the toxicology unit in Warsaw, not the hospital switchboard', () => {
    const warsaw = byCity('Warszawa');
    expect(warsaw?.phones).toEqual(['22 619 66 54']);
    expect(warsaw?.sourceUrl).toBe('https://rprm.ezdrowie.gov.pl/');
    expect(warsaw?.hours).toBeUndefined();
  });

  it('has both Gdańsk numbers and the Kartuska 4/6 address', () => {
    const gdansk = byCity('Gdańsk');
    expect(gdansk?.phones).toEqual(['58 682 04 04', '512 069 737']);
    expect(gdansk?.address).toContain('ul. Kartuska 4/6');
    expect(gdansk?.hours).toBeUndefined();
  });

  it('has the updated Wrocław, Łódź and new Sosnowiec numbers', () => {
    expect(byCity('Wrocław')?.phones).toEqual(['71 306 48 41', '71 306 48 42']);
    expect(byCity('Łódź')?.phones).toEqual(['661 442 576']);
    expect(byCity('Łódź')?.hours).toBe('Całodobowo 24/7');
    expect(byCity('Sosnowiec')?.phones).toEqual(['32 368 21 16']);
    expect(byCity('Kraków')?.phones).toEqual(['12 411 99 99']);
    expect(byCity('Poznań')?.phones).toEqual(['61 847 69 46']);
  });

  it('states hours only with the wording each source supports', () => {
    expect(HOURS_24_7).toBe('Całodobowo 24/7');
    expect(HOURS_24_7_DOCTOR_ADVICE).toBe('Całodobowo – porady dla lekarzy');
    expect(HOURS_24_7_DOCTOR_ON_DUTY).toBe('Całodobowo – dyżur lekarski');
    expect(byCity('Wrocław')?.hours).toBe(HOURS_24_7_DOCTOR_ADVICE);
    expect(byCity('Sosnowiec')?.hours).toBe(HOURS_24_7_DOCTOR_ON_DUTY);
    expect(byCity('Kraków')?.hours).toBe(HOURS_24_7);
    expect(byCity('Poznań')?.hours).toBe(HOURS_24_7);
    expect(byCity('Łódź')?.hours).toBe(HOURS_24_7);
    const allowed = [HOURS_24_7, HOURS_24_7_DOCTOR_ADVICE, HOURS_24_7_DOCTOR_ON_DUTY];
    for (const center of TOXICOLOGY_CENTERS) {
      if (center.hours !== undefined) expect(allowed).toContain(center.hours);
    }
  });

  it('contains none of the outdated or out-of-scope numbers', () => {
    const all = TOXICOLOGY_CENTERS.flatMap((c) => c.phones).join('|');
    for (const stale of ['22 619 63 01', '42 657 99 00', '71 343 30 08', '607 218 174']) {
      expect(all).not.toContain(stale);
    }
  });
});
