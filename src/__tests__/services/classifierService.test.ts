/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { MUSHROOMS_DATABASE } from '../../data/mushrooms';
import {
  classifierService,
  classifyImageWithDeps,
  MODEL_MISSING_REASON,
} from '../../services/classifierService';
import { PACKAGED_MODEL_MODULE } from '../../services/modelPackage';
import { modelManifest } from '../../services/modelManifest';

const serviceSource = fs.readFileSync(
  path.join(__dirname, '../../services/classifierService.ts'),
  'utf8'
);

describe('classifierService when no pixel model is installed', () => {
  test('does not report recognition as available', () => {
    expect(classifierService.isRecognitionAvailable()).toBe(false);
  });

  test('a captured photo produces no species label and no confidence', async () => {
    const result = await classifierService.classifyImage('file://camera/capture.jpg');

    expect(result.status).toBe('unavailable');
    expect(result.reason).toBe(MODEL_MISSING_REASON);
    expect(result.processedImageUri).toBe('file://camera/capture.jpg');
    expect(Object.keys(result).sort()).toEqual(['processedImageUri', 'reason', 'status']);
    expect(result).not.toHaveProperty('topPredictions');
    expect(result).not.toHaveProperty('confidence');
    expect(result).not.toHaveProperty('inferenceTimeMs');
    expect(JSON.stringify(result)).not.toMatch(/\d+(\.\d+)?\s*%/);

    for (const species of MUSHROOMS_DATABASE) {
      expect(JSON.stringify(result)).not.toContain(species.id);
      expect(JSON.stringify(result)).not.toContain(species.namePl);
      expect(JSON.stringify(result)).not.toContain(species.nameLatin);
    }
  });

  test('different photos do not change the outcome into a species guess', async () => {
    const first = await classifierService.classifyImage('file://camera/one.jpg');
    const second = await classifierService.classifyImage('file://camera/two.jpg');

    expect(first.status).toBe('unavailable');
    expect(second.status).toBe('unavailable');
    expect(first.reason).toBe(second.reason);
  });

  test('a forced species id cannot produce that species or a confidence', async () => {
    const result = await (classifierService.classifyImage as (uri: string, forced?: string) => Promise<unknown>)(
      'file://camera/capture.jpg',
      'amanita_phalloides'
    );

    expect(result).toEqual({
      status: 'unavailable',
      reason: MODEL_MISSING_REASON,
      processedImageUri: 'file://camera/capture.jpg',
    });
    expect(JSON.stringify(result)).not.toContain('amanita_phalloides');
    expect(JSON.stringify(result)).not.toContain('Muchomor');
    expect(JSON.stringify(result)).not.toMatch(/%/);
  });

  test('labels.json is not treated as a model that can name a mushroom', async () => {
    const labels = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../../assets/models/labels.json'), 'utf8')
    ) as { classes: { id: string; name: string }[] };

    expect(labels.classes.length).toBeGreaterThan(0);
    expect(classifierService.isRecognitionAvailable()).toBe(false);

    const result = await classifierService.classifyImage('file://camera/capture.jpg');
    const serialized = JSON.stringify(result);
    for (const cls of labels.classes) {
      expect(serialized).not.toContain(cls.id);
      expect(serialized).not.toContain(cls.name);
    }
  });

  test('the service no longer floors confidence or fakes inference timing', () => {
    expect(serviceSource).not.toContain('94.2');
    expect(serviceSource).not.toContain('forcedSpeciesId');
    expect(serviceSource).not.toMatch(/Math\.max\(\s*118/);
    expect(serviceSource).not.toContain('@tensorflow/tfjs');
    expect(serviceSource).not.toContain("from 'react-native-fast-tflite'");
  });

  test('the packaged model file is absent and the manifest is not calibrated', () => {
    expect(PACKAGED_MODEL_MODULE).toBeNull();
    expect(fs.existsSync(path.join(__dirname, '../../../assets/models/mushrooms_model.tflite'))).toBe(false);
    expect(modelManifest.model_packaged).toBe(false);
    expect(modelManifest.recognition_available).toBe(false);
    expect(modelManifest.ood.calibrated).toBe(false);
    expect(modelManifest.classes.some((item) => 'status' in item || 'edibility' in item)).toBe(false);
  });
});

describe('classifierService when a calibrated model is injected', () => {
  const decisionCases = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../training/fixtures/decision_cases.json'), 'utf8'),
  ) as {
    cases: {
      name: string;
      logits: number[];
      class_ids: string[];
      genera: string[];
      ood: typeof modelManifest.ood;
    }[];
  };

  function manifestFor(name: string) {
    const entry = decisionCases.cases.find((item) => item.name === name);
    if (!entry) {
      throw new Error(name);
    }
    return {
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
      logits: entry.logits,
    };
  }

  function redPng(): Uint8Array {
    return new Uint8Array(fs.readFileSync(path.join(__dirname, '../fixtures/solid-red-2x2.png')));
  }

  test('rejects an overconfident fungus softmax without naming the species', async () => {
    const { manifest, logits } = manifestFor('cat_softmax_0_53_rejected_by_energy');
    const runLogits = jest.fn(async (input: Float32Array) => {
      expect(input).toHaveLength(224 * 224 * 3);
      expect(input[0]).toBeCloseTo(1, 5);
      expect(input[1]).toBeCloseTo(-1, 5);
      expect(input[2]).toBeCloseTo(-1, 5);
      return Float32Array.from(logits);
    });
    const result = await classifyImageWithDeps('file://camera/cat.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => redPng(),
      runLogits,
    });

    expect(runLogits).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'not_a_mushroom',
      processedImageUri: 'file://camera/cat.jpg',
    });
    expect(result).toHaveProperty('inferenceTimeMs');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('boletus_edulis');
    expect(serialized).not.toContain('amanita_phalloides');
    expect(serialized).not.toMatch(/%/);
    expect(result).not.toHaveProperty('top3');
  });

  test('warns when Amanita is in the top three and does not attach edibility', async () => {
    const { manifest, logits } = manifestFor('amanita_in_top3');
    const result = await classifyImageWithDeps('file://camera/cap.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => redPng(),
      runLogits: async () => Float32Array.from(logits),
    });

    expect(result.status).toBe('candidates');
    if (result.status !== 'candidates') {
      return;
    }
    expect(result.warningReasons).toContain('dangerous_genus');
    expect(result.expertVerificationRequired).toBe(true);
    expect(result.top3.map((item) => item.genus)).toContain('Amanita');
    for (const candidate of result.top3) {
      expect(candidate).not.toHaveProperty('status');
      expect(candidate).not.toHaveProperty('edibility');
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(candidate.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('an uncalibrated gate never runs the model', async () => {
    const { manifest } = manifestFor('confident_bolete');
    const runLogits = jest.fn();
    const result = await classifyImageWithDeps('file://camera/cap.jpg', {
      packagedModel: 1,
      manifest: {
        ...manifest,
        ood: { ...manifest.ood, calibrated: false, energy_threshold: null },
      },
      readPngBytes: async () => redPng(),
      runLogits,
    });
    expect(runLogits).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'unavailable',
      reason: 'gate_not_calibrated',
      processedImageUri: 'file://camera/cap.jpg',
    });
  });

  test('rejects as unclear below the 0.40 softmax floor and names no species', async () => {
    const { manifest, logits } = manifestFor('softmax_below_0_40_unclear');
    expect(manifest.ood.min_softmax_for_accept).toBe(0.4);
    const result = await classifyImageWithDeps('file://camera/blur.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => redPng(),
      runLogits: async () => Float32Array.from(logits),
    });

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') {
      return;
    }
    expect(result.reason).toBe('unclear');
    expect(result).toHaveProperty('inferenceTimeMs');
    expect(result).not.toHaveProperty('top3');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('boletus_edulis');
    expect(serialized).not.toContain('tylopilus_felleus');
    expect(serialized).not.toContain('not_a_mushroom');
    expect(serialized).not.toMatch(/%/);
  });

  test('non-finite logits are output_mismatch and name no species', async () => {
    const { manifest } = manifestFor('confident_bolete');
    const result = await classifyImageWithDeps('file://camera/nan.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => redPng(),
      runLogits: async () => Float32Array.from([Number.NaN, 8, 0, -1]),
    });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'output_mismatch',
      processedImageUri: 'file://camera/nan.jpg',
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('boletus_edulis');
    expect(serialized).not.toContain('not_a_mushroom');
    expect(serialized).not.toMatch(/%/);
    expect(result).not.toHaveProperty('inferenceTimeMs');
  });

  test('a decode failure stays unavailable', async () => {
    const { manifest } = manifestFor('confident_bolete');
    const runLogits = jest.fn();
    const result = await classifyImageWithDeps('file://camera/cap.jpg', {
      packagedModel: 1,
      manifest,
      readPngBytes: async () => {
        throw new Error('unreadable');
      },
      runLogits,
    });
    expect(runLogits).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'unavailable',
      reason: 'decode_failed',
      processedImageUri: 'file://camera/cap.jpg',
    });
  });
});
