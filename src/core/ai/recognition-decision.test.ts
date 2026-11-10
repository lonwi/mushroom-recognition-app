import {
  candidateSkeleton,
  decisionCarriesEdibility,
  rejectedDecision,
  unavailableDecision,
} from '@/core/ai/recognition-decision';

test('a decision skeleton has no edibility', () => {
  expect(decisionCarriesEdibility(unavailableDecision('sha256'))).toBe(false);
  expect(decisionCarriesEdibility(rejectedDecision('out_of_distribution'))).toBe(false);
  const candidates = candidateSkeleton(['boletus_edulis']);
  expect(candidates.classIds).toEqual(['boletus_edulis']);
  expect(decisionCarriesEdibility(candidates)).toBe(false);
});
