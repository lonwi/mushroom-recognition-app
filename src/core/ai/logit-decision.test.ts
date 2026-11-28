import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import decisionCases from '../../../fixtures/p2/decision_cases.json';
import fusionCases from '../../../fixtures/p2/fusion_cases.json';
import {
  classIdsFrom,
  decideLogits,
  fuseLogits,
  temperaturesFrom,
  type DecisionCandidate,
  type GateThresholds,
} from '@/core/ai/logit-decision';

const TOLERANCE = 1e-5;

type FixtureManifest = {
  calibration?: { temperature?: number };
  ood: {
    energyThreshold: number;
    minTop1Prob: number;
    energyTemperature?: number;
    fusion?: {
      '2'?: { energyThreshold: number; minTop1Prob: number };
      '3'?: { energyThreshold: number; minTop1Prob: number };
    };
  };
  classes: string[];
};

type ExpectedDecision = {
  status: 'ok' | 'unclear' | 'out_of_distribution';
  energy: number | null;
  p_top1: number | null;
  candidates: { index: number; classId: string; probability: number; rank: number }[];
  m?: number;
};

const decisionFile = decisionCases as {
  tolerance: number;
  synthetic: boolean;
  cases: {
    id: string;
    manifest: FixtureManifest;
    logits: number[];
    expected: ExpectedDecision;
  }[];
};

const fusionFile = fusionCases as {
  tolerance: number;
  synthetic: boolean;
  cases: {
    id: string;
    manifest: FixtureManifest;
    logits: number[][];
    expected: ExpectedDecision;
  }[];
};

function closeTo(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

function expectCandidates(actual: readonly DecisionCandidate[], expected: ExpectedDecision): void {
  expect(actual).toHaveLength(expected.candidates.length);
  expected.candidates.forEach((candidate, index) => {
    const got = actual[index];
    expect(got?.index).toBe(candidate.index);
    expect(got?.classId).toBe(candidate.classId);
    expect(got?.rank).toBe(candidate.rank);
    if (got) closeTo(got.probability, candidate.probability);
  });
}

function singleThresholds(manifest: FixtureManifest): GateThresholds {
  return {
    energyThreshold: manifest.ood.energyThreshold,
    minTop1Prob: manifest.ood.minTop1Prob,
  };
}

test('fixture P2 jest syntetyczny i ma tolerancję 1e-5', () => {
  expect(decisionFile.synthetic).toBe(true);
  expect(fusionFile.synthetic).toBe(true);
  expect(decisionFile.tolerance).toBe(TOLERANCE);
  expect(fusionFile.tolerance).toBe(TOLERANCE);
  const decisionSha = createHash('sha256')
    .update(readFileSync('fixtures/p2/decision_cases.json'))
    .digest('hex');
  const fusionSha = createHash('sha256')
    .update(readFileSync('fixtures/p2/fusion_cases.json'))
    .digest('hex');
  expect(decisionSha).toBe('b34a00e8efd3f606a94dd1554c1776d5aea6527c680413930cbd132bd2795f4d');
  expect(fusionSha).toBe('a1423fdda02398f7c4ed0f151737732a4e61db712df557da5b4c29d81c734383');
});

test.each(decisionFile.cases.map((entry) => [entry.id, entry] as const))(
  'decyzja %s',
  (_id, entry) => {
    const decision = decideLogits(
      entry.logits,
      classIdsFrom(entry.manifest.classes),
      temperaturesFrom(entry.manifest),
      singleThresholds(entry.manifest),
    );
    expect(decision.status).toBe(entry.expected.status);
    if (entry.expected.energy === null || entry.expected.p_top1 === null) {
      throw new Error('przypadek pojedynczego zdjęcia ma energię i p_top1');
    }
    closeTo(decision.energy, entry.expected.energy);
    closeTo(decision.pTop1, entry.expected.p_top1);
    expectCandidates(decision.candidates, entry.expected);
    expect(JSON.stringify(decision)).not.toMatch(/edib|jadaln|verdict/i);
  },
);

test.each(fusionFile.cases.map((entry) => [entry.id, entry] as const))('fuzja %s', (_id, entry) => {
  const fusion = entry.manifest.ood.fusion ?? {};
  const decision = fuseLogits(
    entry.logits,
    classIdsFrom(entry.manifest.classes),
    temperaturesFrom(entry.manifest),
    singleThresholds(entry.manifest),
    { 2: fusion['2'], 3: fusion['3'] },
  );
  expect(decision.status).toBe(entry.expected.status);
  expect(decision.m).toBe(entry.expected.m);
  if (entry.expected.energy === null) {
    expect(decision.energy).toBeNull();
  } else if (decision.energy !== null) {
    closeTo(decision.energy, entry.expected.energy);
  } else {
    throw new Error('energia fuzji jest pusta');
  }
  if (entry.expected.p_top1 === null) {
    expect(decision.pTop1).toBeNull();
  } else if (decision.pTop1 !== null) {
    closeTo(decision.pTop1, entry.expected.p_top1);
  } else {
    throw new Error('p_top1 fuzji jest puste');
  }
  expectCandidates(decision.candidates, entry.expected);
  expect(JSON.stringify(decision)).not.toMatch(/edib|jadaln|verdict/i);
});
