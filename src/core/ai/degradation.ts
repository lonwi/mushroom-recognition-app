import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

/**
 * Reguły z `x-degradation` w schemacie manifestu (D-07).
 * Model nie decyduje o jadalności. Tu są tylko flagi skanera.
 */

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const SUPPORTED_SCHEMA_MAJOR = 1;
const MAX_SPECIES_OUTPUTS = 67;
/** Próg ECE z D-10 na czas F0. Trener może go zmienić razem ze schematem. */
const ECE_PERCENT_MAX = 0.05;

const REQUIRED_DANGEROUS_GENERA = [
  'Amanita',
  'Galerina',
  'Gyromitra',
  'Inosperma',
  'Cortinarius',
  'Lepiota',
] as const;

export interface LoadContext {
  fileSha256: string | null;
  atlasVersion: string;
  productionBuild: boolean;
}

export interface ScannerCapabilities {
  scannerAvailable: boolean;
  showTestBanner: boolean;
  canShowPercent: boolean;
  canFuse2: boolean;
  canFuse3: boolean;
  gpuDelegateAllowed: boolean;
  uncoveredSpeciesIds: readonly string[];
  reasons: readonly string[];
}

export interface ManifestLoad {
  valid: boolean;
  errors: readonly string[];
  capabilities: ScannerCapabilities;
}

interface ManifestClass {
  index: number;
  classId: string;
  speciesIds: readonly string[];
  genus?: string;
  in_model: boolean;
}

export interface ModelManifest {
  schemaVersion: string;
  channel: 'test' | 'beta' | 'production';
  model: {
    sha256: string;
    output: { shape: readonly number[] };
  };
  classes: readonly ManifestClass[];
  uncoveredSpecies?: readonly { speciesId: string }[];
  rejectClasses?: readonly unknown[];
  calibration?: { calibrated: boolean; eceTest?: number };
  ood: {
    energyThreshold?: number;
    fusion?: { '2'?: unknown; '3'?: unknown };
  };
  dangerousGenera: readonly string[];
  shipGates: { passed: boolean };
  minAtlasVersion: string;
  delegates?: {
    'android-gpu'?: { modelSha256: string; passed: boolean };
  };
}

function emptyCapabilities(reasons: readonly string[]): ScannerCapabilities {
  return {
    scannerAvailable: false,
    showTestBanner: false,
    canShowPercent: false,
    canFuse2: false,
    canFuse3: false,
    gpuDelegateAllowed: false,
    uncoveredSpeciesIds: [],
    reasons,
  };
}

function validateModelManifest(document: unknown, schema: object): string[] {
  const validate = ajv.compile(schema);
  if (validate(document)) return [];
  return (validate.errors ?? []).map(
    (error) =>
      `${error.instancePath.length > 0 ? error.instancePath : '/'} ${error.message ?? 'invalid'}`,
  );
}

function parseSemver(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(left: string, right: string): number | null {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (a === null || b === null) return null;
  for (let index = 0; index < 3; index += 1) {
    const av = a[index];
    const bv = b[index];
    if (av === undefined || bv === undefined) return null;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function schemaMajor(version: string): number | null {
  const parsed = parseSemver(version);
  return parsed === null ? null : parsed[0];
}

export function loadModelManifest(
  document: unknown,
  schema: object,
  context: LoadContext,
): ManifestLoad {
  const errors = validateModelManifest(document, schema);
  if (errors.length > 0) {
    return { valid: false, errors, capabilities: emptyCapabilities(['schema']) };
  }
  const manifest = document as ModelManifest;
  return { valid: true, errors: [], capabilities: assessDegradation(manifest, context) };
}

export function assessDegradation(
  manifest: ModelManifest,
  context: LoadContext,
): ScannerCapabilities {
  const blocking: string[] = [];
  const notes: string[] = [];

  const major = schemaMajor(manifest.schemaVersion);
  if (major !== SUPPORTED_SCHEMA_MAJOR) blocking.push('schema_major');

  if (context.fileSha256 === null || context.fileSha256 !== manifest.model.sha256) {
    blocking.push('sha256');
  }

  const atlasDelta = compareSemver(manifest.minAtlasVersion, context.atlasVersion);
  if (atlasDelta === null || atlasDelta > 0) blocking.push('atlas_version');

  if (typeof manifest.ood.energyThreshold !== 'number') blocking.push('gate_not_calibrated');

  if (context.productionBuild && manifest.channel === 'test') blocking.push('test_channel');
  if (context.productionBuild && manifest.shipGates.passed !== true) blocking.push('ship_gates');

  if (manifest.classes.length > MAX_SPECIES_OUTPUTS) blocking.push('class_count');

  const outputCount = manifest.model.output.shape[1];
  if (outputCount !== manifest.classes.length) blocking.push('output_shape');

  const indexes = manifest.classes.map((item) => item.index);
  const contiguous = indexes.every((index, position) => index === position);
  if (!contiguous) blocking.push('class_index');

  if (manifest.classes.some((item) => item.in_model !== true)) blocking.push('inactive_class');

  const covered = new Set(manifest.classes.flatMap((item) => item.speciesIds));
  const uncovered = (manifest.uncoveredSpecies ?? []).map((item) => item.speciesId);
  if (uncovered.some((speciesId) => covered.has(speciesId))) blocking.push('uncovered_overlap');

  const missingGenus = REQUIRED_DANGEROUS_GENERA.some(
    (genus) => !manifest.dangerousGenera.includes(genus),
  );
  if (missingGenus) blocking.push('dangerous_genera');

  if ((manifest.rejectClasses ?? []).length > 0) blocking.push('reject_classes');

  const calibrated = manifest.calibration?.calibrated === true;
  const ece = manifest.calibration?.eceTest;
  const eceOk = typeof ece === 'number' && ece <= ECE_PERCENT_MAX;
  if (!calibrated) notes.push('uncalibrated');
  else if (!eceOk) notes.push('ece');

  const fusion = manifest.ood.fusion;
  const canFuse2 = calibrated && fusion?.['2'] !== undefined;
  const canFuse3 = calibrated && fusion?.['3'] !== undefined;
  if (!canFuse2) notes.push('fusion_unavailable_2');
  if (!canFuse3) notes.push('fusion_unavailable_3');

  const gpu = manifest.delegates?.['android-gpu'];
  const gpuDelegateAllowed = gpu?.passed === true && gpu.modelSha256 === manifest.model.sha256;

  const scannerAvailable = blocking.length === 0;
  return {
    scannerAvailable,
    showTestBanner: manifest.channel === 'test',
    canShowPercent: scannerAvailable && calibrated && eceOk,
    canFuse2: scannerAvailable && canFuse2,
    canFuse3: scannerAvailable && canFuse3,
    gpuDelegateAllowed: scannerAvailable && gpuDelegateAllowed,
    uncoveredSpeciesIds: uncovered,
    reasons: [...blocking, ...notes],
  };
}
