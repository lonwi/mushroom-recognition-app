import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MushroomSpecies } from '../../types/mushroom';
import { useLanguage } from '../../contexts/LanguageContext';
import { HYMENOPHORE_META } from '../../presentation/speciesMeta';
import { colors } from '../../theme/tokens';

interface SpeciesMorphologyCardProps {
  species: MushroomSpecies;
}

export const SpeciesMorphologyCard: React.FC<SpeciesMorphologyCardProps> = ({ species }) => {
  const { t } = useLanguage();
  const hymenophore = HYMENOPHORE_META[species.hymenophore];
  const hymenophoreName = t(hymenophore.labelKey);

  return (
    <>
      <Text style={styles.sectionTitle} testID="species-morphology-heading">
        {t('cards.morphologyHabitat')}
      </Text>

      <View style={styles.detailCard}>
        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Feather name="map-pin" size={18} color={colors.emerald600} />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailItemTitle} testID="species-occurrence-label">
              {t('cards.occurrence')}
            </Text>
            <Text style={styles.detailItemDesc}>{species.habitat}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Feather name="umbrella" size={18} color={colors.emerald600} />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailItemTitle} testID="species-cap-label">
              {t('cards.cap')}
            </Text>
            <Text style={styles.detailItemDesc}>{species.capDescription}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Feather name="align-justify" size={18} color={colors.emerald600} />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailItemTitle} testID="species-underside-label">
              {t('cards.underside', { type: hymenophoreName })}
            </Text>
            <Text style={styles.detailItemDesc}>{species.hymenophoreDescription}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Feather
              name="menu"
              size={18}
              color={colors.emerald600}
              style={styles.rotatedMenuIcon}
            />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailItemTitle} testID="species-stem-label">
              {t('cards.stemVeil')}
            </Text>
            <Text style={styles.detailItemDesc}>{species.stemDescription}</Text>
          </View>
        </View>

        <View style={[styles.detailItem, styles.detailItemLast]}>
          <View style={styles.detailIconBox}>
            <Feather name="droplet" size={18} color={colors.emerald600} />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailItemTitle} testID="species-flesh-label">
              {t('cards.fleshTasteSmell')}
            </Text>
            <Text style={styles.detailItemDesc}>
              {species.fleshDescription} {species.tasteAndSmell}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate800,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    shadowColor: colors.slate500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  detailItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    paddingBottom: 16,
    marginBottom: 16,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.emerald50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slate700,
    marginBottom: 4,
  },
  detailItemDesc: {
    fontSize: 14,
    color: colors.slate600,
    lineHeight: 22,
  },
  detailItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  rotatedMenuIcon: {
    transform: [{ rotate: '90deg' }],
  },
});
