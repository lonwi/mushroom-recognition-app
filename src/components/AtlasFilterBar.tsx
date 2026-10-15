import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ATLAS_KIND_GROUP } from '../data/atlasFilterModel';
import { AtlasFilterChip, AtlasFilterChipList } from './AtlasFilterChip';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../theme/tokens';

/** View switch for the unverified section. It is not a model chip and never enters `chipIds`. */
const UNVERIFIED_CHIP_ID = 'unverified';

interface ActiveChip {
  id: string;
  label: string;
}

interface Props {
  chipIds: ReadonlySet<string>;
  panelCount: number;
  filtersOpen: boolean;
  unverifiedFocus: boolean;
  activeChips: readonly ActiveChip[];
  onToggle: (id: string) => void;
  onToggleUnverified: () => void;
  onOpenFilters: () => void;
  onRemove: (id: string) => void;
}

export const AtlasFilterBar: React.FC<Props> = ({
  chipIds,
  panelCount,
  filtersOpen,
  unverifiedFocus,
  activeChips,
  onToggle,
  onToggleUnverified,
  onOpenFilters,
  onRemove,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.bar} testID="atlas-filter-bar">
      <View style={styles.line}>
        <View style={styles.scroller}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.row}
          >
            <AtlasFilterChipList chips={ATLAS_KIND_GROUP.chips} chipIds={chipIds} onToggle={onToggle} />
            <AtlasFilterChip
              chipId={UNVERIFIED_CHIP_ID}
              label="atlas.filters.unverified"
              active={unverifiedFocus}
              tone="warning"
              onPress={onToggleUnverified}
            />
          </ScrollView>
        </View>
        <TouchableOpacity
          testID="atlas-filter-open"
          accessibilityRole="button"
          accessibilityLabel={t('atlas.filters.openA11y', { count: panelCount })}
          accessibilityState={{ expanded: filtersOpen }}
          style={[styles.filtersButton, panelCount > 0 ? styles.filtersButtonActive : null]}
          onPress={onOpenFilters}
        >
          <Text style={[styles.filtersButtonText, panelCount > 0 ? styles.filtersButtonTextActive : null]}>
            {t('atlas.filters.open', { count: panelCount })}
          </Text>
        </TouchableOpacity>
      </View>
      {activeChips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          testID="atlas-active-filters"
          contentContainerStyle={styles.activeRow}
        >
          {activeChips.map((chip) => (
            <TouchableOpacity
              key={chip.id}
              testID={`filter-active-${chip.id}`}
              accessibilityRole="button"
              accessibilityLabel={t('atlas.filters.remove', { label: t(chip.label) })}
              style={styles.activeChip}
              onPress={() => onRemove(chip.id)}
            >
              <Text style={styles.activeChipText}>
                {t(chip.label)} ×
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    marginBottom: spacing.sm,
    minWidth: 0,
    width: '100%',
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  scroller: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  filtersButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexShrink: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filtersButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filtersButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filtersButtonTextActive: {
    color: colors.white,
  },
  activeRow: {
    gap: spacing.xs,
  },
  activeChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald300,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.emerald800,
  },
});
