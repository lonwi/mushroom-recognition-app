import { render, screen } from '@testing-library/react-native';

import { settingsStore } from '@/infra/settings/use-settings-store';
import { HelpScreen } from '@/screens/help';

beforeEach(() => {
  settingsStore.getState().setTheme('light');
  settingsStore.getState().setEnglishEnabled(false);
});

describe('HelpScreen', () => {
  it('renders safety mandate, rules, emergency numbers notice, and disclaimer', async () => {
    await render(<HelpScreen />);

    expect(screen.getByText('Pomoc i bezpieczeństwo')).toBeTruthy();
    expect(screen.getByText('To podpowiedź rozpoznania, nie ocena jadalności.')).toBeTruthy();
    expect(screen.getByText('Zasady bezpiecznego grzybobrania')).toBeTruthy();
    expect(
      screen.getByText('Zbieraj wyłącznie grzyby, co do których masz 100% pewności.'),
    ).toBeTruthy();
    expect(screen.getByText('Numery alarmowe')).toBeTruthy();
    expect(
      screen.getByText(
        'Numery alarmowe są w jednym module i czekają na weryfikację. Ta wersja ich nie pokazuje.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Zastrzeżenie prawne')).toBeTruthy();
  });

  it('renders in English when English is enabled', async () => {
    settingsStore.getState().setEnglishEnabled(true);
    await render(<HelpScreen />);

    expect(screen.getByText('Help & safety')).toBeTruthy();
    expect(screen.getByText('Foraging safety rules')).toBeTruthy();
  });

  it('renders correctly in highContrast theme', async () => {
    settingsStore.getState().setTheme('highContrast');
    await render(<HelpScreen />);

    expect(screen.getByText('Pomoc i bezpieczeństwo')).toBeTruthy();
  });
});
