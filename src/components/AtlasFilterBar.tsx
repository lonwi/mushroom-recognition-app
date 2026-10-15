import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ATLAS_FILTER_GROUPS } from '../data/atlasFilterModel';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../theme/tokens';

interface Props {
  chipIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export const AtlasFilterBar: React.FC<Props> = ({ chipIds, onToggle }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.bar} testID="atlas-filter-bar">
      {ATLAS_FILTER_GROUPS.map((group) => (
        <View key={group.id} style={styles.group} testID={`filter-group-${group.id}`}>
          <Text style={styles.groupLabel}>{t(group.label)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {group.chips.map((chip) => {
              const active = chipIds.has(chip.id);
              return (
                <TouchableOpacity
                  key={chip.id}
                  testID={`filter-chip-${chip.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active ? styles.chipActive : null]}
                  onPress={() => onToggle(chip.id)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{t(chip.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray600,
  },
  chipTextActive: {
    color: colors.white,
  },
});
