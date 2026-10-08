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
    expect(JSON.stringify(label.props.style)).toContain(colors.deadly);
    expect(JSON.stringify(icon.props.style)).toContain(colors.deadly);
    const badgeStyle = JSON.stringify(label.parent?.props.style);
    expect(badgeStyle).toContain(edibilityColors.DEADLY_POISONOUS.background);
    expect(badgeStyle).toContain(edibilityColors.DEADLY_POISONOUS.border);
    expect(badgeStyle).not.toContain('#3E000C');
    expect(badgeStyle).not.toContain('#FF4560');
    expect(colors.deadly).toBe('#FF1744');
    expect(colors.deadlyBg).toBe('#2A080C');
    expect(colors.deadlyBorder).toBe('#D50000');
  });
});
