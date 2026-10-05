import { PACKAGED_MODEL_MODULE } from './modelPackage';

type TensorflowModel = {
  run: (inputs: ArrayBuffer[]) => Promise<ArrayBuffer[]>;
};

let loading: Promise<TensorflowModel> | null = null;

async function loadModel(): Promise<TensorflowModel> {
  if (PACKAGED_MODEL_MODULE == null) {
    throw new Error('model_missing');
  }
  const tflite = require('react-native-fast-tflite') as {
    loadTensorflowModel: (source: number, delegates?: unknown[]) => Promise<TensorflowModel>;
  };
  return tflite.loadTensorflowModel(PACKAGED_MODEL_MODULE, []);
}

/** CPU delegates only. GPU delegates are optional and not required for a correct result. */
export async function runPackagedTflite(input: Float32Array): Promise<Float32Array> {
  if (!loading) {
    loading = loadModel().catch((error) => {
      loading = null;
      throw error;
    });
  }
  const model = await loading;
  const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
  const outputs = await model.run([buffer]);
  return new Float32Array(outputs[0]);
}
