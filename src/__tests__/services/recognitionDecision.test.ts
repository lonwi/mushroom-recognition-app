/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { ModelManifest } from '../../services/modelManifest';
import { decideFromLogits } from '../../services/recognitionDecision';

interface DecisionCase {
  name: string;
  logits: number[];
  class_ids: string[];
  genera: string[];
  ood: ModelManifest['ood'];
  expect: {
    status: string;
    reason?: string;
    max_softmax?: number;
    energy?: number;
    max_softmax_gt?: number;
    dangerous_genus?: boolean;
    low_confidence?: boolean;
  };
}

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../training/fixtures/decision_cases.json'), 'utf8'),
) as { cases: DecisionCase[] };

function manifestFor(entry: DecisionCase): ModelManifest {
  return {
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
  };
}

describe('recognition decision', () => {
  test.each(fixture.cases.map((entry) => [entry.name, entry] as const))('%s', (_name, entry) => {
    const decision = decideFromLogits(entry.logits, manifestFor(entry));
    expect(decision.status).toBe(entry.expect.status);
    if (entry.expect.reason) {
      expect(decision).toMatchObject({ reason: entry.expect.reason });
    }
    if (decision.status !== 'unavailable') {
      expect(decision.maxSoftmax).toBeCloseTo(entry.expect.max_softmax as number, 4);
      expect(decision.energy).toBeCloseTo(entry.expect.energy as number, 4);
    }
    if (entry.expect.max_softmax_gt != null && decision.status !== 'unavailable') {
      expect(decision.maxSoftmax).toBeGreaterThan(entry.expect.max_softmax_gt);
    }
    if (decision.status === 'candidates') {
      expect(decision.warningReasons.includes('dangerous_genus')).toBe(entry.expect.dangerous_genus);
      expect(decision.warningReasons.includes('low_confidence')).toBe(entry.expect.low_confidence);
      expect(decision.expertVerificationRequired).toBe(
        Boolean(entry.expect.dangerous_genus || entry.expect.low_confidence),
      );
      for (const candidate of decision.top3) {
        expect(candidate).not.toHaveProperty('status');
        expect(candidate).not.toHaveProperty('edibility');
      }
    }
    if (decision.status === 'rejected') {
      expect(decision).not.toHaveProperty('top3');
    }
  });

  test('a 0.53 fungus softmax is still rejected when the energy gate says out of distribution', () => {
    const entry = fixture.cases.find((item) => item.name === 'cat_softmax_0_53_rejected_by_energy');
    expect(entry).toBeTruthy();
    const decision = decideFromLogits(entry!.logits, manifestFor(entry!));
    expect(decision.status).toBe('rejected');
    if (decision.status === 'rejected') {
      expect(decision.maxSoftmax).toBeGreaterThan(0.5);
      expect(decision.maxSoftmax).toBeGreaterThan(entry!.ood.min_softmax_for_accept as number);
      expect(decision.energy).toBeGreaterThan(entry!.ood.energy_threshold as number);
      expect(decision.topClassId).toBe('boletus_edulis');
      expect(decision.reason).toBe('not_a_mushroom');
    }
  });

  test.each(['Cortinarius', 'Galerina', 'Gyromitra'] as const)(
    'warns when %s is only the third candidate',
    (genus) => {
      const manifest = manifestFor(fixture.cases.find((item) => item.name === 'amanita_in_top3')!);
      manifest.classes[2] = {
        ...manifest.classes[2],
        id: `${genus.toLowerCase()}_example`,
        genus,
      };
      const decision = decideFromLogits(
        fixture.cases.find((item) => item.name === 'amanita_in_top3')!.logits,
        manifest,
      );
      expect(decision.status).toBe('candidates');
      if (decision.status === 'candidates') {
        expect(decision.top3[2].genus).toBe(genus);
        expect(decision.warningReasons).toContain('dangerous_genus');
        expect(decision.expertVerificationRequired).toBe(true);
      }
    },
  );
});
