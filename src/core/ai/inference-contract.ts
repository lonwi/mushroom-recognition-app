/**
 * Pola paczki 0.2.0-rc1-test, których potrzebuje ekran pomiaru.
 * Pełną degradację manifestu liczy `degradation.ts`. Tu nie ma jadalności.
 */

import { readPreprocessingSpec, type PreprocessingSpec } from '@/core/ai/image-preprocessing';
import {
  classIdsFrom,
  temperaturesFrom,
  type GateThresholds,
  type TemperaturePair,
} from '@/core/ai/logit-decision';

export type InferenceContract = {
  modelVersion: string;
  channel: string;
  sha256: string;
  sizeBytes: number;
  fileName: string;
  classIds: readonly string[];
  temperatures: TemperaturePair;
  single: GateThresholds;
  fusion2: GateThresholds;
  fusion3: GateThresholds;
  preprocessing: PreprocessingSpec;
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} musi być obiektem.`);
  }
  return value as Record<string, unknown>;
}

function gate(value: unknown, label: string): GateThresholds {
  const record = asRecord(value, label);
  if (typeof record.energyThreshold !== 'number' || typeof record.minTop1Prob !== 'number') {
    throw new Error(`${label} nie ma progów energii i top-1.`);
  }
  return { energyThreshold: record.energyThreshold, minTop1Prob: record.minTop1Prob };
}

export function readInferenceContract(value: unknown): InferenceContract {
  const manifest = asRecord(value, 'manifest');
  const model = asRecord(manifest.model, 'model');
  const ood = asRecord(manifest.ood, 'ood');
  const fusion = asRecord(ood.fusion, 'ood.fusion');
  const calibration = asRecord(manifest.calibration, 'calibration');
  if (!Array.isArray(manifest.classes) || manifest.classes.length === 0) {
    throw new Error('Manifest nie ma klas.');
  }
  const classIds = classIdsFrom(
    manifest.classes.map((item) => {
      const row = asRecord(item, 'classes');
      if (typeof row.classId !== 'string') throw new Error('Klasa nie ma classId.');
      return row.classId;
    }),
  );
  if (typeof model.sha256 !== 'string' || typeof model.file !== 'string') {
    throw new Error('Manifest nie ma pliku modelu albo sha256.');
  }
  if (typeof model.sizeBytes !== 'number' || typeof manifest.modelVersion !== 'string') {
    throw new Error('Manifest nie ma wersji albo rozmiaru modelu.');
  }
  const output = asRecord(model.output, 'model.output');
  const shape = output.shape;
  if (!Array.isArray(shape) || shape[1] !== classIds.length) {
    throw new Error('Kształt wyjścia nie zgadza się z liczbą klas.');
  }
  return {
    modelVersion: manifest.modelVersion,
    channel: typeof manifest.channel === 'string' ? manifest.channel : 'unknown',
    sha256: model.sha256,
    sizeBytes: model.sizeBytes,
    fileName: model.file,
    classIds,
    temperatures: temperaturesFrom({
      calibration: { temperature: calibration.temperature as number | undefined },
      ood: { energyTemperature: ood.energyTemperature as number | undefined },
    }),
    single: gate(ood, 'ood'),
    fusion2: gate(fusion['2'], "ood.fusion['2']"),
    fusion3: gate(fusion['3'], "ood.fusion['3']"),
    preprocessing: readPreprocessingSpec(manifest.preprocessing),
  };
}
