import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import type { AtlasRow } from '../data/atlasFilterModel';
import type { MushroomSpecies } from '../types/mushroom';
import { AtlasFilterBar } from '../components/AtlasFilterBar';
import { AtlasFilterSheet } from '../components/AtlasFilterSheet';
import { AtlasSpeciesCard } from '../components/AtlasSpeciesCard';
import { useAtlasFilters } from '../hooks/useAtlasFilters';
import { useLanguage } from '../contexts/LanguageContext';
import { useHardwareBack } from '../navigation/hardwareBack';
import { colors, spacing } from '../theme/tokens';

interface Props {
  onSelectSpecies: (species: MushroomSpecies) => void;
}

export const AtlasScreen: React.FC<Props> = ({ onSelectSpecies }) => {
  const { t, language } = useLanguage();
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
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('atlas.searchPlaceholder')}
            placeholderTextColor={colors.slate400}
            value={filters.query}
            onChangeText={filters.setQuery}
            clearButtonMode="while-editing"
          />
          {filters.query !== '' ? (
            <TouchableOpacity onPress={() => filters.setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.scopeNotice} testID="atlas-scope-notice">
          {t('atlas.scopeNotice', { count: MUSHROOMS_DATABASE.length })}
        </Text>

        {language === 'en' ? (
          <Text style={styles.sourceLanguageNote} testID="atlas-source-language-note">
            {t('cards.sourceLanguageNote')}
          </Text>
        ) : null}

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
          <EmptyAtlas query={filters.query} />
        ) : (
          <AtlasResults
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

function AtlasResults({
  matches,
  unverified,
  focusUnverified,
  onSelectSpecies,
}: {
  matches: readonly AtlasRow[];
  unverified: readonly AtlasRow[];
  focusUnverified: boolean;
  onSelectSpecies: (species: MushroomSpecies) => void;
}) {
  const { t } = useLanguage();
  const unverifiedBlock =
    unverified.length > 0 || focusUnverified ? (
      <UnverifiedSection rows={unverified} onSelectSpecies={onSelectSpecies} />
    ) : null;
  return (
    <View testID="atlas-results">
      {focusUnverified ? unverifiedBlock : null}
      {matches.length > 0 ? (
        <View testID="atlas-matches">
          {matches.map((row) => (
            <AtlasSpeciesCard key={row.species.id} row={row} onPress={onSelectSpecies} />
          ))}
        </View>
      ) : (
        <Text style={styles.matchNote} testID="atlas-no-matches">
          {t('atlas.emptyDesc')}
        </Text>
      )}
      {focusUnverified ? null : unverifiedBlock}
    </View>
  );
}

function UnverifiedSection({
  rows,
  onSelectSpecies,
}: {
  rows: readonly AtlasRow[];
  onSelectSpecies: (species: MushroomSpecies) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.unverified} testID="atlas-unverified">
      <Text style={styles.unverifiedTitle} testID="atlas-unverified-title">
        {t('atlas.unverifiedTitle', { count: rows.length })}
      </Text>
      <Text style={styles.unverifiedBody}>{t('atlas.unverifiedBody')}</Text>
      {rows.map((row) => (
        <AtlasSpeciesCard key={row.species.id} row={row} onPress={onSelectSpecies} />
      ))}
    </View>
  );
}

function EmptyAtlas({ query }: { query: string }) {
  const { t } = useLanguage();
  const szatan = /szatan/.test(query.toLowerCase());
  return (
    <View style={styles.emptyContainer} testID="atlas-empty">
      <Text style={styles.emptyIcon}>🍄</Text>
      <Text style={styles.emptyTitle}>{t('atlas.emptyTitle')}</Text>
      {szatan ? (
        <Text style={styles.emptyDesc} testID="atlas-szatan-notice">
          {t('atlas.szatanNotice')}
        </Text>
      ) : (
        <Text style={styles.emptyDesc}>{t('atlas.emptyDesc')}</Text>
      )}
    </View>
  );
}

const noticeBox = {
  marginBottom: 10,
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 12,
  lineHeight: 18,
  fontWeight: '600',
} as const;

const warningNotice = {
  ...noticeBox,
  color: colors.orange900,
  backgroundColor: colors.orange50,
  borderColor: colors.orange300,
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate900,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.slate400,
    padding: 6,
  },
  scopeNotice: warningNotice,
  sourceLanguageNote: {
    ...noticeBox,
    color: colors.blueInk,
    backgroundColor: colors.blue50,
    borderColor: colors.blue300,
  },
  resultCount: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
  },
  matchNote: {
    marginBottom: 12,
    color: colors.slate600,
    fontSize: 13,
    lineHeight: 18,
  },
  unverified: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.orange300,
  },
  unverifiedTitle: {
    marginBottom: 4,
    color: colors.orange900,
    fontSize: 14,
    fontWeight: '800',
  },
  unverifiedBody: warningNotice,
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate700,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: 4,
  },
});
