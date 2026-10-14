import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StyleSheet, View } from 'react-native';
import App from '../../App';

const meta: Meta<typeof App> = {
  title: 'Mushroom/AppShell',
  component: App,
};

export default meta;
type Story = StoryObj<typeof App>;

const styles = StyleSheet.create({
  frame: {
    height: 840,
    width: '100%',
  },
});

/** Full shell so browser tests can dispatch the Android back event. */
export const HardwareBack: Story = {
  render: () => (
    <View style={styles.frame}>
      <App />
    </View>
  ),
};
