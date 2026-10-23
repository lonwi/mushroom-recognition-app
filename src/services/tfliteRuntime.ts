import { Platform } from 'react-native';

import {
  ANDROID_GPU,
  CORE_ML,
  CPU_RUNTIME,
  type ActiveDelegate,
  type HardwareDelegateName,
  getDevDelegateMode,
  isDevBuild,
  recordInferenceTiming,
  setDevDelegateModeListener,
} from './inferenceTiming';
import { PACKAGED_MODEL_MODULE } from './modelPackage';

type TensorflowModel = {
  run: (inputs: ArrayBuffer[]) => Promise<ArrayBuffer[]>;
};

type LoadedModel = {
  model: TensorflowModel;
  delegate: ActiveDelegate;
};

let activeLoad: Promise<LoadedModel> | null = null;
let cpuLoad: Promise<LoadedModel> | null = null;

/**
 * Android GPU (OpenCL) or iOS Core ML, then CPU if that delegate throws.
 * Unsupported ops are partitioned to CPU inside the delegate and do not throw.
 * Fully integer graphs often fail that partition; fp16 and fp32 are the graphs
 * these delegates are built to run. Web stays on CPU.
 */
function preferredHardwareDelegate(os: string = Platform.OS): HardwareDelegateName | null {
  if (os === 'android') {
    return ANDROID_GPU;
  }
  if (os === 'ios') {
    return CORE_ML;
  }
  return null;
}

function loadTensorflowModel(delegates: HardwareDelegateName[]): Promise<TensorflowModel> {
  if (PACKAGED_MODEL_MODULE == null) {
    throw new Error('model_missing');
  }
  const source = PACKAGED_MODEL_MODULE;
  const tflite = require('react-native-fast-tflite') as {
    loadTensorflowModel: (model: number, next?: HardwareDelegateName[]) => Promise<TensorflowModel>;
  };
  return tflite.loadTensorflowModel(source, delegates);
}

function loadCpu(): Promise<LoadedModel> {
  const existing = cpuLoad;
  if (existing) {
    return existing;
  }
  const pending = loadTensorflowModel([]).then((model) => ({
    model,
    delegate: CPU_RUNTIME,
  }));
  const guarded = pending.catch((error: unknown) => {
    cpuLoad = null;
    throw error;
  });
  cpuLoad = guarded;
  return guarded;
}

function clearLoadedModels(): void {
  activeLoad = null;
  cpuLoad = null;
}

setDevDelegateModeListener(clearLoadedModels);

async function loadWithFallback(os: string): Promise<LoadedModel> {
  const forcedCpu = getDevDelegateMode() === CPU_RUNTIME;
  const hardware = forcedCpu ? null : preferredHardwareDelegate(os);
  if (!hardware) {
    return loadCpu();
  }
  try {
    const model = await loadTensorflowModel([hardware]);
    return { model, delegate: hardware };
  } catch (error) {
    if (isDevBuild()) {
      console.info(`[tflite] ${hardware} failed to load; using CPU`, error);
    }
    return loadCpu();
  }
}

function ensureActive(): Promise<LoadedModel> {
  if (!activeLoad) {
    activeLoad = loadWithFallback(Platform.OS).catch((error: unknown) => {
      activeLoad = null;
      throw error;
    });
  }
  return activeLoad;
}

function cloneInput(input: Float32Array): ArrayBuffer {
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
}

function clockMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function cpuFallback(delegate: ActiveDelegate): boolean {
  const wantedHardware = getDevDelegateMode() !== CPU_RUNTIME && preferredHardwareDelegate() !== null;
  return delegate === CPU_RUNTIME && wantedHardware;
}

async function invoke(loaded: LoadedModel, input: Float32Array, fellBackToCpu: boolean): Promise<Float32Array> {
  const started = clockMs();
  const outputs = await loaded.model.run([cloneInput(input)]);
  const output = outputs[0];
  if (!output) {
    throw new Error('output_missing');
  }
  recordInferenceTiming({
    inferenceMs: Math.max(0, Math.round(clockMs() - started)),
    delegate: loaded.delegate,
    fellBackToCpu,
  });
  return new Float32Array(output);
}

async function replaceWithCpu(): Promise<LoadedModel> {
  activeLoad = loadCpu().catch((error: unknown) => {
    activeLoad = null;
    cpuLoad = null;
    throw error;
  });
  return activeLoad;
}

/** Runs the packaged graph. The input array stays local to this call. */
export async function runPackagedTflite(input: Float32Array): Promise<Float32Array> {
  if (PACKAGED_MODEL_MODULE == null) {
    throw new Error('model_missing');
  }
  const loaded = await ensureActive();
  try {
    return await invoke(loaded, input, cpuFallback(loaded.delegate));
  } catch (error) {
    if (loaded.delegate === CPU_RUNTIME) {
      throw error;
    }
    if (isDevBuild()) {
      console.info(`[tflite] ${loaded.delegate} inference failed; retrying on CPU`, error);
    }
    const cpu = await replaceWithCpu();
    return invoke(cpu, input, true);
  }
}
