import { render, screen } from '@testing-library/react-native';

import FtsSpikeRoute from '@/app/dev/fts';

const devFlag = globalThis as unknown as { __DEV__: boolean };
const originalDev = devFlag.__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;

afterEach(() => {
  devFlag.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = originalFlag;
});

test('a release build redirects the fts deep link away from the spike', async () => {
  devFlag.__DEV__ = false;
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  await render(<FtsSpikeRoute />);
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByText('Spike FTS5')).toBeNull();
});

test('a release build with dev tools still shows the fts spike', async () => {
  devFlag.__DEV__ = false;
  process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
  await render(<FtsSpikeRoute />);
  expect(screen.getByText('Spike FTS5')).toBeTruthy();
});

test('a dev build still shows the fts spike', async () => {
  devFlag.__DEV__ = true;
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  await render(<FtsSpikeRoute />);
  expect(screen.getByText('Spike FTS5')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Seria 20' }).props.accessibilityState).toEqual(
    expect.objectContaining({ selected: true }),
  );
  expect(screen.getByRole('button', { name: 'Anuluj serię' }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: true }),
  );
});
