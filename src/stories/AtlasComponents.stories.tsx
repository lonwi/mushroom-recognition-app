import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StyleSheet, View } from 'react-native';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { applyAtlasFilters } from '../data/atlasFilterModel';
import {
  AtlasEmptyState,
  AtlasResultsList,
  AtlasScopeNotice,
  AtlasSearchBar,
} from '../components/atlas';
import { colors } from '../theme/tokens';

const meta: Meta = {
  title: 'Atlas/Components',
};

export default meta;

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 16,
  },
});

export const SearchBarInteractive: StoryObj = {
  render: function SearchBarDemo() {
    const [query, setQuery] = useState('Borowik');
    return (
      <View style={styles.frame}>
        <AtlasSearchBar query={query} onChangeQuery={setQuery} />
      </View>
    );
  },
};

export const ScopeNotice: StoryObj = {
  render: () => (
    <View style={styles.frame}>
      <AtlasScopeNotice count={MUSHROOMS_DATABASE.length} />
    </View>
  ),
};

export const EmptyStateStandard: StoryObj = {
  render: () => (
    <View style={styles.frame}>
      <AtlasEmptyState query="xyz_not_found" />
    </View>
  ),
};

export const EmptyStateSzatanWarning: StoryObj = {
  render: () => (
    <View style={styles.frame}>
      <AtlasEmptyState query="szatan" />
    </View>
  ),
};

export const ResultsListMatches: StoryObj = {
  render: () => {
    const filtered = applyAtlasFilters(MUSHROOMS_DATABASE, {
      query: 'borowik',
      chipIds: new Set(),
    });
    return (
      <View style={styles.frame}>
        <AtlasResultsList
          matches={filtered.matches}
          unverified={filtered.unverified}
          focusUnverified={false}
          onSelectSpecies={() => {}}
        />
      </View>
    );
  },
};
