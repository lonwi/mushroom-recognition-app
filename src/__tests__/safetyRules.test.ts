import { TOXICOLOGY_CENTERS } from '../data/safetyRules';

// Numbers verified on 2026-10-17 against the sourceUrl of each entry.
const POLISH_PHONE = /^(\+48 )?\d{2,3}( \d{2,3}){2,3}$/;
const TEL_URL = /^tel:(\+48)?\d{9}$/;
const toTel = (phone: string) => `tel:${phone.replace(/\s+/g, '')}`;
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
      expect(toTel(phone)).toMatch(TEL_URL);
    }
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

  it('contains none of the outdated or out-of-scope numbers', () => {
    const all = TOXICOLOGY_CENTERS.flatMap((c) => c.phones).join('|');
    for (const stale of ['22 619 63 01', '42 657 99 00', '71 343 30 08', '607 218 174']) {
      expect(all).not.toContain(stale);
    }
  });
});
