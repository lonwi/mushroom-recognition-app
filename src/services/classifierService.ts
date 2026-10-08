/**
 * On-device recognition.
 *
 * assets/models/labels.json is a class contract, not a network. Until
 * training/export_tflite.py installs a calibrated mushrooms_model.tflite and
 * rewrites modelPackage.ts, this service returns recognition unavailable and
 * does not invent a species, a confidence, or an inference time.
 *
 * When a model is packaged, pixels are decoded and normalized with the
 * MobileNetV3 formula, react-native-fast-tflite runs the graph, and the
 * energy gate in recognitionDecision.ts can still refuse a species. The
 * result never carries an edibility verdict. TensorFlow.js tensors are not
 * used here, so there is no tf.tidy scope; the input Float32Array is local
 * to the call and the native runtime owns its own buffers.
 */

import { decodePngToRgb } from './decodePng';
import { preprocessRgbToMobileNetV3 } from './imagePreprocess';
import { ModelManifest, modelManifest } from './modelManifest';
import { PACKAGED_MODEL_MODULE } from './modelPackage';
import { readPhotoAsPngBytes } from './photoPixels';
import { decideFromLogits, SpeciesCandidate } from './recognitionDecision';
import { runPackagedTflite } from './tfliteRuntime';

export const MODEL_MISSING_REASON = 'model_missing' as const;

export type UnavailableReason =
  | typeof MODEL_MISSING_REASON
  | 'gate_not_calibrated'
  | 'runtime_unavailable'
  | 'decode_failed'
  | 'output_mismatch';

export interface UnavailableClassification {
  status: 'unavailable';
  reason: UnavailableReason;
  processedImageUri: string;
}

export interface RejectedClassification {
  status: 'rejected';
  reason: 'not_a_mushroom' | 'unknown_mushroom' | 'unclear';
  processedImageUri: string;
  inferenceTimeMs: number;
}

export interface CandidatesClassification {
  status: 'candidates';
  processedImageUri: string;
  inferenceTimeMs: number;
  top3: SpeciesCandidate[];
  expertVerificationRequired: boolean;
  warningReasons: Array<'dangerous_genus' | 'low_confidence'>;
}

export type ClassificationResult =
  | UnavailableClassification
  | RejectedClassification
  | CandidatesClassification;

export interface ClassifierDependencies {
  packagedModel: number | null;
  manifest: ModelManifest;
  readPngBytes: (uri: string) => Promise<Uint8Array>;
  runLogits: (input: Float32Array) => Promise<Float32Array>;
}

export function isModelPackaged(deps: Pick<ClassifierDependencies, 'packagedModel' | 'manifest'>): boolean {
  return deps.packagedModel != null && deps.manifest.model_packaged === true && deps.manifest.recognition_available === true;
}

const defaultDependencies: ClassifierDependencies = {
  packagedModel: PACKAGED_MODEL_MODULE,
  manifest: modelManifest,
  readPngBytes: readPhotoAsPngBytes,
  runLogits: runPackagedTflite,
};

function unavailable(uri: string, reason: UnavailableReason): UnavailableClassification {
  return { status: 'unavailable', reason, processedImageUri: uri };
}

export async function classifyImageWithDeps(
  imageUri: string,
  deps: ClassifierDependencies,
): Promise<ClassificationResult> {
  if (!isModelPackaged(deps)) {
    return unavailable(imageUri, MODEL_MISSING_REASON);
  }
  if (!deps.manifest.ood.calibrated || deps.manifest.ood.energy_threshold == null) {
    return unavailable(imageUri, 'gate_not_calibrated');
  }

  const started = Date.now();
  let png: Uint8Array;
  try {
    png = await deps.readPngBytes(imageUri);
  } catch {
    return unavailable(imageUri, 'decode_failed');
  }

  let input: Float32Array;
  try {
    const decoded = decodePngToRgb(png);
    input = preprocessRgbToMobileNetV3(decoded.rgb, decoded.width, decoded.height, deps.manifest.input.size);
  } catch {
    return unavailable(imageUri, 'decode_failed');
  }

  let logits: Float32Array;
  try {
    logits = await deps.runLogits(input);
  } catch {
    return unavailable(imageUri, 'runtime_unavailable');
  }
  const inferenceTimeMs = Date.now() - started;

  let decision;
  try {
    decision = decideFromLogits(Array.from(logits), deps.manifest);
  } catch {
    return unavailable(imageUri, 'output_mismatch');
  }

  if (decision.status === 'unavailable') {
    return unavailable(imageUri, decision.reason);
  }
  if (decision.status === 'rejected') {
    return {
      status: 'rejected',
      reason: decision.reason,
      processedImageUri: imageUri,
      inferenceTimeMs,
    };
  }
  return {
    status: 'candidates',
    processedImageUri: imageUri,
    inferenceTimeMs,
    top3: decision.top3,
    expertVerificationRequired: decision.expertVerificationRequired,
    warningReasons: decision.warningReasons,
  };
}

class MushroomClassifierService {
  public isRecognitionAvailable(): boolean {
    return (
      isModelPackaged(defaultDependencies) &&
      defaultDependencies.manifest.ood.calibrated === true &&
      typeof defaultDependencies.manifest.ood.energy_threshold === 'number'
    );
  }

  public classifyImage(imageUri: string): Promise<ClassificationResult> {
    return classifyImageWithDeps(imageUri, defaultDependencies);
  }
}

export const classifierService = new MushroomClassifierService();
