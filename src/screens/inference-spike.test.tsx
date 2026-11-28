import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import InferenceSpikeScreen from '@/screens/inference-spike';

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
