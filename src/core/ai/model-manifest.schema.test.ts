import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import schema from '../../../schemas/model-manifest.schema.json';
import { loadModelManifest, type LoadContext } from '@/core/ai/degradation';

/**
 * SHA-256 of `schemas/model-manifest.schema.json`.
 * Pinned to lonwi/mushroom-recognition-app-ml commit cfa6dc0 (schema 1.0.1).
 * Change it only when that file is copied again from the ML repo.
 */
const MODEL_MANIFEST_SCHEMA_SHA256 =
  '428ec81e4013334f6c57c4d151ccaf7ecd3f2b43df4edf1c41e2e71e571b9798';

const SCHEMA_PATH = 'schemas/model-manifest.schema.json';

const loadContext: LoadContext = {
  fileSha256: null,
  atlasVersion: '0.0.0',
  productionBuild: false,
};

function assertValidManifest(document: unknown, label: string): void {
  const loaded = loadModelManifest(document, schema, loadContext);
  expect({ label, valid: loaded.valid, errors: loaded.errors }).toEqual({
    label,
    valid: true,
    errors: [],
  });
}

test('schemas/model-manifest.schema.json matches the pinned ML-repo SHA-256', () => {
  const digest = createHash('sha256').update(readFileSync(SCHEMA_PATH)).digest('hex');
  expect(digest).toBe(MODEL_MANIFEST_SCHEMA_SHA256);
});

test('example and fixture manifests validate with the app Ajv setup', () => {
  const names = readdirSync('fixtures').filter(
    (name) => name.startsWith('model-manifest') && name.endsWith('.json'),
  );
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    assertValidManifest(JSON.parse(readFileSync(join('fixtures', name), 'utf8')) as unknown, name);
  }

  expect(schema.examples.length).toBeGreaterThan(0);
  schema.examples.forEach((example, index) => {
    assertValidManifest(example, `schema.examples[${index}]`);
  });
});
