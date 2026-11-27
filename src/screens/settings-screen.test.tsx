import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/screens/settings';
import { settingsStore } from '@/infra/settings/use-settings-store';

const devFlag = globalThis as unknown as { __DEV__: boolean };
const originalDev = devFlag.__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;

beforeEach(() => {
  settingsStore.getState().setTheme('light');
  settingsStore.getState().setEnglishEnabled(false);
});

afterEach(() => {
  devFlag.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = originalFlag;
});

test('stores the dark theme from the settings screen', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('Ustawienia')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ciemny' }));
  expect(settingsStore.getState().theme).toBe('dark');
});

test('ukrywa narzędzia deweloperskie w release bez flagi', async () => {
  devFlag.__DEV__ = false;
  delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  await render(<SettingsScreen />);
  expect(screen.queryByText('Narzędzia deweloperskie')).toBeNull();
  expect(screen.queryByText('Spike dekodera')).toBeNull();
  expect(screen.queryByText('Spike FTS5')).toBeNull();
  expect(screen.queryByText('Spike stylowania')).toBeNull();
});

test('pokazuje spike dekodera i stylowania, gdy flaga jest włączona', async () => {
  devFlag.__DEV__ = false;
  process.env.EXPO_PUBLIC_DEV_TOOLS = '1';
  await render(<SettingsScreen />);
  expect(screen.getByText('Narzędzia deweloperskie')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Spike dekodera' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Spike FTS5' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Spike stylowania' })).toBeTruthy();
});
