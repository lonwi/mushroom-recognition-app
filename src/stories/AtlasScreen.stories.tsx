import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useWindowDimensions, View } from 'react-native';
import { AtlasScreen } from '../screens/AtlasScreen';

function AtlasFrame() {
  const { width, height } = useWindowDimensions();
  const frameHeight = Math.min(620, height);
  return (
    <View style={{ height: frameHeight, width }}>
      <AtlasScreen onSelectSpecies={() => {}} />
    </View>
  );
}

const meta: Meta<typeof AtlasScreen> = {
  title: 'Mushroom/AtlasScreen',
  component: AtlasScreen,
};

export default meta;
type Story = StoryObj<typeof AtlasScreen>;

export const Filters: Story = {
  render: () => (
    <AtlasFrame />
  ),
};
