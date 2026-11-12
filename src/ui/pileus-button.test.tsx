import { fireEvent, render, screen } from '@testing-library/react-native';

import { PileusButton, type ButtonVariant } from '@/ui/pileus-button';
import { touchTargetMinDp } from '@/ui/tokens';

describe('PileusButton', () => {
  it('supports button variants and ensures touch target >= 48 dp', async () => {
    const onPress = jest.fn();
    const variant: ButtonVariant = 'primary';
    await render(<PileusButton label="Potwierdź" variant={variant} onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Potwierdź' });
    expect(button).toBeTruthy();
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          minHeight: touchTargetMinDp,
          minWidth: touchTargetMinDp,
        }),
      ]),
    );

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders skanerPill variant with high contrast border', async () => {
    await render(<PileusButton label="Skanuj" variant="skanerPill" theme="highContrast" />);
    const button = screen.getByRole('button', { name: 'Skanuj' });
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderRadius: 9999,
          borderWidth: 2,
        }),
      ]),
    );
  });

  it('handles disabled state', async () => {
    const onPress = jest.fn();
    await render(<PileusButton label="Nieaktywny" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Nieaktywny' });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
