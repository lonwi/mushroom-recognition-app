import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import manifest from '../../../fixtures/model-manifest-0.2.0-rc1-test.json';
import {
  INFERENCE_MANIFEST_SHA256,
  INFERENCE_MODEL_BYTES,
  INFERENCE_MODEL_SHA256,
} from '@/core/ai/inference-package';
import { readInferenceContract } from '@/core/ai/inference-contract';

test('manifest 0.2.0-rc1-test ma progi paczki i 66 klas', () => {
  const sha = createHash('sha256')
    .update(readFileSync('fixtures/model-manifest-0.2.0-rc1-test.json'))
    .digest('hex');
  expect(sha).toBe(INFERENCE_MANIFEST_SHA256);
  const contract = readInferenceContract(manifest);
  expect(contract.modelVersion).toBe('0.2.0-rc1-test');
  expect(contract.channel).toBe('test');
  expect(contract.sha256).toBe(INFERENCE_MODEL_SHA256);
  expect(contract.sizeBytes).toBe(INFERENCE_MODEL_BYTES);
  expect(contract.classIds).toHaveLength(66);
  expect(contract.classIds[0]).toBe('agaricus_campestris');
  expect(contract.temperatures).toEqual({ probability: 1.133, energy: 1.133 });
  expect(contract.single).toEqual({ energyThreshold: -2.9074, minTop1Prob: 0.7 });
  expect(contract.fusion3.energyThreshold).toBe(-2.9074);
  expect(contract.preprocessing.inputSize).toEqual({ width: 256, height: 256 });
  expect(contract.preprocessing.normalization).toEqual({
    type: 'scale_offset',
    scale: 0.00784313725490196,
    offset: -1,
  });
  expect(contract.preprocessing.crop).toBe('none_stretch');
  expect(contract.preprocessing.rounding).toBe('half_up_uint8');
  expect(contract.preprocessing.colorOrder).toBe('RGB');
  expect(JSON.stringify(contract)).not.toMatch(/edib|jadaln|verdict/i);
});
