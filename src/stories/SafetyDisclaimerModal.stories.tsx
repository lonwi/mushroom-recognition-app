import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, Button } from 'react-native';
import { SafetyDisclaimerModal } from '../components/SafetyDisclaimerModal';

const meta: Meta<typeof SafetyDisclaimerModal> = {
  title: 'Mushroom/SafetyDisclaimerModal',
  component: SafetyDisclaimerModal,
};

export default meta;
type Story = StoryObj<typeof SafetyDisclaimerModal>;

export const InteractiveDisclaimer: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    return (
      <View style={{ padding: 20 }}>
        <Button title="Pokaż Ostrzeżenie Sanepidu" onPress={() => setVisible(true)} />
        <SafetyDisclaimerModal visible={visible} onAccept={() => setVisible(false)} />
      </View>
    );
  },
};
