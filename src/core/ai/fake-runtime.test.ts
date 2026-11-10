import { createFakeRuntime } from '@/core/ai/fake-runtime';
import logits from '../../../fixtures/fake-runtime-logits.json';

test('returns fixture logits and nothing about edibility', async () => {
  const runtime = createFakeRuntime(logits);
  const result = await runtime.run('amanita_high');
  expect(runtime.implementation).toBe('fake');
  expect(result[0]).toBeCloseTo(6.2, 5);
  expect(result[1]).toBeCloseTo(0.4, 5);
  expect(result).toBeInstanceOf(Float32Array);
  expect(Object.keys(result)).not.toContain('edibility');
  await expect(runtime.run('missing')).rejects.toThrow(/Unknown logit fixture/);
});
