import fs from 'fs';
import path from 'path';
import * as safetyRules from '../data/safetyRules';
import { digitsOnly, phoneNumbersInHtml, numbersOutside } from '../site/publicPhones';

const { EMERGENCY_CALLS, TOXICOLOGY_CENTERS } = safetyRules;

function readSiteHtml(): string[] {
  const root = path.join(__dirname, '../../site');
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return pages;
}

function phonesOnSite(pages: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const html of pages) {
    for (const number of phoneNumbersInHtml(html)) found.add(number);
  }
  return found;
}

describe('site emergency numbers', () => {
  it('matches EMERGENCY_CALLS and rejects every other number from safetyRules', () => {
    const pages = readSiteHtml();
    expect(pages.length).toBeGreaterThan(0);

    const found = phonesOnSite(pages);
    const allowed = EMERGENCY_CALLS.map((call) => digitsOnly(call.number)).sort();
    expect([...found].sort()).toEqual(allowed);

    const outside = numbersOutside(allowed, [safetyRules]);
    expect(outside.size).toBeGreaterThan(0);
    const corpus = pages.join('\n');
    for (const number of outside) {
      expect(found.has(number)).toBe(false);
      expect(corpus).not.toContain(number);
    }
    for (const center of TOXICOLOGY_CENTERS) {
      for (const phone of center.phones) {
        expect(corpus).not.toContain(phone);
        expect(corpus).not.toContain(digitsOnly(phone));
      }
    }

    const centrePhone = TOXICOLOGY_CENTERS[0].phones[0];
    const leaked = phoneNumbersInHtml(`<p>${centrePhone}</p><a href="tel:${digitsOnly(centrePhone)}">x</a>`);
    expect(leaked.has(digitsOnly(centrePhone))).toBe(true);
    expect([...leaked].sort()).not.toEqual(allowed);

    const dated = phoneNumbersInHtml('<p>22 października 2026. 23.09.2022. about 1 km.</p>');
    expect([...dated]).toEqual([]);

    const linked = EMERGENCY_CALLS[0].number;
    expect(phoneNumbersInHtml(`<a href="tel:${linked}">call</a>`).has(digitsOnly(linked))).toBe(true);
  });
});
