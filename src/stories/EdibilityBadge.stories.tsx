import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { EdibilityBadge } from '../components/EdibilityBadge';

const meta: Meta<typeof EdibilityBadge> = {
  title: 'Mushroom/EdibilityBadge',
  component: EdibilityBadge,
  argTypes: {
    status: {
      control: 'select',
      options: ['EDIBLE', 'INEDIBLE', 'POISONOUS', 'DEADLY_POISONOUS'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EdibilityBadge>;

export const Edible: Story = {
  args: {
    status: 'EDIBLE',
    size: 'medium',
  },
};

export const Inedible: Story = {
  args: {
    status: 'INEDIBLE',
    size: 'medium',
  },
};

export const Poisonous: Story = {
  args: {
    status: 'POISONOUS',
    size: 'medium',
  },
};

export const DeadlyPoisonous: Story = {
  args: {
    status: 'DEADLY_POISONOUS',
    size: 'large',
  },
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <EdibilityBadge status="EDIBLE" size="small" />
      <EdibilityBadge status="EDIBLE" size="medium" />
      <EdibilityBadge status="EDIBLE" size="large" />
      <EdibilityBadge status="DEADLY_POISONOUS" size="large" />
    </View>
  ),
};
