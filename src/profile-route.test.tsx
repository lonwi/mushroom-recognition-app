import { render, screen } from '@testing-library/react-native';

import ProfileRoute from '@/app/(tabs)/profile';

describe('ProfileRoute', () => {
  it('mounts ProfileScreen properly', async () => {
    await render(<ProfileRoute />);
    expect(screen.getByText('Profil Grzybiarza')).toBeTruthy();
  });
});
