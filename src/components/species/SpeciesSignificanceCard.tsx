import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MushroomSpecies } from '../../types/mushroom';
import { showsKitchenSection } from '../../data/mushrooms';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';

interface SpeciesSignificanceCardProps {
  species: MushroomSpecies;
}

export const SpeciesSignificanceCard: React.FC<SpeciesSignificanceCardProps> = ({ species }) => {
  const { t } = useLanguage();

  const kitchen = showsKitchenSection(species);
  const isToxic = species.status === 'DEADLY_POISONOUS' || species.status === 'POISONOUS';
  const isInedible = species.status === 'INEDIBLE';
  const useTone = kitchen ? 'edible' : isToxic ? 'toxic' : isInedible ? 'inedible' : 'neutral';

  const useSection = {
    edible: {
      testId: 'species-use-edible',
      title: t('cards.useKitchen'),
      icon: 'check' as const,
      titleColor: colors.emerald700,
      iconColor: colors.emerald600,
      iconBg: colors.emerald100,
    },
    toxic: {
      testId: 'species-use-toxic',
      title: t('cards.useToxic'),
      icon: 'alert-triangle' as const,
      titleColor: colors.red700,
      iconColor: colors.red600,
      iconBg: colors.red100,
    },
    inedible: {
      testId: 'species-use-inedible',
      title: t('cards.useInedible'),
      icon: 'slash' as const,
      titleColor: colors.orange800,
      iconColor: colors.orange700,
      iconBg: colors.orange100,
    },
    neutral: {
      testId: 'species-use-neutral',
      title: t('cards.useLiterature'),
      icon: 'book-open' as const,
      titleColor: colors.slate700,
      iconColor: colors.slate600,
      iconBg: colors.slate200,
    },
  }[useTone];

  return (
    <>
      <Text style={styles.sectionTitle} testID="species-significance-heading">
        {t('cards.significanceUse')}
      </Text>

      <View
        testID={useSection.testId}
        style={[
          styles.actionCard,
          useTone === 'edible' && styles.edibleCard,
          useTone === 'toxic' && styles.toxicCard,
          useTone === 'inedible' && styles.inedibleCard,
          useTone === 'neutral' && styles.neutralCard,
        ]}
      >
        <View style={styles.actionHeader}>
          <View style={[styles.actionIconCircle, { backgroundColor: useSection.iconBg }]}>
            <Feather name={useSection.icon} size={22} color={useSection.iconColor} />
          </View>
          <Text style={[styles.actionTitle, { color: useSection.titleColor }]}>
            {useSection.title}
          </Text>
        </View>

        <Text style={styles.actionBody}>{species.culinaryValue}</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    marginLeft: 4,
    color: colors.slate800,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  actionCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  edibleCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.emerald400,
    shadowColor: colors.emerald600,
  },
  neutralCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    shadowColor: colors.slate500,
  },
  inedibleCard: {
    backgroundColor: colors.orange50,
    borderWidth: 1,
    borderColor: colors.orange300,
    shadowColor: colors.orange700,
  },
  toxicCard: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red300,
    shadowColor: colors.red600,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionBody: {
    fontSize: 15,
    color: colors.slate700,
    lineHeight: 24,
  },
});
