/**
 * Same decision as training/recognition_math.py.
 * Energy is Liu et al. 2020: E(x) = -T * logsumexp(logits / T).
 * Lower energy means in-distribution. A softmax cutoff is not the gate.
 */

import type { ModelManifest } from './modelManifest';

/** Matches training/recognition_math.py. Rank 1 always counts; later ranks need this probability. */
export const DANGEROUS_GENUS_MIN_PROBABILITY = 0.1;

export interface SpeciesCandidate {
  id: string;
  namePl: string;
  nameLatin: string;
  genus: string;
  confidence: number;
  rank: number;
}

export type RecognitionDecision =
  | { status: 'unavailable'; reason: 'gate_not_calibrated' | 'output_mismatch' }
  | {
      status: 'rejected';
      reason: 'not_a_mushroom' | 'unknown_mushroom' | 'unclear';
      energy: number;
      maxSoftmax: number;
      topClassId: string;
    }
  | {
      status: 'candidates';
      energy: number;
      maxSoftmax: number;
      top3: SpeciesCandidate[];
      expertVerificationRequired: boolean;
      warningReasons: Array<'dangerous_genus' | 'low_confidence'>;
    };

export function logsumexp(values: number[]): number {
  const peak = Math.max(...values);
  let sum = 0;
  for (const value of values) {
    sum += Math.exp(value - peak);
  }
  return peak + Math.log(sum);
}

export function softmax(logits: number[]): number[] {
  const peak = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - peak));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export function energyScore(logits: number[], temperature = 1): number {
  if (temperature <= 0) {
    throw new Error('temperature must be positive');
  }
  return -temperature * logsumexp(logits.map((value) => value / temperature));
}

export function decideFromLogits(logits: number[], manifest: ModelManifest): RecognitionDecision {
  if (logits.length !== manifest.classes.length) {
    throw new Error(`logit length ${logits.length} != class count ${manifest.classes.length}`);
  }
  if (!logits.every((value) => Number.isFinite(value))) {
    return { status: 'unavailable', reason: 'output_mismatch' };
  }
  const ood = manifest.ood;
  if (!ood.calibrated || ood.energy_threshold == null) {
    return { status: 'unavailable', reason: 'gate_not_calibrated' };
  }

  const probabilities = softmax(logits);
  const energy = energyScore(logits, ood.temperature || 1);
  const order = probabilities
    .map((probability, index) => ({ probability, index }))
    .sort((left, right) => right.probability - left.probability);
  const top = order[0];
  const second = order[1]?.probability ?? 0;
  const margin = top.probability - second;
  const topClass = manifest.classes[top.index];

  const unknownClassId = ood.unknown_class_id ?? 'unknown_mushroom';
  const hidden = new Set([ood.background_class_id, unknownClassId]);
  if (topClass.id === ood.background_class_id || energy > ood.energy_threshold) {
    return {
      status: 'rejected',
      reason: 'not_a_mushroom',
      energy,
      maxSoftmax: top.probability,
      topClassId: topClass.id,
    };
  }
  if (
    topClass.id === unknownClassId &&
    (ood.min_softmax_for_accept == null || top.probability >= ood.min_softmax_for_accept)
  ) {
    return {
      status: 'rejected',
      reason: 'unknown_mushroom',
      energy,
      maxSoftmax: top.probability,
      topClassId: topClass.id,
    };
  }
  if (ood.min_softmax_for_accept != null && top.probability < ood.min_softmax_for_accept) {
    return {
      status: 'rejected',
      reason: 'unclear',
      energy,
      maxSoftmax: top.probability,
      topClassId: topClass.id,
    };
  }

  let lowConfidence = false;
  if (ood.min_top1_softmax_for_high_confidence != null && top.probability < ood.min_top1_softmax_for_high_confidence) {
    lowConfidence = true;
  }
  if (ood.min_margin != null && margin < ood.min_margin) {
    lowConfidence = true;
  }

  const speciesOrder = order.filter((entry) => !hidden.has(manifest.classes[entry.index].id));
  const top3 = speciesOrder.slice(0, 3).map((entry, rank) => {
    const species = manifest.classes[entry.index];
    return {
      id: species.id,
      namePl: species.name,
      nameLatin: species.name_latin,
      genus: species.genus,
      confidence: entry.probability,
      rank: rank + 1,
    };
  });
  const genusFloor = manifest.dangerous_genus_min_probability ?? DANGEROUS_GENUS_MIN_PROBABILITY;
  const dangerous = top3.some(
    (candidate) =>
      manifest.dangerous_genera.includes(candidate.genus) &&
      (candidate.rank === 1 || candidate.confidence >= genusFloor),
  );
  const warningReasons: Array<'dangerous_genus' | 'low_confidence'> = [];
  if (dangerous) {
    warningReasons.push('dangerous_genus');
  }
  if (lowConfidence) {
    warningReasons.push('low_confidence');
  }
  return {
    status: 'candidates',
    energy,
    maxSoftmax: top.probability,
    top3,
    expertVerificationRequired: warningReasons.length > 0,
    warningReasons,
  };
}

export function formatConfidencePercent(probability: number): string {
  if (!Number.isFinite(probability)) {
    throw new Error('confidence must be a finite probability');
  }
  const clamped = Math.min(1, Math.max(0, probability));
  return `${(clamped * 100).toFixed(1)}%`;
}
