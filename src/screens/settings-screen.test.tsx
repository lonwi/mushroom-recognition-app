import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/screens/settings';
import { settingsStore } from '@/infra/settings/use-settings-store';

beforeEach(() => {
  settingsStore.getState().setTheme('light');
  settingsStore.getState().setEnglishEnabled(false);
});

test('stores the dark theme from the settings screen', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('Ustawienia')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ciemny' }));
  expect(settingsStore.getState().theme).toBe('dark');
});
