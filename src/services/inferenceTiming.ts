export const ANDROID_GPU = 'android-gpu' as const;
export const CORE_ML = 'core-ml' as const;
export const CPU_RUNTIME = 'cpu' as const;
export const AUTO_DELEGATE = 'auto' as const;

export type HardwareDelegateName = typeof ANDROID_GPU | typeof CORE_ML;
export type ActiveDelegate = HardwareDelegateName | typeof CPU_RUNTIME;
export type DevDelegateMode = typeof AUTO_DELEGATE | typeof CPU_RUNTIME;

export interface InferenceTiming {
  inferenceMs: number;
  delegate: ActiveDelegate;
  fellBackToCpu: boolean;
}

type Listener = (timing: InferenceTiming) => void;

let lastTiming: InferenceTiming | null = null;
const listeners = new Set<Listener>();
let devMode: DevDelegateMode = AUTO_DELEGATE;
let modeListener: (() => void) | null = null;

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** The CPU measurement switch is dev-only. Production ignores it. */
export function getDevDelegateMode(): DevDelegateMode {
  if (!isDevBuild()) {
    return AUTO_DELEGATE;
  }
  return devMode;
}

export function setDevDelegateModeListener(listener: () => void): void {
  modeListener = listener;
}

export function setDevDelegateMode(mode: DevDelegateMode): void {
  if (!isDevBuild()) {
    return;
  }
  devMode = mode;
  if (modeListener) {
    modeListener();
  }
}

/**
 * Records one successful model.run. Dev builds log it and update the overlay.
 * Nothing is sent off the device.
 */
export function recordInferenceTiming(timing: InferenceTiming): void {
  if (!isDevBuild()) {
    return;
  }
  lastTiming = timing;
  console.info(
    `[tflite] inference ${timing.inferenceMs} ms delegate=${timing.delegate} fallback=${timing.fellBackToCpu}`,
  );
  for (const listener of listeners) {
    try {
      listener(timing);
    } catch (error) {
      console.info('[tflite] inference timing listener failed', error);
    }
  }
}

export function getLastInferenceTiming(): InferenceTiming | null {
  if (!isDevBuild()) {
    return null;
  }
  return lastTiming;
}

export function subscribeInferenceTiming(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetInferenceTimingForTests(): void {
  lastTiming = null;
  listeners.clear();
  devMode = AUTO_DELEGATE;
  if (modeListener) {
    modeListener();
  }
}
