import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MushroomSpecies } from '../../types/mushroom';
import { useLanguage } from '../../contexts/LanguageContext';
import { MONTH_KEYS } from '../../presentation/speciesMeta';
import { colors } from '../../theme/tokens';

interface SpeciesSeasonalityCardProps {
  species: MushroomSpecies;
}

export const SpeciesSeasonalityCard: React.FC<SpeciesSeasonalityCardProps> = ({ species }) => {
  const { t } = useLanguage();
  const monthsNames = MONTH_KEYS.map((month) => t(`months.${month}`));

  return (
    <View style={styles.mainCard}>
      <View style={styles.infoRow}>
        <View style={styles.infoCol}>
          <Text style={styles.infoLabel} testID="species-family-label">
            {t('cards.family')}
          </Text>
          <Text style={styles.infoValue}>{species.family}</Text>
        </View>
      </View>

      {species.commonNicknames.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel} testID="species-other-names-label">
                {t('cards.otherNames')}
              </Text>
              <Text style={styles.infoValue}>{species.commonNicknames.join(' • ')}</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.divider} />

      <Text style={styles.infoLabel} testID="species-season-label">
        {t('cards.seasonPoland')}
      </Text>
      {species.months.length > 0 ? (
        <View style={styles.monthsGrid}>
          {monthsNames.map((m, index) => {
            const monthNum = index + 1;
            const isActive = species.months.includes(monthNum);
            return (
              <View key={monthNum} style={[styles.monthBox, isActive && styles.monthBoxActive]}>
                <Text
                  testID={`species-month-${monthNum}`}
                  style={[styles.monthText, isActive && styles.monthTextActive]}
                >
                  {m}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.infoValue} testID="species-season-omitted">
          {t('cards.seasonOmitted')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.slate500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.slate400,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate700,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceVariant,
    marginVertical: 16,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  monthBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  monthBoxActive: {
    backgroundColor: colors.emerald500,
    borderColor: colors.emerald600,
    shadowColor: colors.emerald500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  monthText: {
    fontSize: 12,
    color: colors.slate400,
    fontWeight: '600',
  },
  monthTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
});
