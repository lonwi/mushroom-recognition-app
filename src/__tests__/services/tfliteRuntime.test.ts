/// <reference types="jest" />
import fs from 'fs';
import path from 'path';

import * as classifiedPhotoTally from '../../services/classifiedPhotoTally';
import { classifiedPhotoCount, resetClassifiedPhotoCountForTests } from '../../services/classifiedPhotoTally';
import { classifyImageWithDeps } from '../../services/classifierService';
import { decideFromLogits } from '../../services/recognitionDecision';
import { createJournalEntryFromScan } from '../../services/journalEntry';
import { writeDelegateCalibrationDump } from '../../services/tfliteRuntime';
import type { ModelManifest } from '../../services/modelManifest';
import type { SightingRecord } from '../../types/mushroom';

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

function loadRuntime(
  loadTensorflowModel: jest.Mock,
  manifest?: ModelManifest,
): { runtime: RuntimeModule; timing: TimingModule } {
  jest.resetModules();
  jest.doMock('../../services/modelPackage', () => ({ PACKAGED_MODEL_MODULE: 1 }));
  if (manifest) {
    jest.doMock('../../services/modelManifest', () => ({ modelManifest: manifest }));
  }
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
    expect(calls).toEqual([[]]);
  });

  test('production uses Core ML only when that platform gate passed for this model', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      return { run: async () => [logitsBuffer()] };
    });
    const hash = 'a'.repeat(64);
    const sample = 'b'.repeat(64);
    const { runtime } = loadRuntime(load, passingRelease('core-ml', hash, sample));
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'ios';
    devFlag().__DEV__ = false;

    await runtime.runPackagedTflite(new Float32Array(3));

    expect(calls).toEqual([['core-ml']]);
  });

  test('a mismatched model hash keeps production on CPU', async () => {
    const calls: string[][] = [];
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      calls.push(delegates.slice());
      return { run: async () => [logitsBuffer()] };
    });
    const { runtime } = loadRuntime(load, passingRelease('android-gpu', 'a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)));
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';
    devFlag().__DEV__ = false;

    await runtime.runPackagedTflite(new Float32Array(3));

    expect(calls).toEqual([[]]);
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

  test('a production build does not dump delegate outputs', async () => {
    devFlag().__DEV__ = false;
    await expect(writeDelegateCalibrationDump([])).resolves.toBeNull();
  });

  test('a dev dump writes delegate and CPU logits once per sample image', async () => {
    resetClassifiedPhotoCountForTests();
    const cpu = Float32Array.from([1, 2, 3]);
    const gpu = Float32Array.from([4, 5, 6]);
    const load = jest.fn(async (_source: number, delegates: string[]) => ({
      run: async () => [(delegates.length > 0 ? gpu : cpu).buffer],
    }));
    const { runtime } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    const fileSystem = require('expo-file-system/legacy') as { writeAsStringAsync: jest.Mock };
    Platform.OS = 'android';
    devFlag().__DEV__ = true;

    const pathWritten = await runtime.writeDelegateCalibrationDump([
      { file: 'val/cap.png', split: 'val', classId: 'amanita_phalloides', input: new Float32Array(3) },
    ]);

    expect(pathWritten).toBe('file:///mock/cache/delegate-calibration.json');
    expect(load).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fileSystem.writeAsStringAsync.mock.calls[0][1] as string) as {
      measured_on: string;
      platform: string;
      images: { cpu_logits: number[]; delegate_logits: number[] }[];
    };
    expect(body.measured_on).toBe('device');
    expect(body.platform).toBe('android-gpu');
    expect(body.images[0].cpu_logits).toEqual([1, 2, 3]);
    expect(body.images[0].delegate_logits).toEqual([4, 5, 6]);
    expect(classifiedPhotoCount()).toBe(0);
    expect(runtimeSource()).not.toContain('journalEntry');
    expect(runtimeSource()).not.toContain('recordClassifiedPhoto');
  });

  // TODO(#50): once achievements land, assert the event log in achievementsStore,
  // not classifiedPhotoTally.
  test('a CPU retry is one decision, one journal entry, and one achievement count', async () => {
    resetClassifiedPhotoCountForTests();
    const recordClassifiedPhoto = jest.spyOn(classifiedPhotoTally, 'recordClassifiedPhoto');
    const { logits, manifest } = boleteManifest();
    const load = jest.fn(async (_source: number, delegates: string[]) => {
      if (delegates.length > 0) {
        return {
          run: async () => {
            throw new Error('gpu failed');
          },
        };
      }
      return { run: async () => [Float32Array.from(logits).buffer] };
    });
    const { runtime } = loadRuntime(load);
    const { Platform } = require('react-native') as typeof import('react-native');
    Platform.OS = 'android';
    devFlag().__DEV__ = true;
    const saves: SightingRecord[] = [];

    const result = await classifyImageWithDeps('file://camera/cap.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => new Uint8Array(fs.readFileSync(path.join(__dirname, '../fixtures/solid-red-2x2.png'))),
      runLogits: (input) => runtime.runPackagedTflite(input),
    });
    const decision = decideFromLogits(logits, manifest);

    expect(load).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(decision.status);
    if (result.status !== 'candidates' || decision.status !== 'candidates') {
      throw new Error('expected one candidate decision');
    }
    expect(result.top3[0].id).toBe(decision.top3[0].id);
    expect(result.expertVerificationRequired).toBe(decision.expertVerificationRequired);
    expect(recordClassifiedPhoto).toHaveBeenCalledTimes(1);
    expect(classifiedPhotoCount()).toBe(1);

    const save = jest.fn(async (record: SightingRecord) => {
      saves.push(record);
      return record;
    });
    await createJournalEntryFromScan(result, false, {
      createId: () => 'sighting_once',
      now: () => 1,
      readLocation: async () => null,
      persistPhoto: async () => 'cap.jpg',
      save,
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(saves).toHaveLength(1);
    expect(recordClassifiedPhoto).toHaveBeenCalledTimes(1);
    expect(classifiedPhotoCount()).toBe(1);
    recordClassifiedPhoto.mockRestore();
  });
});

function runtimeSource(): string {
  return fs.readFileSync(runtimePath, 'utf8');
}

function passingRelease(
  platform: 'android-gpu' | 'core-ml',
  modelHash: string,
  sampleHash: string,
  entryModelHash = modelHash,
): ModelManifest {
  return {
    model_packaged: true,
    recognition_available: true,
    dangerous_genera: [],
    model_sha256: modelHash,
    delegate_sample_sha256: sampleHash,
    delegate_release: {
      [platform]: {
        passed: true,
        model_sha256: entryModelHash,
        sample_sha256: sampleHash,
        top1_agreement: 0.99,
        high_risk_top1_agreement: 0.99,
        decision_agreement: 0.99,
        high_risk_decision_agreement: 0.99,
        decision_fields: ['status', 'top1', 'expertVerificationRequired'],
        max_energy_difference: 0,
        images: 4,
        high_risk_images: 2,
      },
    },
    ood: {
      method: 'energy',
      background_class_id: 'not_a_mushroom',
      temperature: 1,
      energy_threshold: null,
      min_softmax_for_accept: null,
      min_top1_softmax_for_high_confidence: null,
      min_margin: null,
      calibrated: false,
    },
    classes: [],
    input: { size: 224, formula: '(pixel / 127.5) - 1' },
  };
}

function boleteManifest(): { logits: number[]; manifest: ModelManifest } {
  const decisionCases = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../training/fixtures/decision_cases.json'), 'utf8'),
  ) as {
    cases: {
      name: string;
      logits: number[];
      class_ids: string[];
      genera: string[];
      ood: ModelManifest['ood'];
    }[];
  };
  const entry = decisionCases.cases.find((item) => item.name === 'confident_bolete');
  if (!entry) {
    throw new Error('confident_bolete');
  }
  return {
    logits: entry.logits,
    manifest: {
      model_packaged: true,
      recognition_available: true,
      dangerous_genera: ['Amanita', 'Cortinarius', 'Galerina', 'Gyromitra'],
      input: { size: 224, formula: '(pixel / 127.5) - 1' },
      ood: entry.ood,
      classes: entry.class_ids.map((id, index) => ({
        index,
        id,
        name: id,
        name_latin: id,
        genus: entry.genera[index],
      })),
    },
  };
}
