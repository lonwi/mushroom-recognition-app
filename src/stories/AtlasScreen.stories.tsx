import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { AtlasScreen } from '../screens/AtlasScreen';

const meta: Meta<typeof AtlasScreen> = {
  title: 'Mushroom/AtlasScreen',
  component: AtlasScreen,
};

export default meta;
type Story = StoryObj<typeof AtlasScreen>;

export const Filters: Story = {
  render: () => (
    <View style={{ height: 980 }}>
      <AtlasScreen onSelectSpecies={() => {}} />
    </View>
  ),
};
