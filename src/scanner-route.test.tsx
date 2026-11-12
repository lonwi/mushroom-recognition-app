import { render, screen } from '@testing-library/react-native';

import ScannerRoute from '@/app/(tabs)/scanner';

describe('ScannerRoute', () => {
  it('mounts ScannerScreen properly', async () => {
    await render(<ScannerRoute />);
    expect(screen.getByTestId('scanner-screen')).toBeTruthy();
  });
});
