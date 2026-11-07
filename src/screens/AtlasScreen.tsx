import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import type { MushroomSpecies } from '../types/mushroom';
import { AtlasFilterBar } from '../components/AtlasFilterBar';
import { AtlasFilterSheet } from '../components/AtlasFilterSheet';
import {
  AtlasEmptyState,
  AtlasResultsList,
  AtlasScopeNotice,
  AtlasSearchBar,
} from '../components/atlas';
import { useAtlasFilters } from '../hooks/useAtlasFilters';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardwareBack } from '../navigation/hardwareBack';
import { colors } from '../theme/tokens';

interface Props {
  onSelectSpecies: (species: MushroomSpecies) => void;
}

export const AtlasScreen: React.FC<Props> = ({ onSelectSpecies }) => {
  const { t } = useLanguage();
  const filters = useAtlasFilters(MUSHROOMS_DATABASE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unverifiedFocus, setUnverifiedFocus] = useState(false);
  const nothingLeft = filters.matches.length === 0 && filters.unverified.length === 0;

  useHardwareBack(() => {
    if (!sheetOpen) return false;
    setSheetOpen(false);
    return true;
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AtlasSearchBar query={filters.query} onChangeQuery={filters.setQuery} />

        <AtlasScopeNotice count={MUSHROOMS_DATABASE.length} />

        <AtlasFilterBar
          chipIds={filters.chipIds}
          panelCount={filters.panelCount}
          filtersOpen={sheetOpen}
          unverifiedFocus={unverifiedFocus}
          activeChips={filters.panelChips}
          onToggle={filters.toggleChip}
          onToggleUnverified={() => setUnverifiedFocus((current) => !current)}
          onOpenFilters={() => setSheetOpen(true)}
          onRemove={filters.removeChip}
        />

        <Text style={styles.resultCount} testID="atlas-result-count">
          {t('atlas.resultCount', { count: filters.resultCount })}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {nothingLeft ? (
          <AtlasEmptyState query={filters.query} />
        ) : (
          <AtlasResultsList
            matches={filters.matches}
            unverified={filters.unverified}
            focusUnverified={unverifiedFocus}
            onSelectSpecies={onSelectSpecies}
          />
        )}
      </ScrollView>

      <AtlasFilterSheet
        visible={sheetOpen}
        chipIds={filters.chipIds}
        visibleCount={filters.visibleCount}
        onToggle={filters.toggleChip}
        onClear={filters.clearPanelFilters}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: colors.background,
    paddingTop: 10,
  },
  header: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    paddingHorizontal: 16,
  },
  resultCount: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
