import { loadTensorflowModel, type TensorflowModel } from 'react-native-fast-tflite';

/**
 * LiteRT na CPU. Pusta lista delegatów nie włącza NNAPI ani GPU.
 * Biblioteki GPU nie są w pluginie, bo weszłyby też do buildu produkcyjnego.
 */
let loaded: TensorflowModel | null = null;
let loading: Promise<TensorflowModel> | null = null;

export async function loadCpuModel(moduleId: number): Promise<void> {
  if (loaded) return;
  if (!loading) {
    loading = loadTensorflowModel(moduleId, []);
  }
  loaded = await loading;
}

export async function runCpuModel(input: Float32Array): Promise<Float32Array> {
  if (!loaded) throw new Error('Model nie jest załadowany.');
  const copy = new ArrayBuffer(input.byteLength);
  const bytes = new Uint8Array(copy);
  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  bytes.set(view);
  const outputs = await loaded.run([copy]);
  const first = outputs[0];
  if (!first) throw new Error('Model nie zwrócił logitów.');
  return new Float32Array(first);
}
