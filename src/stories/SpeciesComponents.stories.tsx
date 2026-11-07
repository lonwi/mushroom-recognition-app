import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StyleSheet, View } from 'react-native';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { SpeciesHeroHeader } from '../components/species/SpeciesHeroHeader';
import { SpeciesSafetyBanners } from '../components/species/SpeciesSafetyBanners';
import { SpeciesSeasonalityCard } from '../components/species/SpeciesSeasonalityCard';
import { SpeciesMorphologyCard } from '../components/species/SpeciesMorphologyCard';
import { SpeciesSignificanceCard } from '../components/species/SpeciesSignificanceCard';
import { colors } from '../theme/tokens';

const boletus = MUSHROOMS_DATABASE.find((m) => m.id === 'boletus_edulis')!;
const amanita = MUSHROOMS_DATABASE.find((m) => m.id === 'amanita_phalloides')!;

const meta: Meta = {
  title: 'Species/Components',
};

export default meta;

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  cardFrame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 16,
  },
});

export const HeroHeaderEdible: StoryObj = {
  render: () => (
    <View style={styles.frame}>
      <SpeciesHeroHeader species={boletus} onBack={() => {}} />
    </View>
  ),
};

export const HeroHeaderDeadly: StoryObj = {
  render: () => (
    <View style={styles.frame}>
      <SpeciesHeroHeader species={amanita} onBack={() => {}} />
    </View>
  ),
};

export const SafetyBannersDeadly: StoryObj = {
  render: () => (
    <View style={styles.cardFrame}>
      <SpeciesSafetyBanners species={amanita} />
    </View>
  ),
};

export const Seasonality: StoryObj = {
  render: () => (
    <View style={styles.cardFrame}>
      <SpeciesSeasonalityCard species={boletus} />
    </View>
  ),
};

export const Morphology: StoryObj = {
  render: () => (
    <View style={styles.cardFrame}>
      <SpeciesMorphologyCard species={boletus} />
    </View>
  ),
};

export const Significance: StoryObj = {
  render: () => (
    <View style={styles.cardFrame}>
      <SpeciesSignificanceCard species={boletus} />
    </View>
  ),
};
