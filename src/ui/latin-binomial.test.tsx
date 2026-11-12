import { render, screen } from '@testing-library/react-native';

import { LatinBinomial } from '@/ui/latin-binomial';

describe('LatinBinomial', () => {
  it('renders scientific name with italic formatting', async () => {
    await render(<LatinBinomial name="Boletus edulis" />);
    const text = screen.getByText('Boletus edulis');
    expect(text).toBeTruthy();
    expect(text.props.style).toEqual(expect.objectContaining({ fontStyle: 'italic' }));
  });

  it('renders authority without italic formatting', async () => {
    await render(<LatinBinomial name="Boletus edulis" authority="Bull." />);
    expect(screen.getByText(/Boletus edulis/)).toBeTruthy();
    expect(screen.getByText(/Bull\./)).toBeTruthy();
  });
});
