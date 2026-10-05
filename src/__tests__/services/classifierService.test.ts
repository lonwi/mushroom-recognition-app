/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { MUSHROOMS_DATABASE } from '../../data/mushrooms';
import { classifierService, MODEL_MISSING_REASON } from '../../services/classifierService';

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
});
