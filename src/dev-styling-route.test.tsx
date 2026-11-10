import { render, screen } from '@testing-library/react-native';

jest.mock('@rn-primitives/slot', () => ({
  Pressable: jest.requireActual('react-native').Pressable,
}));

import StylingSpikeRoute from '@/app/dev/styling';

const devFlag = globalThis as unknown as { __DEV__: boolean };
const originalDev = devFlag.__DEV__;

afterEach(() => {
  devFlag.__DEV__ = originalDev;
});

test('a release build redirects the styling deep link away from the spike', async () => {
  devFlag.__DEV__ = false;
  await render(<StylingSpikeRoute />);
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByText('Spike stylowania')).toBeNull();
});

test('a dev build still shows the styling spike', async () => {
  devFlag.__DEV__ = true;
  await render(<StylingSpikeRoute />);
  expect(screen.getByText('Spike stylowania')).toBeTruthy();
});
