import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { getSpecies } from '../../data/speciesCatalog';
import { colors, spacing } from '../../theme/tokens';
import { visibleAtlasExamples } from '../../utils/atlasExampleLabel';

const ATLAS_EXAMPLES = [
  { id: 'boletus_edulis', slug: 'boletus', emoji: '🌲', danger: false },
  { id: 'amanita_phalloides', slug: 'amanita', emoji: '☠', danger: true },
  { id: 'macrolepiota_procera', slug: 'macrolepiota', emoji: '☂', danger: false },
  { id: 'cantharellus_cibarius', slug: 'cantharellus', emoji: '🍳', danger: false },
] as const;

interface ScannerExamplesProps {
  onOpenAtlasSample: (speciesId: string) => void;
  disabled?: boolean;
}

export const ScannerExamples: React.FC<ScannerExamplesProps> = ({
  onOpenAtlasSample,
  disabled = false,
}) => {
  const { t, language } = useLanguage();
  const atlasExamples = visibleAtlasExamples(ATLAS_EXAMPLES, language, getSpecies);

  return (
    <View style={styles.demoTestContainer}>
      <Text style={styles.demoTestLabel}>{t('scanner.quickDemo')}</Text>
      <Text style={styles.demoScopeHint} testID="scanner-atlas-scope">
        {t('scanner.atlasScopeHint')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.demoScroll}
      >
        {atlasExamples.map((example) => (
          <TouchableOpacity
            key={example.id}
            style={[styles.demoChip, example.danger && styles.demoChipDanger]}
            onPress={() => onOpenAtlasSample(example.id)}
            disabled={disabled}
            accessibilityLabel={example.label}
            testID={`demo-atlas-${example.slug}`}
          >
            <Text
              style={styles.demoChipEmoji}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {example.emoji}
            </Text>
            <Text
              style={[styles.demoChipText, example.danger && styles.demoChipDangerText]}
              testID={`demo-atlas-label-${example.slug}`}
            >
              {example.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  demoTestContainer: {
    backgroundColor: colors.overlayDark70,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  demoTestLabel: {
    color: colors.outline,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  demoScopeHint: {
    color: colors.slate400,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  demoScroll: {
    gap: 8,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: spacing.xs,
    backgroundColor: colors.overlayLight20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.overlayLight25,
  },
  demoChipEmoji: {
    fontSize: 12,
    flexShrink: 0,
  },
  demoChipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  demoChipDanger: {
    backgroundColor: colors.overlayDanger40,
    borderColor: colors.red500,
  },
  demoChipDangerText: {
    color: colors.red300,
  },
});
