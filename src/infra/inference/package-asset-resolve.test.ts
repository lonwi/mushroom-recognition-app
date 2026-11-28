import { createRequire } from 'node:module';
import { join } from 'node:path';

const nodeRequire = createRequire(join(process.cwd(), 'package.json'));
const { inferenceAssetResolveTarget } = nodeRequire('./scripts/inference-asset-resolve.cjs') as {
  inferenceAssetResolveTarget: (
    resolvedPath: string,
    generatedPath: string,
    enabled: boolean,
  ) => string;
};

const stub = '/repo/src/infra/inference/package-asset.ts';
const generated = '/repo/assets/inference/package-asset.js';

test('podmiana assetu jest tylko przy fladze i tylko dla zaślepki', () => {
  expect(inferenceAssetResolveTarget(stub, generated, false)).toBe(stub);
  expect(inferenceAssetResolveTarget(stub, generated, true)).toBe(generated);
  expect(
    inferenceAssetResolveTarget('/repo/src/infra/inference/tflite-runtime.ts', generated, true),
  ).toBe('/repo/src/infra/inference/tflite-runtime.ts');
  expect(
    inferenceAssetResolveTarget(
      'C:\\repo\\src\\infra\\inference\\package-asset.ts',
      generated,
      true,
    ),
  ).toBe(generated);
});
