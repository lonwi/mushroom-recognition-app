import type { Meta, StoryObj } from '@storybook/react';
import { SulphurHoneyComparison } from '../components/SulphurHoneyComparison';

const meta: Meta<typeof SulphurHoneyComparison> = {
  title: 'Mushroom/SulphurHoneyComparison',
  component: SulphurHoneyComparison,
};

export default meta;
type Story = StoryObj<typeof SulphurHoneyComparison>;

export const Light: Story = {
  args: { colorScheme: 'light' },
};

export const Dark: Story = {
  args: { colorScheme: 'dark' },
  parameters: {
    backgrounds: { default: 'forest-dark' },
  },
};
