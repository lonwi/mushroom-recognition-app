/**
 * Emergency phone numbers live only in src/data/safetyRules.ts.
 * Every other screen, card or dataset links to the emergency screen instead
 * of carrying its own numbers (owner decision, 2026-10-22).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['src', 'assets', 'locales'];
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.json', '.jsonl', '.md']);
const SINGLE_SOURCE = path.join('src', 'data', 'safetyRules.ts');
// Tests may name forbidden numbers on purpose.
const SKIP_DIRS = new Set(['__tests__', 'node_modules']);

// Polish phone formats with separators: (22) 619 66 54, 22 619 66 54,
// 661 442 576, 661-442-576, +48 ..., and any tel: link.
const PHONE = new RegExp(
  [
    String.raw`tel:\s*\+?\d`,
    String.raw`\(\d{2}\)\s?\d{3}[ -]?\d{2}[ -]?\d{2}`,
    String.raw`(?<![\d.])\d{2}\s\d{3}\s\d{2}\s\d{2}(?![\d.])`,
    String.raw`(?<![\d.])\d{3}[ -]\d{3}[ -]\d{3}(?![\d.])`,
    String.raw`\+48[ -]?\d`,
  ].join('|'),
);

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(path.extname(entry.name))) out.push(full);
  }
}

describe('emergency phone numbers have a single source', () => {
  const files: string[] = [];
  SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d), files));

  it('scans some files', () => {
    expect(files.length).toBeGreaterThan(0);
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
});
