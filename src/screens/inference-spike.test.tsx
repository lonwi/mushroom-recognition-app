import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { measureOnDevice } from '@/infra/inference/measure-on-device';
import InferenceSpikeScreen from '@/screens/inference-spike';

jest.mock('@/infra/inference/measure-on-device', () => {
  const actual = jest.requireActual<typeof import('@/infra/inference/measure-on-device')>(
    '@/infra/inference/measure-on-device',
  );
  return {
    ...actual,
    measureOnDevice: jest.fn(actual.measureOnDevice),
  };
});

const devFlag = globalThis as unknown as { __DEV__: boolean };

test('start po błędzie braku modelu da się nacisnąć ponownie', async () => {
  devFlag.__DEV__ = true;
  await render(<InferenceSpikeScreen />);
  const start = screen.getByRole('button', { name: 'Mierz (10)' });
  expect(screen.getByRole('button', { name: 'Anuluj pomiar' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
  fireEvent.press(start);
  await waitFor(() => {
    expect(screen.getByText('Modelu nie ma w tej paczce.')).toBeTruthy();
  });
  expect(screen.getByRole('button', { name: 'Mierz (10)' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: false }),
  );
  fireEvent.press(screen.getByRole('button', { name: 'Mierz (10)' }));
  await waitFor(() => {
    expect(screen.getByText('Modelu nie ma w tej paczce.')).toBeTruthy();
  });
  expect(screen.getByRole('button', { name: 'Mierz (10)' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: false }),
  );
});

test('błąd zapisu assetu zostaje na ekranie i w zrzucie', async () => {
  devFlag.__DEV__ = true;
  const message =
    'Asset nie ma ścieżki file:// (assets_inference_mobilenetv4_hybrid_medium_r256_fp16).';
  jest.mocked(measureOnDevice).mockResolvedValueOnce({
    summary: 'skrót',
    dump: {
      kind: 'grzybobranie.delegate-dump',
      formatVersion: 1,
      startedAt: '2026-11-28T00:00:00.000Z',
      modelVersion: '0.2.0-rc1-test',
      tfliteSha256: 'abc',
      classes: [],
      delegate: 'cpu',
      nnapi: false,
      device: { platform: 'android', brand: 'samsung', modelName: 'SM-S911B', osVersion: '17' },
      build: { profile: 'preview' },
      loadColdMilliseconds: null,
      warmupMilliseconds: null,
      single: null,
      session3: null,
      parity: null,
      thresholds: {
        singleP95Ms: 2000,
        sessionP95Ms: 5000,
        deviceParityMin: 0.99,
        single: null,
        session: null,
        parity: null,
        decision: null,
      },
      memory: { peakPssKb: null, peakNativeHeapKb: null, peakJavaHeapKb: null },
      failures: [{ phase: 'load', message }],
      cancelled: false,
      images: [],
      p1Exif: { status: 'fail', detail: message },
    },
  });
  await render(<InferenceSpikeScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Mierz (10)' }));
  await waitFor(() => {
    expect(screen.getByText(`Błąd (load): ${message}`)).toBeTruthy();
  });
  expect(screen.getByRole('button', { name: 'Mierz (10)' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: false }),
  );
});
