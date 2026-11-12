import { render, screen } from '@testing-library/react-native';

import HelpRoute from '@/app/(tabs)/help';

describe('HelpRoute', () => {
  it('mounts HelpScreen properly', async () => {
    await render(<HelpRoute />);
    expect(screen.getByText('Pomoc i bezpieczeństwo')).toBeTruthy();
  });
});
