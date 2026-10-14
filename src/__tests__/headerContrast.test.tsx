import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import App from '../../App';
import { pl } from '../i18n/pl';
import { colors } from '../theme/tokens';
import { contrastRatio, nearestBackground } from './helpers/contrast';

describe('app header contrast', () => {
  it('keeps the subtitle and OFFLINE label at WCAG AA on the dark bar', async () => {
    const screen = await render(<App />);
    const subtitle = screen.getByText(pl.app.subtitle);
    const offline = screen.getByText(pl.app.offline);
    const subtitleColor = StyleSheet.flatten(subtitle.props.style).color as string;
    const offlineColor = StyleSheet.flatten(offline.props.style).color as string;
    const subtitleBackground = nearestBackground(subtitle);
    const offlineBackground = nearestBackground(offline);
    const subtitleContrast = contrastRatio(subtitleColor, subtitleBackground);
    const offlineContrast = contrastRatio(offlineColor, offlineBackground);

    expect(subtitleColor).toBe(colors.emerald50);
    expect(subtitleBackground).toBe(colors.primary);
    expect(subtitleContrast).toBeGreaterThanOrEqual(4.5);
    expect(subtitleContrast).toBeCloseTo(11.76, 2);

    expect(offlineColor).toBe(colors.onPrimary);
    expect(offlineBackground).toBe(colors.emerald900);
    expect(offlineContrast).toBeGreaterThanOrEqual(4.5);
    expect(offlineContrast).toBeCloseTo(9.72, 2);
  });
});
