/// <reference types="jest" />
import fs from 'fs';
import path from 'path';

import { DELEGATE_AGREEMENT_MIN, delegateReleasePassed } from '../../services/delegateRelease';
import type { ModelManifest } from '../../services/modelManifest';

function manifest(patch: Partial<NonNullable<ModelManifest['delegate_release']>['android-gpu']> = {}): ModelManifest {
  const hash = 'a'.repeat(64);
  const sample = 'b'.repeat(64);
  return {
    model_packaged: true,
    recognition_available: true,
    dangerous_genera: [],
    model_sha256: hash,
    delegate_sample_sha256: sample,
    delegate_release: {
      'android-gpu': {
        passed: true,
        model_sha256: hash,
        sample_sha256: sample,
        top1_agreement: DELEGATE_AGREEMENT_MIN,
        high_risk_top1_agreement: DELEGATE_AGREEMENT_MIN,
        decision_agreement: DELEGATE_AGREEMENT_MIN,
        high_risk_decision_agreement: DELEGATE_AGREEMENT_MIN,
        decision_fields: ['status', 'top1', 'expertVerificationRequired'],
        max_energy_difference: 0.25,
        images: 8,
        high_risk_images: 2,
        ...patch,
      },
    },
    ood: {
      method: 'energy',
      background_class_id: 'not_a_mushroom',
      temperature: 1,
      energy_threshold: -4,
      min_softmax_for_accept: 0.4,
      min_top1_softmax_for_high_confidence: 0.7,
      min_margin: 0.15,
      calibrated: true,
    },
    classes: [],
    input: { size: 224, formula: '(pixel / 127.5) - 1' },
  };
}

describe('delegate release gate', () => {
  test('matches TFLITE_AGREEMENT_MIN parsed from the training ship gate', () => {
    const gates = fs.readFileSync(path.join(__dirname, '../../../training/ship_gates.py'), 'utf8');
    const match = gates.match(/^TFLITE_AGREEMENT_MIN = ([0-9.]+)$/m);
    if (!match) {
      throw new Error('TFLITE_AGREEMENT_MIN is missing from ship_gates.py');
    }
    expect(DELEGATE_AGREEMENT_MIN).toBe(Number(match[1]));
  });

  test('passes only when this model hash and the calibration sample match', () => {
    expect(delegateReleasePassed(manifest(), 'android-gpu')).toBe(true);
    expect(delegateReleasePassed(manifest(), 'core-ml')).toBe(false);
    expect(delegateReleasePassed(manifest({ passed: false }), 'android-gpu')).toBe(false);
    expect(delegateReleasePassed(manifest({ model_sha256: 'c'.repeat(64) }), 'android-gpu')).toBe(false);
    expect(delegateReleasePassed(manifest({ sample_sha256: 'd'.repeat(64) }), 'android-gpu')).toBe(false);
    expect(delegateReleasePassed(manifest({ top1_agreement: 0.989 }), 'android-gpu')).toBe(false);
    expect(delegateReleasePassed(manifest({ decision_agreement: 0.989 }), 'android-gpu')).toBe(false);
    expect(delegateReleasePassed(manifest({ max_energy_difference: undefined }), 'android-gpu')).toBe(false);
    const missing = manifest();
    delete missing.delegate_release;
    expect(delegateReleasePassed(missing, 'android-gpu')).toBe(false);
  });
});
