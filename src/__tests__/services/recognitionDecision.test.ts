/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { ModelManifest } from '../../services/modelManifest';
import { decideFromLogits, energyScore } from '../../services/recognitionDecision';

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
    top3_ids?: string[];
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
        expect(candidate.id).not.toBe('not_a_mushroom');
        expect(candidate.id).not.toBe('unknown_mushroom');
      }
      if (entry.expect.top3_ids) {
        expect(decision.top3.map((candidate) => candidate.id)).toEqual(entry.expect.top3_ids);
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

  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'non-finite logit %p is output_mismatch and names no species',
    (bad) => {
      const entry = fixture.cases.find((item) => item.name === 'confident_bolete');
      expect(entry).toBeTruthy();
      const decision = decideFromLogits([8, bad, 0, -1], manifestFor(entry!));
      expect(decision).toEqual({ status: 'unavailable', reason: 'output_mismatch' });
      expect(JSON.stringify(decision)).not.toContain('boletus_edulis');
      expect(decision).not.toHaveProperty('top3');
      expect(decision).not.toHaveProperty('topClassId');
    },
  );

  test('a top softmax below 0.40 is unclear, and the same logits pass when the floor is lowered', () => {
    const entry = fixture.cases.find((item) => item.name === 'softmax_below_0_40_unclear');
    expect(entry).toBeTruthy();
    expect(entry!.ood.min_softmax_for_accept).toBe(0.4);
    const rejected = decideFromLogits(entry!.logits, manifestFor(entry!));
    expect(rejected.status).toBe('rejected');
    if (rejected.status === 'rejected') {
      expect(rejected.reason).toBe('unclear');
      expect(rejected.maxSoftmax).toBeLessThan(0.4);
      expect(rejected.maxSoftmax).toBeGreaterThan(0.2);
      expect(rejected.energy).toBeLessThan(entry!.ood.energy_threshold as number);
    }
    const lowered = manifestFor(entry!);
    lowered.ood = { ...lowered.ood, min_softmax_for_accept: 0.2 };
    const accepted = decideFromLogits(entry!.logits, lowered);
    expect(accepted.status).toBe('candidates');
    if (accepted.status === 'candidates') {
      expect(accepted.top3.map((candidate) => candidate.id)).not.toContain('not_a_mushroom');
      expect(accepted.warningReasons).toContain('low_confidence');
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

  test('a confident unknown_mushroom top class is not a species and not edible', () => {
    const manifest = manifestFor(fixture.cases[0]);
    manifest.classes = [
      { index: 0, id: 'boletus_edulis', name: 'Borowik szlachetny', name_latin: 'Boletus edulis', genus: 'Boletus' },
      { index: 1, id: 'unknown_mushroom', name: 'Nieznany grzyb', name_latin: 'Unknown mushroom', genus: '' },
      { index: 2, id: 'not_a_mushroom', name: 'To nie jest grzyb', name_latin: 'Not a mushroom', genus: '' },
    ];
    manifest.ood = {
      ...manifest.ood,
      calibrated: true,
      background_class_id: 'not_a_mushroom',
      unknown_class_id: 'unknown_mushroom',
      energy_threshold: 0,
      min_softmax_for_accept: 0.4,
      min_top1_softmax_for_high_confidence: 0.7,
      min_margin: 0.15,
    };
    const logits = [0, 8, -2];
    expect(energyScore(logits)).toBeLessThan(0);
    const decision = decideFromLogits(logits, manifest);
    expect(decision).toMatchObject({ status: 'rejected', reason: 'unknown_mushroom', topClassId: 'unknown_mushroom' });
    expect(decision).not.toHaveProperty('top3');
    expect(JSON.stringify(decision)).not.toMatch(/edibility|JADALNY|Borowik/);

    const species = decideFromLogits([6, 1, -2], manifest);
    expect(species.status).toBe('candidates');
    if (species.status === 'candidates') {
      expect(species.top3.map((candidate) => candidate.id)).not.toContain('unknown_mushroom');
      expect(species.top3.map((candidate) => candidate.id)).not.toContain('not_a_mushroom');
    }
  });
});
