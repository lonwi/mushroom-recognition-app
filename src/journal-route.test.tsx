import { render, screen } from '@testing-library/react-native';

import JournalRoute from '@/app/(tabs)/journal';

describe('JournalRoute', () => {
  it('mounts JournalScreen properly', async () => {
    await render(<JournalRoute />);
    expect(screen.getByText('Dziennik Zbiorów')).toBeTruthy();
  });
});
