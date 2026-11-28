import { Asset } from 'expo-asset';

import { preprocessImage, readPreprocessingSpec } from '@/core/ai/image-preprocessing';
import { readInferenceContract } from '@/core/ai/inference-contract';
import {
  assessExifParity,
  formatInferenceSummary,
  measureInference,
  readGoldenRecords,
  type DelegateDump,
  type GoldenFrame,
} from '@/core/ai/inference-measurement';
import { buildProfileName } from '@/core/config/build-profile';
import packaged from '@/infra/inference/package-asset';
import { loadCpuModel, runCpuModel } from '@/infra/inference/tflite-runtime';
import { decodePhoto, readProcessMemory } from '@/infra/photo-decoder/photo-decoder';
import { deviceDescription } from '@/infra/platform';
import parityFile from '../../../fixtures/p1/parity.json';

type ParityCase = {
  id: string;
  preprocessing: unknown;
  expected: { float: { sample: { coords: [number, number][]; values: number[] } } };
};

const EXIF_CASE_ID = 'baseline_256_exif_orient6_96x64';

export type PackageStatus = {
  present: boolean;
  version: string | null;
  sha256: string | null;
  goldenCount: number;
  detail: string;
};

function exifCase(): ParityCase {
  const cases = (parityFile as unknown as { cases: ParityCase[] }).cases;
  const found = cases.find((entry) => entry.id === EXIF_CASE_ID);
  if (!found) throw new Error('Brak przypadku EXIF w fixture P1.');
  return found;
}

export function packageStatus(): PackageStatus {
  if (typeof packaged.model !== 'number') {
    return {
      present: false,
      version: null,
      sha256: null,
      goldenCount: 0,
      detail: 'Brak pliku modelu w tej paczce.',
    };
  }
  try {
    const contract = readInferenceContract(packaged.manifest);
    const records = readGoldenRecords(packaged.goldenIndex);
    return {
      present: true,
      version: contract.modelVersion,
      sha256: contract.sha256,
      goldenCount: records.length,
      detail: contract.channel === 'test' ? 'MODEL TESTOWY' : contract.channel,
    };
  } catch (error) {
    return {
      present: false,
      version: null,
      sha256: null,
      goldenCount: 0,
      detail: error instanceof Error ? error.message : 'Manifest paczki jest nieczytelny.',
    };
  }
}

const uriCache = new Map<number, string>();

async function uriFor(moduleId: number): Promise<string> {
  const cached = uriCache.get(moduleId);
  if (cached) return cached;
  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Asset nie ma lokalnego URI.');
  uriCache.set(moduleId, uri);
  return uri;
}

async function checkExif(): Promise<DelegateDump['p1Exif']> {
  const moduleId = packaged.p1.exifOrient6;
  if (typeof moduleId !== 'number') {
    return { status: 'unavailable', detail: 'W paczce nie ma obrazu EXIF P1.' };
  }
  try {
    const fixture = exifCase();
    const decoded = await decodePhoto(await uriFor(moduleId), 1);
    const tensor = preprocessImage(
      { width: decoded.width, height: decoded.height, rgb: decoded.rgb },
      readPreprocessingSpec(fixture.preprocessing),
    );
    if (!(tensor.data instanceof Float32Array)) {
      return { status: 'fail', detail: 'Preprocessing nie zwrócił float32.' };
    }
    return assessExifParity({
      exifOrientation: decoded.exifOrientation,
      tensor: tensor.data,
      tensorWidth: tensor.width,
      expected: fixture.expected.float.sample,
      tolerance: 1e-5,
    });
  } catch (error) {
    return {
      status: 'fail',
      detail: error instanceof Error ? error.message : 'Sprawdzenie EXIF nie doszło do końca.',
    };
  }
}

export async function measureOnDevice(options: {
  runs: number;
  shouldCancel: () => boolean;
  afterEach: () => Promise<void>;
  onProgress?: (phase: string, completed: number, total: number) => void;
}): Promise<{ dump: DelegateDump; summary: string }> {
  const modelId = packaged.model;
  if (typeof modelId !== 'number') {
    throw new Error('Modelu nie ma w tej paczce.');
  }
  const contract = readInferenceContract(packaged.manifest);
  const records = readGoldenRecords(packaged.goldenIndex);
  if (packaged.golden.length !== records.length) {
    throw new Error('Liczba assetów zdjęć nie zgadza się z golden_images.json.');
  }
  const frames: GoldenFrame[] = records.map((record, index) => ({
    ...record,
    uri: `inference-golden:${index}`,
  }));
  const p1Exif = await checkExif();
  const dump = await measureInference({
    startedAt: new Date().toISOString(),
    modelVersion: contract.modelVersion,
    tfliteSha256: contract.sha256,
    classIds: contract.classIds,
    temperatures: contract.temperatures,
    singleThresholds: contract.single,
    fusionThresholds: { 2: contract.fusion2, 3: contract.fusion3 },
    frames,
    latencyRuns: options.runs,
    device: deviceDescription(),
    buildProfile: buildProfileName(),
    now: () => globalThis.performance?.now() ?? Date.now(),
    shouldCancel: options.shouldCancel,
    afterEach: options.afterEach,
    onProgress: options.onProgress,
    load: () => loadCpuModel(modelId),
    preprocess: (image) => {
      const tensor = preprocessImage(image, contract.preprocessing);
      if (!(tensor.data instanceof Float32Array)) {
        throw new Error('Preprocessing nie zwrócił float32.');
      }
      return tensor.data;
    },
    run: (input) => runCpuModel(input),
    decode: async (uri) => {
      const index = Number(uri.slice('inference-golden:'.length));
      const moduleId = packaged.golden[index];
      if (typeof moduleId !== 'number') throw new Error(`Brak assetu zdjęcia ${index}.`);
      const decoded = await decodePhoto(
        await uriFor(moduleId),
        contract.preprocessing.decodeMinWidth ?? 448,
      );
      return decoded;
    },
    readMemory: () => readProcessMemory(),
  });
  dump.p1Exif = p1Exif;
  return { dump, summary: formatInferenceSummary(dump) };
}
