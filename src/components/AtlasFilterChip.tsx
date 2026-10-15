import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/tokens';

interface Chip {
  id: string;
  label: string;
}

interface Props {
  chipId: string;
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: 'default' | 'warning';
}

export const AtlasFilterChip: React.FC<Props> = ({ chipId, label, active, onPress, tone = 'default' }) => {
  const { t } = useLanguage();
  const warning = tone === 'warning';
  return (
    <TouchableOpacity
      testID={`filter-chip-${chipId}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(label)}
      style={[
        styles.chip,
        warning ? styles.chipWarning : null,
        active ? (warning ? styles.chipWarningActive : styles.chipActive) : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          warning ? styles.chipWarningText : null,
          active ? styles.chipTextActive : null,
        ]}
      >
        {t(label)}
      </Text>
    </TouchableOpacity>
  );
};

export const AtlasFilterChipList: React.FC<{
  chips: readonly Chip[];
  chipIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}> = ({ chips, chipIds, onToggle }) => (
  <>
    {chips.map((chip) => (
      <AtlasFilterChip
        key={chip.id}
        chipId={chip.id}
        label={chip.label}
        active={chipIds.has(chip.id)}
        onPress={() => onToggle(chip.id)}
      />
    ))}
  </>
);

const styles = StyleSheet.create({
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
  chipWarning: {
    backgroundColor: colors.orange50,
    borderColor: colors.orange300,
  },
  chipWarningActive: {
    backgroundColor: colors.orange700,
    borderColor: colors.orange700,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray600,
  },
  chipWarningText: {
    color: colors.orange900,
  },
  chipTextActive: {
    color: colors.white,
  },
});
