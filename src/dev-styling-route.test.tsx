import { render, screen } from '@testing-library/react-native';

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
