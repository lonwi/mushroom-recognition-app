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
  /** Stretch the chip to its cell. The month grid uses this. */
  fill?: boolean;
}

export const AtlasFilterChip: React.FC<Props> = ({
  chipId,
  label,
  active,
  onPress,
  tone = 'default',
  fill = false,
}) => {
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
        fill ? styles.chipFill : null,
        warning ? styles.chipWarning : null,
        active ? (warning ? styles.chipWarningActive : styles.chipActive) : null,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          fill ? styles.chipTextFill : null,
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
  fill?: boolean;
}> = ({ chips, chipIds, onToggle, fill = false }) => (
  <>
    {chips.map((chip) => (
      <AtlasFilterChip
        key={chip.id}
        chipId={chip.id}
        label={chip.label}
        active={chipIds.has(chip.id)}
        fill={fill}
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
  chipFill: {
    width: '100%',
    alignItems: 'center',
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
  chipTextFill: {
    textAlign: 'center',
  },
  chipWarningText: {
    color: colors.orange900,
  },
  chipTextActive: {
    color: colors.white,
  },
});
