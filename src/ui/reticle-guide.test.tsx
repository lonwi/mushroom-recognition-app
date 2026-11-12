import { render, screen } from '@testing-library/react-native';

import { ReticleGuide } from '@/ui/reticle-guide';

describe('ReticleGuide', () => {
  it('renders step 1 (cap template)', async () => {
    await render(<ReticleGuide step={1} />);
    expect(screen.getByTestId('reticle-guide-step-1')).toBeTruthy();
  });

  it('renders step 2 (gills/hymenophore template)', async () => {
    await render(<ReticleGuide step={2} />);
    expect(screen.getByTestId('reticle-guide-step-2')).toBeTruthy();
  });

  it('renders step 3 (stem template)', async () => {
    await render(<ReticleGuide step={3} theme="highContrast" />);
    expect(screen.getByTestId('reticle-guide-step-3')).toBeTruthy();
  });
});
