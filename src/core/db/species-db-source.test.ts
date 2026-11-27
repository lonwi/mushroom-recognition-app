import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FALLBACK_CONTENT_VERSION,
  shouldReplaceDatabaseWithAsset,
  speciesDbSourceFromVersions,
} from '@/core/db/species-db-source';

const root = process.cwd();

test('pusty odczyt i sam siew to fallback, inna wersja to asset', () => {
  expect(speciesDbSourceFromVersions([])).toBe('fallback');
  expect(speciesDbSourceFromVersions([FALLBACK_CONTENT_VERSION])).toBe('fallback');
  expect(speciesDbSourceFromVersions([FALLBACK_CONTENT_VERSION, FALLBACK_CONTENT_VERSION])).toBe(
    'fallback',
  );
  expect(speciesDbSourceFromVersions(['2026-11-11.1'])).toBe('asset');
  expect(speciesDbSourceFromVersions([FALLBACK_CONTENT_VERSION, '2026-11-11.1'])).toBe('asset');
});

test('asset zastępuje pusty plik i siew, a zbudowanej bazy nie rusza', () => {
  expect(
    shouldReplaceDatabaseWithAsset({ assetBundled: false, populated: false, source: 'fallback' }),
  ).toBe(false);
  expect(
    shouldReplaceDatabaseWithAsset({ assetBundled: true, populated: false, source: 'fallback' }),
  ).toBe(true);
  expect(
    shouldReplaceDatabaseWithAsset({ assetBundled: true, populated: true, source: 'fallback' }),
  ).toBe(true);
  expect(
    shouldReplaceDatabaseWithAsset({ assetBundled: true, populated: true, source: 'asset' }),
  ).toBe(false);
});

test('wersja treści budowanej bazy nie jest znacznikiem siewu', () => {
  const version = readFileSync(join(root, 'data/sources/content-version.txt'), 'utf8').trim();
  expect(version.length).toBeGreaterThan(0);
  expect(version).not.toBe(FALLBACK_CONTENT_VERSION);
});

test('EAS buduje species.db po instalacji zależności, zanim Metro złoży paczkę', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  expect(pkg.scripts['eas-build-post-install']).toBe('pnpm build:species');
  const metro = readFileSync(join(root, 'metro.config.js'), 'utf8');
  expect(metro).toContain('speciesDbResolveTarget');
  const exporter = readFileSync(join(root, 'scripts/export-android.cjs'), 'utf8');
  expect(exporter).toContain('build-species-db.ts');
  expect(exporter).toContain('SQLite format 3');
});
