import { resolveBundledAsset, selectBundledFileUri } from '@/infra/inference/bundled-asset-uri';
import { loadCpuModel } from '@/infra/inference/tflite-runtime';

test('zostawia file:// i odrzuca nazwę zasobu oraz android_res', () => {
  expect(selectBundledFileUri('file:///data/user/0/app/cache/ExponentAsset-abc.tflite')).toBe(
    'file:///data/user/0/app/cache/ExponentAsset-abc.tflite',
  );
  expect(selectBundledFileUri('assets_inference_mobilenetv4_hybrid_medium_r256_fp16')).toBeNull();
  expect(selectBundledFileUri('file:///android_res/raw/model')).toBeNull();
  expect(selectBundledFileUri('file://')).toBeNull();
  expect(selectBundledFileUri(null)).toBeNull();
});

test('nazwa zasobu w localUri wymusza zapis do pliku', async () => {
  const asset = {
    uri: 'assets_inference_mobilenetv4_hybrid_medium_r256_fp16',
    localUri: 'assets_inference_mobilenetv4_hybrid_medium_r256_fp16' as string | null,
    downloaded: true,
    downloadAsync: jest.fn(async () => ({
      localUri: 'file:///data/cache/ExponentAsset-abc.tflite',
    })),
  };
  await expect(resolveBundledAsset(asset)).resolves.toBe(
    'file:///data/cache/ExponentAsset-abc.tflite',
  );
  expect(asset.downloaded).toBe(false);
  expect(asset.downloadAsync).toHaveBeenCalledTimes(1);
});

test('loader modelu odrzuca nazwę zasobu zanim dojdzie do LiteRT', async () => {
  await expect(
    loadCpuModel('assets_inference_mobilenetv4_hybrid_medium_r256_fp16'),
  ).rejects.toThrow('file://');
});

test('gotowy plik nie jest pobierany drugi raz', async () => {
  const asset = {
    uri: 'file:///data/cache/model.tflite',
    localUri: 'file:///data/cache/model.tflite',
    downloaded: true,
    downloadAsync: jest.fn(),
  };
  await expect(resolveBundledAsset(asset)).resolves.toBe('file:///data/cache/model.tflite');
  expect(asset.downloadAsync).not.toHaveBeenCalled();
});

test('zapis, który zostawia nazwę zasobu, jest błędem do zrzutu', async () => {
  const asset = {
    uri: 'assets_inference_golden_0000',
    localUri: null,
    downloaded: false,
    downloadAsync: jest.fn(async () => ({ localUri: 'assets_inference_golden_0000' })),
  };
  await expect(resolveBundledAsset(asset)).rejects.toThrow(
    'Asset nie ma ścieżki file:// (assets_inference_golden_0000).',
  );
});
