/**
 * Emergency phone numbers live only in src/data/safetyRules.ts.
 * Every other screen, card or dataset links to the emergency screen instead
 * of carrying its own numbers (owner decision, 2026-10-22).
 */
import fs from 'fs';
import path from 'path';

import { EMERGENCY_CALLS, TOXICOLOGY_CENTERS } from '../data/safetyRules';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['src', 'assets', 'locales'];
const PUBLIC_DIRS = ['site', 'scripts'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.json', '.jsonl', '.md']);
const PUBLIC_EXT = new Set(['.html', '.css', '.svg', '.mjs', '.js', '.cjs', '.md']);
const SINGLE_SOURCE = path.join('src', 'data', 'safetyRules.ts');
// Tests may name forbidden numbers on purpose.
const SKIP_DIRS = new Set(['__tests__', 'node_modules']);
const EMERGENCY_DIGITS = new Set(EMERGENCY_CALLS.map((call) => call.number.replace(/\D/g, '')));

// Polish phone formats with separators: (22) 619 66 54, 22 619 66 54,
// 22-619-66-54, 661 442 576, 661-442-576, +48 ..., and any tel: link.
// Nine digits written together are not matched on purpose: they would hit
// iNaturalist/GBIF IDs (speciesGallery.ts, attributions.jsonl).
const PHONE = new RegExp(
  [
    String.raw`tel:\s*\+?\d`,
    String.raw`\(\d{2}\)\s?\d{3}[ -]?\d{2}[ -]?\d{2}`,
    String.raw`(?<![\d.])\d{2}[ -]\d{3}[ -]\d{2}[ -]\d{2}(?![\d.])`,
    String.raw`(?<![\d.])\d{3}[ -]\d{3}[ -]\d{3}(?![\d.])`,
    String.raw`\+48[ -]?\d`,
  ].join('|'),
);

// Same shapes as PHONE, but the whole number, so tel:112 is 112 and not just the first digit.
const PUBLIC_PHONE = new RegExp(
  [
    String.raw`tel:\s*\+?\d[\d\s()-]*`,
    String.raw`\(\d{2}\)\s?\d{3}[ -]?\d{2}[ -]?\d{2}`,
    String.raw`(?<![\d.])\d{2}[ -]\d{3}[ -]\d{2}[ -]\d{2}(?![\d.])`,
    String.raw`(?<![\d.])\d{3}[ -]\d{3}[ -]\d{3}(?![\d.])`,
    String.raw`\+48[ -]?\d[\d\s()-]*`,
  ].join('|'),
  'g',
);

function walk(dir: string, out: string[], extensions: Set<string>): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out, extensions);
    else if (extensions.has(path.extname(entry.name))) out.push(full);
  }
}

function phonesIn(text: string): string[] {
  PUBLIC_PHONE.lastIndex = 0;
  return [...text.matchAll(PUBLIC_PHONE)].map((match) => match[0].replace(/\D/g, ''));
}

/** Icon geometry is space-separated triples. Drop path data; keep text and attributes. */
function textForPhoneScan(rel: string, text: string): string {
  if (!rel.endsWith('.svg')) return text;
  return text.replace(/\sd=(?:"[^"]*"|'[^']*')/g, ' ');
}

describe('emergency phone numbers have a single source', () => {
  const files: string[] = [];
  SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d), files, TEXT_EXT));

  const topDir = (file: string) => path.relative(ROOT, file).split(path.sep)[0];

  it('scans files from src, assets and locales separately', () => {
    for (const dir of SCAN_DIRS) {
      expect(files.filter((f) => topDir(f) === dir).length).toBeGreaterThan(0);
    }
    const rel = files.map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
    expect(rel).toEqual(expect.arrayContaining(['locales/pl.json', 'locales/en.json']));
  });

  it.each([
    ['(22) 619 66 54'],
    ['22 619 66 54'],
    ['22-619-66-54'],
    ['661 442 576'],
    ['661-442-576'],
    ['+48 661 442 576'],
    ['tel:661442576'],
  ])('the pattern catches %s', (sample) => {
    expect(PHONE.test(sample)).toBe(true);
  });

  it.each([
    ["inatOriginal('189971985', EXT_JPG)"],
    ["observationUrl('61129056')"],
    ["const OBS_189971985 = '189971985';"],
    ["assets/gallery/paxillus_involutus/i97788827.webp"],
    ['https://www.inaturalist.org/observations/189971985'],
    ['2026-10-17'],
    ['Bezpieczne grzybobranie (2016), s. 35'],
  ])('the pattern ignores %s', (sample) => {
    expect(PHONE.test(sample)).toBe(false);
  });

  it('safetyRules.ts still contains numbers (guards the regex itself)', () => {
    const src = fs.readFileSync(path.join(ROOT, SINGLE_SOURCE), 'utf8');
    expect(PHONE.test(src)).toBe(true);
  });

  it('no phone number appears outside safetyRules.ts', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (rel === SINGLE_SOURCE) continue;
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (PHONE.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('site and scripts contain only EMERGENCY_CALLS', () => {
    const publicFiles: string[] = [];
    PUBLIC_DIRS.forEach((dir) => walk(path.join(ROOT, dir), publicFiles, PUBLIC_EXT));
    const relative = publicFiles.map((file) => path.relative(ROOT, file).split(path.sep).join('/'));
    expect(relative.some((file) => file.startsWith('site/') && file.endsWith('.html'))).toBe(true);
    expect(relative.some((file) => file.startsWith('scripts/') && file.endsWith('.mjs'))).toBe(true);

    const siteNumbers = new Set<string>();
    const offenders: string[] = [];
    for (const file of publicFiles) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      for (const digits of phonesIn(textForPhoneScan(rel, fs.readFileSync(file, 'utf8')))) {
        if (rel.startsWith('site/')) siteNumbers.add(digits);
        if (!EMERGENCY_DIGITS.has(digits)) offenders.push(`${rel}: ${digits}`);
      }
    }
    expect(offenders).toEqual([]);
    expect([...siteNumbers].sort()).toEqual([...EMERGENCY_DIGITS].sort());

    const centre = TOXICOLOGY_CENTERS[0].phones[0];
    const leaked = phonesIn(`<a href="tel:${centre.replace(/\D/g, '')}">${centre}</a>`);
    expect(leaked.some((digits) => EMERGENCY_DIGITS.has(digits))).toBe(false);
    expect(leaked.length).toBeGreaterThan(0);
  });
});
