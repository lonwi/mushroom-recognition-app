import { render, screen } from '@testing-library/react-native';

import { DeadlyBadge, EdibilityBadge, IllustrationBadge } from '@/ui/badge';
import { deadlyBadge, greenEdibilityTokens } from '@/ui/tokens';

describe('DeadlyBadge', () => {
  it('renders deadly badge with warning symbol and default label', async () => {
    await render(<DeadlyBadge />);
    expect(screen.getByText('☠️')).toBeTruthy();
    expect(screen.getByText('ŚMIERTELNIE TRUJĄCY')).toBeTruthy();
  });

  it('renders custom label and handles high contrast text color', async () => {
    const { rerender } = await render(<DeadlyBadge label="UWAGA ŚMIERTELNY" theme="light" />);
    const textLight = screen.getByText('UWAGA ŚMIERTELNY');
    expect(textLight.props.style).toEqual(expect.objectContaining({ color: deadlyBadge.text }));

    await rerender(<DeadlyBadge label="UWAGA ŚMIERTELNY" theme="highContrast" />);
    const textHc = screen.getByText('UWAGA ŚMIERTELNY');
    expect(textHc.props.style).toEqual(
      expect.objectContaining({ color: deadlyBadge.textHighContrast }),
    );
  });
});

describe('EdibilityBadge', () => {
  it('renders null when status is null', async () => {
    const { toJSON } = await render(<EdibilityBadge status={null} label="Brak" />);
    expect(toJSON()).toBeNull();
  });

  it('delegates DEADLY_POISONOUS to DeadlyBadge', async () => {
    await render(<EdibilityBadge status="DEADLY_POISONOUS" label="Śmiertelny" />);
    expect(screen.getByText('☠️')).toBeTruthy();
    expect(screen.getByText('Śmiertelny')).toBeTruthy();
  });

  it('renders edible status with correct text', async () => {
    await render(<EdibilityBadge status="EDIBLE" label="Jadalny" />);
    expect(screen.getByText('Jadalny')).toBeTruthy();
  });

  it('renders disputed status when statusDisputed is true', async () => {
    await render(<EdibilityBadge status="EDIBLE" statusDisputed label="Sporny" />);
    expect(screen.getByText('Sporny')).toBeTruthy();
  });

  it('does NOT render green token for incompleteCard even if status is EDIBLE', async () => {
    await render(<EdibilityBadge status="EDIBLE" incompleteCard label="Jadalny" theme="light" />);
    const text = screen.getByText('Jadalny');
    expect(text.props.style?.color).not.toBe(greenEdibilityTokens.edible);
  });
});

describe('IllustrationBadge', () => {
  it('renders default ilustracja label', async () => {
    await render(<IllustrationBadge />);
    expect(screen.getByText('ilustracja')).toBeTruthy();
  });

  it('renders custom label', async () => {
    await render(<IllustrationBadge label="rycina" />);
    expect(screen.getByText('rycina')).toBeTruthy();
  });
});
