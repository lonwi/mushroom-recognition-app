import { render, screen } from '@testing-library/react-native';

import InferenceSpikeRoute from '@/app/dev/inference';

function renderWithDevTools(dev: boolean, flag: string | undefined) {
  const holder = globalThis as unknown as { __DEV__: boolean };
  const previousDev = holder.__DEV__;
  const previousFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;
  holder.__DEV__ = dev;
  if (flag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = flag;
  return render(<InferenceSpikeRoute />).finally(() => {
    holder.__DEV__ = previousDev;
    if (previousFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
    else process.env.EXPO_PUBLIC_DEV_TOOLS = previousFlag;
  });
}

test('release bez flagi nie otwiera spike inferencji', async () => {
  await renderWithDevTools(false, undefined);
  expect(screen.getByText('redirect:/')).toBeTruthy();
  expect(screen.queryByText('Spike inferencji')).toBeNull();
});

test('release z flagą zostawia spike inferencji', async () => {
  await renderWithDevTools(false, '1');
  expect(screen.getByText('Spike inferencji')).toBeTruthy();
});

test('dev zostawia serię 10 jako wybraną', async () => {
  await renderWithDevTools(true, undefined);
  expect(screen.getByRole('button', { name: 'Seria 10' }).props.accessibilityState).toEqual(
    expect.objectContaining({ selected: true }),
  );
});
