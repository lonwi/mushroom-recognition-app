import { render, screen } from '@testing-library/react-native';

import DecoderSpikeRoute from '@/app/dev/decoder';

const devFlag = globalThis as unknown as { __DEV__: boolean };
const originalDev = devFlag.__DEV__;

afterEach(() => {
  devFlag.__DEV__ = originalDev;
});

test('a release build redirects the decoder deep link away from the spike', async () => {
  devFlag.__DEV__ = false;
  await render(<DecoderSpikeRoute />);
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByText('Spike dekodera')).toBeNull();
});

test('a dev build still shows the decoder spike', async () => {
  devFlag.__DEV__ = true;
  await render(<DecoderSpikeRoute />);
  expect(screen.getByText('Spike dekodera')).toBeTruthy();
});
