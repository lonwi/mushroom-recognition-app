import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { SpeciesDetailScreen } from '../screens/SpeciesDetailScreen';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';

const meta: Meta<typeof SpeciesDetailScreen> = {
  title: 'Mushroom/SpeciesDetailScreen',
  component: SpeciesDetailScreen,
};

export default meta;
type Story = StoryObj<typeof SpeciesDetailScreen>;

function species(id: string) {
  const match = MUSHROOMS_DATABASE.find((item) => item.id === id);
  if (!match) {
    throw new Error(`Missing species ${id}`);
  }
  return match;
}

export const PaxillusIncompleteLookAlikes: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 900 }}>
      <SpeciesDetailScreen
        species={species('paxillus_involutus')}
        onBack={() => {}}
        onOpenLookAlike={() => {}}
      />
    </View>
  ),
};

export const KaniaFatalLookAlike: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 900 }}>
      <SpeciesDetailScreen species={species('macrolepiota_procera')} onBack={() => {}} />
    </View>
  ),
};

export const MorelProtectionNote: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 900 }}>
      <SpeciesDetailScreen species={species('morchella_esculenta')} onBack={() => {}} />
    </View>
  ),
};

export const CzubajnikNotForTheKitchen: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 900 }}>
      <SpeciesDetailScreen species={species('chlorophyllum_rhacodes')} onBack={() => {}} />
    </View>
  ),
};

export const RussulaWithoutPhoto: Story = {
  render: () => (
    <View style={{ flex: 1, minHeight: 900 }}>
      <SpeciesDetailScreen species={species('russula_virescens')} onBack={() => {}} />
    </View>
  ),
};
