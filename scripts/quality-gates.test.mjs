import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const { adapters } = require('./adapter-allowlist.cjs');
const cruiseConfig = require('../.dependency-cruiser.cjs');

const IMPORTER_PREFIX = 'adapter-importer-';
const PLATFORM_PACKAGE = '@react-native-async-storage/async-storage';
const WRAPPER = 'src/services/qaRawStore.ts';
const SCREEN = 'src/screens/QaRawScreen.tsx';
const STORE = 'src/services/storage/keyValueStore.ts';

function adapter(name) {
  return adapters.find((item) => item.name === name);
}

function allows(name, file) {
  return adapter(name).importers.some((pattern) => new RegExp(pattern).test(file));
}

describe('adapter importer allowlist', { concurrency: 1 }, () => {
  test('keyValueStore accepts both paths and only the storage facades', () => {
    const target = new RegExp(adapter('keyValueStore').to);
    assert.equal(target.test('src/services/keyValueStore.ts'), true);
    assert.equal(target.test('src/services/storage/keyValueStore.ts'), true);
    assert.equal(target.test('src/services/storage/keyValueStoreExtra.ts'), false);
    assert.equal(allows('keyValueStore', 'src/services/storage/journalRepository.ts'), true);
    assert.equal(allows('keyValueStore', 'src/services/storage/settingsStore.ts'), true);
    assert.equal(allows('keyValueStore', 'src/services/storage/journalBackupStore.ts'), true);
    assert.equal(allows('keyValueStore', 'src/__tests__/services/keyValueStore.test.ts'), true);
    assert.equal(allows('keyValueStore', 'src/contexts/LanguageContext.tsx'), false);
    assert.equal(allows('keyValueStore', WRAPPER), false);
    assert.equal(allows('keyValueStore', SCREEN), false);
  });

  test('other adapters stay on their main paths and reject an outside wrapper', () => {
    for (const item of adapters) {
      if (item.name === 'keyValueStore') continue;
      const target = new RegExp(item.to);
      assert.equal(target.test(`src/services/${item.name}.ts`), true);
      assert.equal(target.test(`src/services/storage/${item.name}.ts`), false);
      assert.equal(allows(item.name, WRAPPER), false);
      assert.equal(allows(item.name, SCREEN), false);
    }
    assert.equal(allows('journalLocation', 'src/services/storage/journalSchema.ts'), true);
    assert.equal(allows('journalPhotos', 'src/services/storage/journalRepository.ts'), true);
    assert.equal(allows('journalPhotos', 'src/services/storage/journalSchema.ts'), true);
    assert.equal(allows('storageService', 'App.tsx'), true);
    assert.equal(allows('tfliteRuntime', 'src/services/classifierService.ts'), true);
    assert.equal(cruiseConfig.forbidden.some((rule) => rule.name === 'ui-not-to-platform-adapter-reachable'), false);
    assert.equal(cruiseConfig.forbidden.some((rule) => rule.name === 'ui-not-to-platform-adapter'), false);
  });

  test('the dependency baseline does not grandfather importer rules', () => {
    const baseline = JSON.parse(fs.readFileSync('.dependency-cruiser-known-violations.json', 'utf8'));
    assert.equal(baseline.some((violation) => String(violation.rule?.name ?? '').startsWith(IMPORTER_PREFIX)), false);
    assert.equal(baseline.some((violation) => String(violation.rule?.name ?? '').includes('platform-adapter')), false);
    assert.equal(baseline.length, 3);
    assert.equal(baseline.every((violation) => violation.rule?.name === 'ui-not-to-storage-or-platform'), true);
  });
});

describe('platform binding re-exports', { concurrency: 1 }, () => {
  const eslint = new ESLint({ cwd: process.cwd() });

  async function platformFindings(code) {
    const [result] = await eslint.lintText(code, { filePath: 'src/services/journalPhotos.ts' });
    return result.messages.filter((message) => message.ruleId === 'grzybobranie/no-platform-reexport');
  }

  test('narrow wrappers and import type stay allowed', async () => {
    const allowed = [
      `import AsyncStorage from '${PLATFORM_PACKAGE}';
export const asyncStorageStore = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
};`,
      `import type { PermissionResponse } from 'expo-camera';
export function keep(value: PermissionResponse | null): PermissionResponse | null {
  return value;
}`,
      `import type { PermissionResponse } from 'expo-camera';
export type { PermissionResponse };`,
    ];
    for (const code of allowed) {
      assert.deepEqual(await platformFindings(code), []);
    }
  });

  test('exporting a platform import binding fails', async () => {
    const banned = [
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
export const qaRaw = QaAsyncStorage;`,
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
export const qaRaw = QaAsyncStorage.default;`,
      `import * as QaAsyncStorage from '${PLATFORM_PACKAGE}';
export const qaRaw = QaAsyncStorage.default;`,
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
export default QaAsyncStorage;`,
      `import * as QaAsyncStorage from '${PLATFORM_PACKAGE}';
export default QaAsyncStorage.default;`,
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
export { QaAsyncStorage };`,
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
const qaRaw = QaAsyncStorage;
export { qaRaw };`,
      `import QaAsyncStorage from '${PLATFORM_PACKAGE}';
const qaRaw = QaAsyncStorage;
export default qaRaw;`,
      `export { default } from '${PLATFORM_PACKAGE}';`,
      `export * from 'expo-file-system';`,
    ];
    for (const code of banned) {
      const findings = await platformFindings(code);
      assert.equal(findings.length > 0, true, code);
    }
  });
});

describe('depcruise fixture', { concurrency: 1 }, () => {
  test('a wrapper outside the allowlist fails the gate', () => {
    const storageDir = path.dirname(STORE);
    const createdDir = !fs.existsSync(storageDir);
    const storeExisted = fs.existsSync(STORE);
    fs.mkdirSync(storageDir, { recursive: true });
    const created = [];
    if (!storeExisted) {
      fs.writeFileSync(
        STORE,
        `import AsyncStorage from '${PLATFORM_PACKAGE}';
export const asyncStorageStore = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
};
`,
      );
      created.push(STORE);
    }
    fs.writeFileSync(
      WRAPPER,
      `import { asyncStorageStore } from './storage/keyValueStore';
export const qaRawStore = {
  get: (key: string) => asyncStorageStore.getItem(key),
  set: (key: string, value: string) => asyncStorageStore.setItem(key, value),
};
`,
    );
    fs.writeFileSync(
      SCREEN,
      `import { qaRawStore } from '../services/qaRawStore';
export function QaRawScreen(): null {
  void qaRawStore.get('k');
  void qaRawStore.set('k', 'v');
  return null;
}
`,
    );
    created.push(WRAPPER, SCREEN);
    try {
      const result = spawnSync(process.execPath, ['scripts/depcruise-gate.mjs'], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /adapter-importer-keyValueStore/);
      assert.match(result.stderr, /qaRawStore\.ts/);
    } finally {
      for (const file of created) fs.rmSync(file, { force: true });
      if (createdDir) fs.rmSync(storageDir, { recursive: true, force: true });
    }
  });
});
