'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Znacznik tylko w src/screens/decoder-spike.tsx. Słownik i18n go nie ma,
// więc obecność w paczce znaczy, że ekran spike'a wszedł do bundla.
const DECODER_SPIKE_MARKER = 'spike-b-dekoder.txt';

// pnpm run sets NODE_PATH to node_modules/.pnpm/node_modules, which hides a
// missing direct Babel plugin. Gradle starts node without that variable.
// `env -u` is not available in cmd.exe, so clear it here.
const env = { ...process.env };
delete env.NODE_PATH;

// Paczka ma otwierać zbudowaną species.db, nie siew z donor-cards.json.
// Plik nie jest w gicie. Ten krok jest tym samym, co eas-build-post-install.
const built = spawnSync(
  process.execPath,
  [
    require.resolve('tsx/cli'),
    path.join(__dirname, 'build-species-db.ts'),
    '--report',
    path.join(os.tmpdir(), 'grzybobranie-content-gates-report.json'),
  ],
  { stdio: 'inherit', env, windowsHide: true },
);
if (built.error) {
  console.error(built.error);
  process.exit(1);
}
if (built.status !== 0) {
  process.exit(built.status ?? 1);
}

const child = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'export', '--platform', 'android', '--output-dir', 'dist'],
  { stdio: 'inherit', env, windowsHide: true },
);

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

function filesContaining(dir, needle) {
  const hits = [];
  if (!fs.existsSync(dir)) return hits;
  const bytes = Buffer.from(needle);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...filesContaining(full, needle));
      continue;
    }
    if (!entry.isFile()) continue;
    if (fs.readFileSync(full).includes(bytes)) hits.push(full);
  }
  return hits;
}

child.on('exit', (code, signal) => {
  if (signal || code) {
    process.exit(signal ? 1 : code);
  }
  const distDir = path.join(__dirname, '..', 'dist');
  const databases = filesContaining(distDir, 'SQLite format 3');
  if (databases.length === 0) {
    console.error('Paczka nie zawiera species.db (brak nagłówka SQLite format 3).');
    process.exit(1);
  }
  // CI odpala ten skrypt z NODE_ENV=production i bez flagi. Wtedy Metro
  // wycina src/app/dev, a tu sprawdzamy, że znacznik spike'a nie został.
  const releaseWithoutDevTools =
    process.env.NODE_ENV === 'production' && process.env.EXPO_PUBLIC_DEV_TOOLS !== '1';
  if (!releaseWithoutDevTools) {
    process.exit(0);
  }
  const hits = filesContaining(distDir, DECODER_SPIKE_MARKER);
  if (hits.length > 0) {
    console.error(`Paczka produkcyjna zawiera spike dekodera (${DECODER_SPIKE_MARKER}):`);
    for (const hit of hits) console.error(`  ${hit}`);
    process.exit(1);
  }
  process.exit(0);
});
