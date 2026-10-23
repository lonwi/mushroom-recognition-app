/// <reference types="jest" />
import fs from 'fs';
import path from 'path';

const runtimePath = path.join(__dirname, '../../services/tfliteRuntime.ts');
const timingPath = path.join(__dirname, '../../services/inferenceTiming.ts');

function devFlag(): { __DEV__?: boolean } {
  return globalThis as { __DEV__?: boolean };
}

type RuntimeModule = typeof import('../../services/tfliteRuntime');
type TimingModule = typeof import('../../services/inferenceTiming');

function logitsBuffer(): ArrayBuffer {
  return Float32Array.from([1, 2, 3]).buffer;
}

function loadRuntime(loadTensorflowModel: jest.Mock): { runtime: RuntimeModule; timing: TimingModule } {
  jest.resetModules();
  jest.doMock('../../services/modelPackage', () => ({ PACKAGED_MODEL_MODULE: 1 }));
  jest.doMock('react-native-fast-tflite', () => ({ loadTensorflowModel }));
  const runtime = require('../../services/tfliteRuntime') as RuntimeModule;
  const timing = require('../../services/inferenceTiming') as TimingModule;
  timing.resetInferenceTimingForTests();
  return { runtime, timing };
}

describe('tflite runtime when the packaged model is null', () => {
  test('maps a .tflite require to null', () => {
    expect(require('../../../assets/models/mushrooms_model.tflite')).toBeNull();
  });

  test("does not require('react-native-fast-tflite')", async () => {
    const required: string[] = [];
    jest.resetModules();
    jest.doMock('react-native-fast-tflite', () => {
      required.push('react-native-fast-tflite');
      return { loadTensorflowModel: jest.fn() };
    });

    const { runPackagedTflite } = require('../../services/tfliteRuntime') as RuntimeModule;
    await expect(runPackagedTflite(new Float32Array([0, 0, 0]))).rejects.toThrow('model_missing');
    expect(required).toEqual([]);
  });

  test('does not phone home with the timing measurement', () => {
    const runtimeSource = fs.readFileSync(runtimePath, 'utf8');
    const timingSource = fs.readFileSync(timingPath, 'utf8');
    expect(runtimeSource).not.toMatch(/https?:\/\//);
    expect(timingSource).not.toMatch(/https?:\/\//);
    expect(runtimeSource).not.toMatch(/\bfetch\s*\(/);
    expect(timingSource).not.toMatch(/\bfetch\s*\(/);
    expect(runtimeSource).not.toContain('XMLHttpRequest');
    expect(timingSource).not.toContain('XMLHttpRequest');
  });
});

describe('tflite hardware delegate', () => {
  const previousDev = devFlag().__DEV__;
  const { Platform } = require('react-native') as typeof import('react-native');
  const previousOs = Platform.OS;

  afterEach(() => {
    devFlag().__DEV__ = previousDev;
    Platform.OS = previousOs;
    jest.restoreAllMocks();
    jest.resetModules();
    jest.dontMock('../../services/modelPackage');
    jest.dontMock('react-native-fast-tflite');
  });

  test('selects the Android GPU delegate, Core ML on iOS, and CPU elsewhere', async () => {
    const seen: Record<string, string[][]> = { android: [], ios: [], web: [] };
    let os: 'android' | 'ios' | 'web' = 'android';
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      seen[os]?.push(delegates.slice());
      return { run: async () => [logitsBuffer()] };
    });

    for (const next of ['android', 'ios', 'web'] as const) {
      os = next;
      const { runtime } = loadRuntime(load);
      const loaded = require('react-native') as typeof import('react-native');
      loaded.Platform.OS = next;
      await runtime.runPackagedTflite(new Float32Array(3));
    }

    expect(seen.android).toEqual([['android-gpu']]);
    expect(seen.ios).toEqual([['core-ml']]);
    expect(seen.web).toEqual([[]]);
  });

  test('falls back to CPU when the Android GPU delegate fails to load', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates);
      if (delegates.length > 0) {
        throw new Error('opencl missing');
      }
      return { run: async () => [logitsBuffer()] };
    });
    const { runtime } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';

    const output = await runtime.runPackagedTflite(new Float32Array(3));

    expect(Array.from(output)).toEqual([1, 2, 3]);
    expect(calls).toEqual([['android-gpu'], []]);
  });

  test('retries on CPU when Core ML throws during model.run', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      if (delegates.includes('core-ml')) {
        return {
          run: async () => {
            throw new Error('coreml invoke failed');
          },
        };
      }
      return { run: async () => [logitsBuffer()] };
    });
    const { runtime, timing } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'ios';

    const output = await runtime.runPackagedTflite(new Float32Array(3));
    expect(Array.from(output)).toEqual([1, 2, 3]);
    expect(calls).toEqual([['core-ml'], []]);
    expect(timing.getLastInferenceTiming()?.delegate).toBe('cpu');
    expect(timing.getLastInferenceTiming()?.fellBackToCpu).toBe(true);

    calls.length = 0;
    await runtime.runPackagedTflite(new Float32Array(3));
    expect(calls).toEqual([]);
  });

  test('keeps a successful GPU delegate and records dev-only inference milliseconds', async () => {
    let now = 50;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      return {
        run: async () => {
          now = 65.6;
          return [logitsBuffer()];
        },
      };
    });
    const { runtime, timing } = loadRuntime(load);
    const seen: Array<{ inferenceMs: number; delegate: string }> = [];
    timing.subscribeInferenceTiming((timingEvent) => {
      seen.push({ inferenceMs: timingEvent.inferenceMs, delegate: timingEvent.delegate });
    });
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';
    devFlag().__DEV__ = true;

    await runtime.runPackagedTflite(new Float32Array(3));

    expect(calls).toEqual([['android-gpu']]);
    expect(timing.getLastInferenceTiming()).toEqual({
      inferenceMs: 16,
      delegate: 'android-gpu',
      fellBackToCpu: false,
    });
    expect(seen).toEqual([{ inferenceMs: 16, delegate: 'android-gpu' }]);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('inference 16 ms'));
  });

  test('does not log or retain inference milliseconds outside dev builds', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const load = jest.fn(async () => ({ run: async () => [logitsBuffer()] }));
    const { runtime, timing } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';
    devFlag().__DEV__ = false;

    await runtime.runPackagedTflite(new Float32Array(3));

    expect(timing.getLastInferenceTiming()).toBeNull();
    expect(info).not.toHaveBeenCalled();
  });

  test('a dev CPU measurement skips the hardware delegate', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      return { run: async () => [logitsBuffer()] };
    });
    const { runtime, timing } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';
    devFlag().__DEV__ = true;
    timing.setDevDelegateMode(timing.CPU_RUNTIME);

    const output = await runtime.runPackagedTflite(new Float32Array(3));

    expect(Array.from(output)).toEqual([1, 2, 3]);
    expect(calls).toEqual([[]]);
    expect(timing.getLastInferenceTiming()?.fellBackToCpu).toBe(false);
  });

  test('ignores the dev CPU switch outside dev builds', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      if (delegates.length > 0) {
        throw new Error('delegate unavailable');
      }
      return { run: async () => [logitsBuffer()] };
    });
    const { runtime, timing } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'ios';
    devFlag().__DEV__ = false;
    timing.setDevDelegateMode(timing.CPU_RUNTIME);

    await runtime.runPackagedTflite(new Float32Array(3));

    expect(timing.getDevDelegateMode()).toBe(timing.AUTO_DELEGATE);
    expect(calls).toEqual([['core-ml'], []]);
  });

  test('does not loop when the CPU delegate itself fails', async () => {
    const load = jest.fn(async () => ({
      run: async () => {
        throw new Error('cpu failed');
      },
    }));
    const { runtime } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'web';

    await expect(runtime.runPackagedTflite(new Float32Array(3))).rejects.toThrow('cpu failed');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
