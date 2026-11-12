import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Surface } from '@/ui/surface';

describe('Surface', () => {
  it('renders children with default elevation level 1', async () => {
    await render(
      <Surface testID="surface">
        <Text>Content</Text>
      </Surface>,
    );
    expect(screen.getByText('Content')).toBeTruthy();
    const surface = screen.getByTestId('surface');
    expect(surface.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderWidth: 1 })]),
    );
  });

  it('renders different elevation levels and high contrast mode', async () => {
    const { rerender } = await render(
      <Surface testID="surface" level={3} theme="highContrast">
        <Text>Content</Text>
      </Surface>,
    );
    const surface = screen.getByTestId('surface');
    expect(surface.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderWidth: 2, borderColor: '#FFFFFF' })]),
    );

    await rerender(
      <Surface testID="surface" level={0} theme="light">
        <Text>Content</Text>
      </Surface>,
    );
    expect(surface.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderWidth: 1 })]),
    );
  });
});
