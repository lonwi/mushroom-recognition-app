import {
  INFERENCE_MODEL_FILE,
  INFERENCE_REVISION,
  datasetResolveUrl,
  modelResolveUrl,
  planInferenceFetch,
} from '@/core/ai/inference-package';

test('adres modelu jest przypięty do rewizji i nie niesie tokenu', () => {
  const url = modelResolveUrl(INFERENCE_MODEL_FILE);
  expect(url).toBe(
    `https://huggingface.co/lonwi/grzybobranie-ai-models/resolve/${INFERENCE_REVISION}/${INFERENCE_MODEL_FILE}`,
  );
  expect(url).not.toMatch(/token|hf_|Bearer/i);
  expect(datasetResolveUrl('images/syn/a.jpg')).toBe(
    'https://huggingface.co/datasets/lonwi/grzybobranie-zdjecia/resolve/main/images/syn/a.jpg',
  );
  expect(() => modelResolveUrl('../secret.tflite')).toThrow(/ścieżk/i);
});

test('produkcja nie pobiera paczki, a brak sekretu nie udaje pobrania', () => {
  expect(planInferenceFetch({ NODE_ENV: 'test' })).toBe('skip-production');
  expect(planInferenceFetch({ NODE_ENV: 'test', EXPO_PUBLIC_DEV_TOOLS: '1' })).toBe(
    'skip-no-token',
  );
  expect(
    planInferenceFetch({ NODE_ENV: 'test', EXPO_PUBLIC_DEV_TOOLS: '1', HF_TOKEN_READONLY: '   ' }),
  ).toBe('skip-no-token');
  expect(
    planInferenceFetch({
      NODE_ENV: 'test',
      EXPO_PUBLIC_DEV_TOOLS: '1',
      HF_TOKEN_READONLY: 'secret',
    }),
  ).toBe('fetch');
});
