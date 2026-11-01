import type { ModelManifest } from './modelManifest';
import { ANDROID_GPU, CORE_ML, type HardwareDelegateName } from './inferenceTiming';

/** Same floor as training/ship_gates.py TFLITE_AGREEMENT_MIN. Not a lower bar. */
export const DELEGATE_AGREEMENT_MIN = 0.99;

const SHA256 = /^[0-9a-f]{64}$/;
const DECISION_FIELDS = ['status', 'top1', 'expertVerificationRequired'] as const;

function sha256(value: string | null | undefined): value is string {
  return typeof value === 'string' && SHA256.test(value);
}

function agreementMet(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= DELEGATE_AGREEMENT_MIN;
}

function decisionFieldsMatch(fields: string[] | undefined): boolean {
  return (
    !!fields &&
    fields.length === DECISION_FIELDS.length &&
    fields.every((field, index) => field === DECISION_FIELDS[index])
  );
}

function countsMatch(entry: { images?: number; high_risk_images?: number; max_energy_difference?: number }): boolean {
  if (typeof entry.max_energy_difference !== 'number' || !Number.isFinite(entry.max_energy_difference)) {
    return false;
  }
  if (entry.max_energy_difference < 0) {
    return false;
  }
  return (entry.images ?? 0) >= 1 && (entry.high_risk_images ?? 0) >= 1;
}

function hashesMatch(
  manifest: ModelManifest,
  entry: { model_sha256?: string; sample_sha256?: string },
): boolean {
  return (
    sha256(manifest.model_sha256) &&
    entry.model_sha256 === manifest.model_sha256 &&
    sha256(manifest.delegate_sample_sha256) &&
    entry.sample_sha256 === manifest.delegate_sample_sha256
  );
}

/**
 * Production may use this delegate only when the manifest records a passing
 * device report for this exact model and the fixed val+test sample.
 * Missing, stale, and hash-mismatched reports fail closed.
 */
export function delegateReleasePassed(manifest: ModelManifest, platform: HardwareDelegateName): boolean {
  if (platform !== ANDROID_GPU && platform !== CORE_ML) {
    return false;
  }
  const entry = manifest.delegate_release?.[platform];
  if (!entry || entry.passed !== true || !hashesMatch(manifest, entry) || !decisionFieldsMatch(entry.decision_fields)) {
    return false;
  }
  return (
    agreementMet(entry.top1_agreement) &&
    agreementMet(entry.high_risk_top1_agreement) &&
    agreementMet(entry.decision_agreement) &&
    agreementMet(entry.high_risk_decision_agreement) &&
    countsMatch(entry)
  );
}
