import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import App from '../../App';
import { pl } from '../i18n/pl';
import { colors } from '../theme/tokens';

/** WCAG 2 contrast ratio from sRGB hex colours. */
function contrastRatio(foreground: string, background: string): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string) => {
    const parsed = Number.parseInt(hex.slice(1), 16);
    const red = channel((parsed >> 16) & 255);
    const green = channel((parsed >> 8) & 255);
    const blue = channel(parsed & 255);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function nearestBackground(node: { parent: unknown; props?: { style?: unknown } }): string {
  let current: { parent?: unknown; props?: { style?: unknown } } | null = node;
  while (current) {
    const style = StyleSheet.flatten(current.props?.style) as { backgroundColor?: unknown } | undefined;
    if (typeof style?.backgroundColor === 'string') {
      return style.backgroundColor;
    }
    current = (current.parent as typeof current) ?? null;
  }
  throw new Error('No background colour behind this text');
}

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
