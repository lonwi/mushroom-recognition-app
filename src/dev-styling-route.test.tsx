import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { settingsStore } from '@/infra/settings/use-settings-store';

jest.mock('@rn-primitives/slot', () => ({
  Pressable: jest.requireActual('react-native').Pressable,
}));

import StylingSpikeRoute from '@/app/dev/styling';

const devFlag = globalThis as unknown as { __DEV__: boolean };
const originalDev = devFlag.__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;

afterEach(() => {
  devFlag.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = originalFlag;
  settingsStore.getState().setTheme('light');
  jest.restoreAllMocks();
});

test('the active theme is disabled and a real switch is kept with stats', async () => {
  devFlag.__DEV__ = true;
  process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
  settingsStore.getState().setTheme('light');
  let clock = 1_000;
  jest.spyOn(performance, 'now').mockImplementation(() => {
    clock += 16;
    return clock;
  });
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
    setTimeout(() => callback(0), 0);
    return 1;
  });

  const user = userEvent.setup();
  await render(<StylingSpikeRoute />);
  await user.press(screen.getByRole('button', { name: 'Jasny' }));
  expect(screen.getByText('Jeszcze nie przełączono.')).toBeTruthy();
  expect(screen.queryByText(/Liczba pomiarów: 1/)).toBeNull();

  await user.press(screen.getByRole('button', { name: 'Ciemny' }));
  await waitFor(() => {
    expect(screen.getByText(/Jasny → Ciemny:/)).toBeTruthy();
  });
  expect(screen.getByText('Liczba pomiarów: 1')).toBeTruthy();
  expect(screen.getByText(/Średnia:/)).toBeTruthy();
  expect(screen.getByText(/Mediana:/)).toBeTruthy();
  expect(screen.getByText(/Minimum:/)).toBeTruthy();
  expect(screen.getByText(/Maksimum:/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Ciemny' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true, selected: true }),
  );

  await user.press(screen.getByRole('button', { name: 'Wyczyść pomiary' }));
  expect(screen.getByText('Jeszcze nie przełączono.')).toBeTruthy();
  expect(screen.queryByText('Liczba pomiarów: 1')).toBeNull();
});

test('a release build redirects the styling deep link away from the spike', async () => {
  devFlag.__DEV__ = false;
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  await render(<StylingSpikeRoute />);
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByText('Spike stylowania')).toBeNull();
});

test('a release build with dev tools still shows the styling spike', async () => {
  devFlag.__DEV__ = false;
  process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
  await render(<StylingSpikeRoute />);
  expect(screen.getByText('Spike stylowania')).toBeTruthy();
});

test('a dev build still shows the styling spike', async () => {
  devFlag.__DEV__ = true;
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  await render(<StylingSpikeRoute />);
  expect(screen.getByText('Spike stylowania')).toBeTruthy();
});
