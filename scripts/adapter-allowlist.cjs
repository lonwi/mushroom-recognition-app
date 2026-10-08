// Closed importer allowlist for platform adapters.
//
// dependency-cruiser baselines compare only (from, to). A new wrapper that
// calls asyncStorageStore.get/set would share a UI→adapter pair with the
// legitimate LanguageContext → settingsStore → keyValueStore chain and would
// not show up as a new baseline entry. These rules are therefore exact:
// every importer is named, and scripts/depcruise-gate.mjs refuses to
// grandfather them.
//
// Paths are the union of importers on today's main and on PR #16
// (cursor/code-quality-refactor-3eaf @ 279790a). keyValueStore lives at
// src/services/keyValueStore.ts or src/services/storage/keyValueStore.ts.
// The optional storage/ segment is only for that file. Other adapters stay
// at the paths that exist on main.
//
// Own tests are named here even though the cruise exclude already drops
// __tests__ and *.test/*.spec. A later include of tests must not turn those
// imports into violations, and must not open the list to production files.

function ownTests(baseName) {
  return `(?:^|/)${baseName}\\.(?:test|spec)\\.(?:ts|tsx|js|jsx)$`;
}

const journalEntry = '^src/services/journalEntry\\.ts$';
const storageService = '^src/services/storageService\\.ts$';
const journalSchema = '^src/services/storage/journalSchema\\.ts$';
const journalRepository = '^src/services/storage/journalRepository\\.ts$';
const classifierService = '^src/services/classifierService\\.ts$';
const journalScreen = '^src/screens/JournalScreen\\.tsx$';
const resultModal = '^src/components/ResultModal\\.tsx$';

const adapters = [
  {
    name: 'attributionPackage',
    to: '^src/services/attributionPackage\\.ts$',
    importers: [
      '^src/screens/SettingsScreen\\.tsx$',
      '^src/components/PhotoCredits\\.tsx$',
      '^src/__tests__/screens/SettingsScreen\\.test\\.tsx$',
      '^src/__tests__/components/PhotoCredits\\.test\\.tsx$',
      ownTests('attributionPackage'),
    ],
  },
  {
    name: 'journalLocation',
    to: '^src/services/journalLocation\\.ts$',
    importers: [
      journalEntry,
      '^src/services/mapsLink\\.ts$',
      storageService,
      journalSchema,
      ownTests('journalLocation'),
    ],
  },
  {
    name: 'journalPhotos',
    to: '^src/services/journalPhotos\\.ts$',
    importers: [
      journalEntry,
      journalScreen,
      resultModal,
      storageService,
      journalRepository,
      journalSchema,
      '^src/__tests__/services/storageService\\.test\\.ts$',
      ownTests('journalPhotos'),
    ],
  },
  {
    name: 'keyValueStore',
    to: '^src/services/(?:storage/)?keyValueStore\\.ts$',
    importers: [
      journalRepository,
      '^src/services/storage/settingsStore\\.ts$',
      '^src/services/storage/journalBackupStore\\.ts$',
      ownTests('keyValueStore'),
    ],
  },
  {
    name: 'photoPixels',
    to: '^src/services/photoPixels\\.ts$',
    importers: [
      '^src/screens/ScannerScreen\\.tsx$',
      classifierService,
      '^src/__tests__/screens/ScannerScreen\\.test\\.tsx$',
      '^src/__tests__/services/photoPixels\\.test\\.ts$',
      ownTests('photoPixels'),
    ],
  },
  {
    name: 'storageService',
    to: storageService,
    importers: [
      journalEntry,
      journalScreen,
      '^App\\.tsx$',
      resultModal,
      '^src/stories/JournalScreen\\.stories\\.tsx$',
      '^src/__tests__/screens/JournalScreen\\.test\\.tsx$',
      '^src/__tests__/services/journalEntry\\.test\\.ts$',
      '^src/__tests__/components/ResultModal\\.test\\.tsx$',
      '^src/__tests__/services/storageService\\.test\\.ts$',
      '^src/__tests__/services/storageCompatibility\\.test\\.ts$',
      ownTests('storageService'),
    ],
  },
  {
    name: 'tfliteRuntime',
    to: '^src/services/tfliteRuntime\\.ts$',
    importers: [classifierService, '^src/__tests__/services/tfliteRuntime\\.test\\.ts$', ownTests('tfliteRuntime')],
  },
];

module.exports = { adapters };
