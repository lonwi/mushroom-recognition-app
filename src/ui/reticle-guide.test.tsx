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

  it('renders step 3 (stem template) with custom accessibility label and size', async () => {
    await render(
      <ReticleGuide
        step={3}
        theme="highContrast"
        size={300}
        accessibilityLabel="Custom Reticle 3"
      />,
    );
    const element = screen.getByTestId('reticle-guide-step-3');
    expect(element).toBeTruthy();
    expect(element.props.accessibilityLabel).toBe('Custom Reticle 3');
  });
});
