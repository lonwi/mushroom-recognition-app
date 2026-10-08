import React from 'react';
import { render } from '@testing-library/react-native';
import { EdibilityBadge } from '../../components/EdibilityBadge';
import { colors, edibilityColors } from '../../theme/tokens';

describe('EdibilityBadge RTL Component Tests', () => {
  it('renders correctly for EDIBLE status', async () => {
    const { getByText } = await render(<EdibilityBadge status="EDIBLE" />);
    expect(getByText('JADALNY')).toBeTruthy();
    expect(getByText('✓')).toBeTruthy();
  });

  it('renders correctly for INEDIBLE status', async () => {
    const { getByText } = await render(<EdibilityBadge status="INEDIBLE" />);
    expect(getByText('NIEJADALNY')).toBeTruthy();
    expect(getByText('⚠')).toBeTruthy();
  });

  it('renders correctly for POISONOUS status', async () => {
    const { getByText } = await render(<EdibilityBadge status="POISONOUS" />);
    expect(getByText('TRUJĄCY')).toBeTruthy();
    expect(getByText('✕')).toBeTruthy();
  });

  it('renders correctly for DEADLY_POISONOUS status with fatal alert icon', async () => {
    const { getByText } = await render(<EdibilityBadge status="DEADLY_POISONOUS" size="large" />);
    const label = getByText('ŚMIERTELNIE TRUJĄCY');
    const icon = getByText('☠');
    expect(label).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(JSON.stringify(label.props.style)).toContain(colors.deadlyText);
    expect(JSON.stringify(icon.props.style)).toContain(colors.deadlyText);
    const badgeStyle = JSON.stringify(label.parent?.props.style);
    expect(badgeStyle).toContain(edibilityColors.DEADLY_POISONOUS.background);
    expect(badgeStyle).toContain(edibilityColors.DEADLY_POISONOUS.border);
    expect(badgeStyle).not.toContain('#3E000C');
    expect(badgeStyle).not.toContain('#D50000');
    expect(colors.deadly).toBe('#FF1744');
    expect(colors.deadlyText).toBe('#FF4560');
    expect(colors.deadlyBg).toBe('#2A080C');
    expect(colors.deadlyBorder).toBe('#FF1744');
  });
});

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

describe('edibility badge contrast', () => {
  // Previous chip: text #FF4560 on #3E000C (5.18:1), border #FF1744 on the
  // species header #064E3B (2.53:1). #D50000 on that header was 1.77:1.
  const speciesHeader = '#064E3B';

  it('keeps the deadly label and border at least as strong as the previous chip', () => {
    const tone = edibilityColors.DEADLY_POISONOUS;
    const text = contrastRatio(tone.text, tone.background);
    const borderOnHeader = contrastRatio(tone.border, speciesHeader);
    const previousText = contrastRatio('#FF4560', '#3E000C');
    const previousBorderOnHeader = contrastRatio('#FF1744', speciesHeader);

    expect(text).toBeGreaterThanOrEqual(previousText);
    expect(text).toBeCloseTo(5.51, 2);
    expect(borderOnHeader).toBeGreaterThanOrEqual(previousBorderOnHeader);
    expect(borderOnHeader).toBeCloseTo(2.53, 2);
    expect(contrastRatio(tone.border, '#FFFFFF')).toBeGreaterThanOrEqual(
      contrastRatio('#FF1744', '#FFFFFF'),
    );
    expect(contrastRatio(tone.border, tone.background)).toBeGreaterThanOrEqual(
      contrastRatio('#FF1744', '#3E000C'),
    );
  });

  it('keeps inedible badge text above the old 3.46:1 on the cream fill', () => {
    const tone = edibilityColors.INEDIBLE;
    const text = contrastRatio(tone.text, tone.background);
    expect(contrastRatio('#E65100', '#FFF3E0')).toBeCloseTo(3.46, 2);
    expect(text).toBeGreaterThanOrEqual(4.5);
    expect(text).toBeCloseTo(4.72, 2);
  });
});
