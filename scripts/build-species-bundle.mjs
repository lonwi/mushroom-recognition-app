// Build the packaged species dataset from the source-of-truth module.
//
// `src/data/mushrooms.ts` stays the editable source. This script transpiles it
// (it only imports a type, so there is no runtime dependency), extracts the
// species array, and writes two files into assets/models:
//   - species.json          the species dataset (bundled as the offline baseline)
//   - species-manifest.json the descriptive contract (schemaVersion, datasetVersion,
//                           publishedAt, speciesCount, sha256 of species.json)
//
// Determinism matters: the same source must always produce the same bytes, so the
// recorded sha256 stays stable across builds.
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ts = await import('typescript');
const require = createRequire(import.meta.url);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src/data/mushrooms.ts');
const outDir = resolve(root, 'assets/models');

const sourceText = await readFile(source, 'utf8');

// Strip types only. mushrooms.ts imports just a type, so the emitted JS is
// self-contained and requires no project-wide compilation.
const emitted = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    isolatedModules: true,
  },
  fileName: source,
});
const js = emitted.outputText;

const tmp = mkdtempSync(join(tmpdir(), 'species-bundle-'));
const entry = join(tmp, 'mushrooms.cjs');
writeFileSync(entry, js);
const mod = require(entry);

// Keep only the species array. The notes/constants and helper functions stay in
// mushrooms.ts as the editable source and operate on whatever data the loader passes in.
const species = mod.MUSHROOMS_DATABASE;
if (!Array.isArray(species) || species.length === 0) {
  throw new Error('mushrooms.ts does not export a non-empty MUSHROOMS_DATABASE array');
}

const publishedAt = new Date().toISOString().slice(0, 10);
const manifest = {
  schemaVersion: 1,
  datasetVersion: publishedAt,
  publishedAt,
  speciesCount: species.length,
};

// Stable key order for deterministic bytes.
const speciesJson = JSON.stringify(
  species.map((s) => ({
    id: s.id,
    namePl: s.namePl,
    nameEn: s.nameEn,
    nameLatin: s.nameLatin,
    commonNicknames: s.commonNicknames,
    family: s.family,
    status: s.status,
    incompleteCard: s.incompleteCard,
    hymenophore: s.hymenophore,
    months: s.months,
    habitat: s.habitat,
    capDescription: s.capDescription,
    hymenophoreDescription: s.hymenophoreDescription,
    stemDescription: s.stemDescription,
    fleshDescription: s.fleshDescription,
    tasteAndSmell: s.tasteAndSmell,
    culinaryValue: s.culinaryValue,
    confusionRisks: s.confusionRisks,
    warningNotes: s.warningNotes,
    noDangerousLookAlikes: s.noDangerousLookAlikes,
  })),
  null,
  2,
);

manifest.sha256 = createHash('sha256').update(speciesJson).digest('hex');

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'species.json'), `${speciesJson}\n`, 'utf8');
await writeFile(
  join(outDir, 'species-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

rmSync(tmp, { recursive: true, force: true });

console.log(
  `Built species dataset: ${species.length} species, datasetVersion ${manifest.datasetVersion}, sha256 ${manifest.sha256.slice(0, 12)}…`,
);
