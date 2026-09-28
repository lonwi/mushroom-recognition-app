import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { PreparationGuideScreen } from '../screens/PreparationGuideScreen';

const meta: Meta<typeof PreparationGuideScreen> = {
  title: 'Mushroom/PreparationGuideScreen',
  component: PreparationGuideScreen,
};

export default meta;
type Story = StoryObj<typeof PreparationGuideScreen>;

export const DefaultView: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 600 }}>
      <PreparationGuideScreen />
    </View>
  ),
};
