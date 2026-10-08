import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { SafetyGuideScreen } from '../screens/SafetyGuideScreen';

const meta: Meta<typeof SafetyGuideScreen> = {
  title: 'Mushroom/SafetyGuideScreen',
  component: SafetyGuideScreen,
};

export default meta;
type Story = StoryObj<typeof SafetyGuideScreen>;

export const GoldenRules: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 1400 }}>
      <SafetyGuideScreen onShowDisclaimer={() => {}} onOpenPreparation={() => {}} />
    </View>
  ),
};
