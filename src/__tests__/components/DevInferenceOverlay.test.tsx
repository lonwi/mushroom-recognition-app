import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { DevInferenceOverlay } from '../../components/DevInferenceOverlay';
import { devOverlayColors } from '../../theme/tokens';
import {
  CPU_RUNTIME,
  getDevDelegateMode,
  recordInferenceTiming,
  resetInferenceTimingForTests,
} from '../../services/inferenceTiming';

jest.mock('../../contexts/LanguageContext', () => {
  const actual = jest.requireActual('../../contexts/LanguageContext');
  return {
    ...actual,
    useLanguage: () => ({
      language: 'pl',
      setLanguage: () => undefined,
      t: (key: string, params?: Record<string, string | number>) => actual.translate('pl', key, params),
    }),
  };
});

function devFlag(): { __DEV__?: boolean } {
  return globalThis as { __DEV__?: boolean };
}

describe('DevInferenceOverlay', () => {
  const previousDev = devFlag().__DEV__;

  beforeEach(() => {
    devFlag().__DEV__ = true;
    resetInferenceTimingForTests();
  });

  afterEach(() => {
    devFlag().__DEV__ = previousDev;
    resetInferenceTimingForTests();
  });

  test('stays out of production builds', async () => {
    devFlag().__DEV__ = false;
    recordInferenceTiming({ inferenceMs: 12, delegate: 'android-gpu', fellBackToCpu: false });
    const { queryByTestId } = await render(<DevInferenceOverlay />);
    expect(queryByTestId('dev-inference-overlay')).toBeNull();
    expect(queryByTestId('dev-inference-timing')).toBeNull();
  });

  test('shows the delegate time on a light surface without a side border or a pill', async () => {
    recordInferenceTiming({ inferenceMs: 18, delegate: 'core-ml', fellBackToCpu: false });
    const screen = await render(<DevInferenceOverlay scheme="light" />);
    const node = screen.getByTestId('dev-inference-timing');
    const style = StyleSheet.flatten(node.props.style);
    expect(screen.getByText('Inferencja 18 ms · core-ml')).toBeTruthy();
    expect(screen.queryByText(/TFLite/)).toBeNull();
    expect(screen.queryByText(/tflite/)).toBeNull();
    expect(style.borderRadius).toBe(4);
    expect(style.borderWidth).toBe(1);
    expect(style.borderLeftWidth).toBeUndefined();
    expect(style.borderLeftColor).toBeUndefined();
    expect(style.backgroundColor).toBe(devOverlayColors.light.background);
    expect(style.color).toBe(devOverlayColors.light.text);
  });

  test('shows the CPU fallback time on a dark surface', async () => {
    recordInferenceTiming({ inferenceMs: 9, delegate: 'cpu', fellBackToCpu: true });
    const screen = await render(<DevInferenceOverlay scheme="dark" />);
    const style = StyleSheet.flatten(screen.getByTestId('dev-inference-timing').props.style);
    expect(screen.getByText('Inferencja 9 ms · CPU po błędzie delegata')).toBeTruthy();
    expect(style.backgroundColor).toBe(devOverlayColors.dark.background);
    expect(style.color).toBe(devOverlayColors.dark.text);
    expect(style.borderRadius).toBeGreaterThanOrEqual(3);
    expect(style.borderRadius).toBeLessThanOrEqual(6);
  });

  test('lets a dev build measure the next photo on CPU', async () => {
    const screen = await render(<DevInferenceOverlay scheme="light" />);
    expect(screen.getByTestId('dev-inference-overlay')).toBeTruthy();
    expect(getDevDelegateMode()).toBe('auto');
    fireEvent.press(screen.getByTestId('dev-delegate-cpu-label'));
    expect(getDevDelegateMode()).toBe(CPU_RUNTIME);
    fireEvent.press(screen.getByTestId('dev-delegate-auto-label'));
    expect(getDevDelegateMode()).toBe('auto');
  });
});
