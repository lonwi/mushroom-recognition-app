import type { ModelRuntime } from '@/core/ai/model-runtime';

export function createFakeRuntime(
  cases: Readonly<Record<string, readonly number[]>>,
): ModelRuntime {
  return {
    implementation: 'fake',
    async run(fixtureId) {
      const row = cases[fixtureId];
      if (row === undefined) {
        throw new Error(`Unknown logit fixture: ${fixtureId}`);
      }
      return Float32Array.from(row);
    },
  };
}
