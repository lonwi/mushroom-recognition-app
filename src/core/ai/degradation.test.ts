import exampleManifest from '../../../fixtures/model-manifest.example.json';
import schema from '../../../schemas/model-manifest.schema.json';
import {
  assessDegradation,
  loadModelManifest,
  manifestSchemaCompileCount,
  type LoadContext,
  type ModelManifest,
} from '@/core/ai/degradation';

function context(patch: Partial<LoadContext> = {}): LoadContext {
  return {
    fileSha256: exampleManifest.model.sha256,
    atlasVersion: exampleManifest.minAtlasVersion,
    productionBuild: false,
    ...patch,
  };
}

function editable(): ModelManifest {
  return structuredClone(exampleManifest) as ModelManifest;
}

test('the example manifest degrades the way the draft describes', () => {
  const loaded = loadModelManifest(exampleManifest, schema, context());
  expect(loaded.valid).toBe(true);
  expect(loaded.capabilities.scannerAvailable).toBe(true);
  expect(loaded.capabilities.showTestBanner).toBe(true);
  expect(loaded.capabilities.canShowPercent).toBe(true);
  expect(loaded.capabilities.canFuse2).toBe(true);
  expect(loaded.capabilities.canFuse3).toBe(false);
  expect(loaded.capabilities.gpuDelegateAllowed).toBe(false);
  expect(loaded.capabilities.uncoveredSpeciesIds).toEqual(['macrolepiota_procera']);
});

test('a missing model file, an old atlas, or a missing energy gate turns the scanner off', () => {
  expect(
    loadModelManifest(exampleManifest, schema, context({ fileSha256: null })).capabilities.reasons,
  ).toContain('sha256');
  expect(
    loadModelManifest(exampleManifest, schema, context({ atlasVersion: '0.0.0' })).capabilities
      .reasons,
  ).toContain('atlas_version');
  const withoutGate = editable();
  delete withoutGate.ood.energyThreshold;
  const gated = loadModelManifest(withoutGate, schema, context());
  expect(gated.valid).toBe(true);
  expect(gated.capabilities.scannerAvailable).toBe(false);
  expect(gated.capabilities.canShowPercent).toBe(false);
  expect(gated.capabilities.reasons).toContain('gate_not_calibrated');
});

test('hides percents and fusion when calibration is missing or the ECE is high', () => {
  const uncalibrated = editable();
  uncalibrated.calibration = { calibrated: false };
  const hidden = loadModelManifest(uncalibrated, schema, context());
  expect(hidden.capabilities.scannerAvailable).toBe(true);
  expect(hidden.capabilities.canShowPercent).toBe(false);
  expect(hidden.capabilities.canFuse2).toBe(false);

  const wide = editable();
  if (wide.calibration) wide.calibration.eceTest = 0.2;
  const ece = loadModelManifest(wide, schema, context());
  expect(ece.capabilities.canShowPercent).toBe(false);
  expect(ece.capabilities.canFuse2).toBe(true);
  expect(ece.capabilities.reasons).toContain('ece');
});

test('a production build rejects a test channel and failed ship gates', () => {
  const loaded = loadModelManifest(exampleManifest, schema, context({ productionBuild: true }));
  expect(loaded.capabilities.scannerAvailable).toBe(false);
  expect(loaded.capabilities.reasons).toEqual(
    expect.arrayContaining(['test_channel', 'ship_gates']),
  );
});

test('rejects aggregate classes, inactive outputs, overlap, and too many classes', () => {
  const rejected = editable();
  rejected.rejectClasses = [
    { classId: 'not_a_mushroom', reason: 'not_a_mushroom', acceptThreshold: 0.5 },
  ];
  expect(loadModelManifest(rejected, schema, context()).capabilities.reasons).toContain(
    'reject_classes',
  );

  const inactive = editable();
  const first = inactive.classes[0];
  if (first) first.in_model = false;
  expect(loadModelManifest(inactive, schema, context()).capabilities.reasons).toContain(
    'inactive_class',
  );

  const overlap = editable();
  overlap.uncoveredSpecies = [{ speciesId: 'boletus_edulis' }];
  expect(loadModelManifest(overlap, schema, context()).capabilities.reasons).toContain(
    'uncovered_overlap',
  );

  const tooMany = editable();
  tooMany.classes = Array.from({ length: 68 }, (_, index) => ({
    index,
    classId: `species_${index}`,
    speciesIds: [`species_${index}`],
    in_model: true,
  }));
  tooMany.model.output.shape = [1, 68];
  tooMany.uncoveredSpecies = [];
  expect(loadModelManifest(tooMany, schema, context()).capabilities.reasons).toContain(
    'class_count',
  );
});

test('an unsupported major is a schema failure and a degradation reason', () => {
  const future = editable();
  future.schemaVersion = '2.0.0';
  expect(loadModelManifest(future, schema, context()).valid).toBe(false);
  expect(assessDegradation(future, context()).reasons).toContain('schema_major');
});

test('compiles each schema object once', () => {
  const before = manifestSchemaCompileCount();
  loadModelManifest(exampleManifest, schema, context());
  loadModelManifest(exampleManifest, schema, context());
  expect(manifestSchemaCompileCount() - before).toBeLessThanOrEqual(1);
  expect(manifestSchemaCompileCount()).toBeGreaterThan(0);
});

test('a broken document does not become a scanner', () => {
  const { classes: _classes, ...rest } = exampleManifest;
  const loaded = loadModelManifest(rest, schema, context());
  expect(loaded.valid).toBe(false);
  expect(loaded.capabilities.scannerAvailable).toBe(false);
  expect(loaded.capabilities.reasons).toEqual(['schema']);
});
