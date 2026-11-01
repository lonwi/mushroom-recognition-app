import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';

function AlwaysThrows(): React.ReactElement {
  throw new Error('story render error');
}

const meta: Meta<typeof ScreenErrorBoundary> = {
  title: 'Mushroom/ScreenErrorBoundary',
  component: ScreenErrorBoundary,
};

export default meta;
type Story = StoryObj<typeof ScreenErrorBoundary>;

export const RenderError: Story = {
  render: () => (
    <ScreenErrorBoundary resetKey="ATLAS:species:amanita_phalloides" colorScheme="light">
      <AlwaysThrows />
    </ScreenErrorBoundary>
  ),
};

export const RenderErrorDark: Story = {
  render: () => (
    <ScreenErrorBoundary resetKey="ATLAS:species:amanita_phalloides" colorScheme="dark">
      <AlwaysThrows />
    </ScreenErrorBoundary>
  ),
};
