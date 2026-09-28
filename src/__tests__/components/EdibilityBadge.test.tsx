import React from 'react';
import { render } from '@testing-library/react-native';
import { EdibilityBadge } from '../../components/EdibilityBadge';

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
    expect(getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
    expect(getByText('☠')).toBeTruthy();
  });
});
