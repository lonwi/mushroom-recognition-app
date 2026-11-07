import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StyleSheet, View } from 'react-native';
import { BottomNavigationBar } from '../components/BottomNavigationBar';
import type { ShellTab } from '../navigation/viewStack';
import { colors } from '../theme/tokens';

const meta: Meta<typeof BottomNavigationBar> = {
  title: 'Navigation/BottomNavigationBar',
  component: BottomNavigationBar,
};

export default meta;
type Story = StoryObj<typeof BottomNavigationBar>;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    marginHorizontal: 'auto',
    backgroundColor: colors.background,
    paddingBottom: 20,
  },
});

export const ScannerActive: Story = {
  render: () => (
    <View style={styles.container}>
      <BottomNavigationBar activeTab="SCANNER" onSelectTab={() => {}} />
    </View>
  ),
};

export const AtlasActive: Story = {
  render: () => (
    <View style={styles.container}>
      <BottomNavigationBar activeTab="ATLAS" onSelectTab={() => {}} />
    </View>
  ),
};

export const JournalActive: Story = {
  render: () => (
    <View style={styles.container}>
      <BottomNavigationBar activeTab="JOURNAL" onSelectTab={() => {}} />
    </View>
  ),
};

export const ProfileActive: Story = {
  render: () => (
    <View style={styles.container}>
      <BottomNavigationBar activeTab="SETTINGS" onSelectTab={() => {}} />
    </View>
  ),
};

export const Interactive: Story = {
  render: function InteractiveBar() {
    const [tab, setTab] = useState<ShellTab>('SCANNER');
    return (
      <View style={styles.container}>
        <BottomNavigationBar activeTab={tab} onSelectTab={setTab} />
      </View>
    );
  },
};
