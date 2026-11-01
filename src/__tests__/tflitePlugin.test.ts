import fs from 'fs';
import path from 'path';

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8')) as {
  expo: { plugins: unknown[] };
};

describe('tflite expo config plugin', () => {
  test('enables Core ML and Android GPU libraries for EAS builds', () => {
    const entry = app.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-fast-tflite',
    );
    expect(entry).toEqual([
      'react-native-fast-tflite',
      {
        enableCoreMLDelegate: true,
        enableAndroidGpuLibraries: ['libOpenCL-pixel.so', 'libGLES_mali.so', 'libPVROCL.so'],
      },
    ]);
  });
});
