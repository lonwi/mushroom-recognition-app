/// <reference types="jest" />

describe('tflite runtime when the packaged model is null', () => {
  test('maps a .tflite require to null', () => {
    expect(require('../../../assets/models/mushrooms_model.tflite')).toBeNull();
  });

  test("does not require('react-native-fast-tflite')", async () => {
    const required: string[] = [];
    jest.resetModules();
    jest.doMock('react-native-fast-tflite', () => {
      required.push('react-native-fast-tflite');
      return { loadTensorflowModel: jest.fn() };
    });

    const { runPackagedTflite } = require('../../services/tfliteRuntime') as typeof import('../../services/tfliteRuntime');
    await expect(runPackagedTflite(new Float32Array([0, 0, 0]))).rejects.toThrow('model_missing');
    expect(required).toEqual([]);
  });
});
