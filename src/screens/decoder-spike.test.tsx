import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

const pending: { cancel?: () => boolean } = {};

jest.mock('@/core/ai/decoder-spike', () => {
  const actual =
    jest.requireActual<typeof import('@/core/ai/decoder-spike')>('@/core/ai/decoder-spike');
  return {
    ...actual,
    measurePhotoSeries: jest.fn(
      (_uris: readonly string[], options: { shouldCancel?: () => boolean }) => {
        pending.cancel = options.shouldCancel;
        return new Promise(() => undefined);
      },
    ),
  };
});

import DecoderSpikeScreen from '@/screens/decoder-spike';

test('leaving the screen cancels runs that have not started', async () => {
  const user = userEvent.setup();
  const view = await render(<DecoderSpikeScreen />);
  await user.press(screen.getByRole('button', { name: 'Wybierz z galerii' }));
  await user.press(screen.getByRole('button', { name: 'Wybierz z galerii' }));
  await user.press(screen.getByRole('button', { name: 'Wybierz z galerii' }));
  await user.press(screen.getByRole('button', { name: 'Dekoduj serię (10)' }));
  await waitFor(() => {
    expect(pending.cancel).toEqual(expect.any(Function));
  });
  expect(pending.cancel?.()).toBe(false);
  await act(() => {
    view.unmount();
  });
  expect(pending.cancel?.()).toBe(true);
});
