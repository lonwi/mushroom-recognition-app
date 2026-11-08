import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MushroomSpecies } from '../../types/mushroom';
import { SpeciesStatusBadge } from '../EdibilityBadge';
import { getMushroomImage } from '../../utils/mushroomImages';
import { useLanguage } from '../../contexts/LanguageContext';
import { HYMENOPHORE_META } from '../../presentation/speciesMeta';
import { colors } from '../../theme/tokens';

const HERO_PHOTO_ASPECT = 1200 / 896;

interface SpeciesHeroHeaderProps {
  species: MushroomSpecies;
  onBack: () => void;
}

export const SpeciesHeroHeader: React.FC<SpeciesHeroHeaderProps> = ({ species, onBack }) => {
  const { t } = useLanguage();
  const photo = getMushroomImage(species.id);
  const hymenophore = HYMENOPHORE_META[species.hymenophore];
  const hymenophoreName = t(hymenophore.labelKey);

  return (
    <View style={styles.heroSection}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.8}
          testID="species-back"
        >
          <View style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={22} color={colors.onPrimary} />
          </View>
          <Text style={styles.backBtnText} testID="species-back-label">
            {t('nav.atlas')}
          </Text>
        </TouchableOpacity>
      </View>
      {photo ? (
        <View style={styles.photoFrame} testID="species-photo-frame">
          <Image source={photo} style={styles.photo} resizeMode="cover" testID="species-photo" />
        </View>
      ) : null}
      <View style={styles.heroContent} testID="species-hero-copy">
        <Text style={styles.namePl}>{species.namePl}</Text>
        {species.nameEn ? (
          <Text style={styles.nameEn} testID="species-name-en">
            {species.nameEn}
          </Text>
        ) : null}
        <Text style={styles.nameLatin}>{species.nameLatin}</Text>
        {photo ? null : (
          <Text style={styles.photoMissingText} testID="species-photo-missing">
            {t('cards.photoMissing')}
          </Text>
        )}

        {species.incompleteCard ? (
          <View style={styles.incompleteBanner} testID="incomplete-card-banner">
            <Text style={styles.incompleteBannerTitle}>
              {t('cardWarnings.incompleteBannerTitle')}
            </Text>
            <Text style={styles.incompleteBannerBody}>
              {t('cardWarnings.incompleteBannerBody')}
            </Text>
          </View>
        ) : null}

        <View style={styles.badgesRow}>
          <SpeciesStatusBadge
            status={species.status}
            incompleteCard={species.incompleteCard}
            size="large"
            testID="incomplete-card-badge"
          />
          <View style={styles.hymenophorePill}>
            <Ionicons
              name={hymenophore.icon}
              size={14}
              color={colors.emerald700}
              style={styles.hymenophoreIcon}
            />
            <Text style={styles.hymenophorePillText} testID="species-hymenophore">
              {hymenophoreName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: colors.emerald900,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: colors.emerald900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: HERO_PHOTO_ASPECT,
    overflow: 'hidden',
    backgroundColor: colors.emerald800,
  },
  photo: {
    ...StyleSheet.absoluteFill,
  },
  navBar: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.emerald800,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.emerald100,
  },
  heroContent: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  nameEn: {
    fontSize: 16,
    color: colors.emerald100,
    fontWeight: '600',
    marginBottom: 4,
  },
  namePl: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.onPrimary,
    letterSpacing: -0.5,
  },
  nameLatin: {
    fontSize: 18,
    fontStyle: 'italic',
    color: colors.emerald200,
    marginTop: 4,
    fontWeight: '500',
  },
  photoMissingText: {
    color: colors.amber200,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  incompleteBanner: {
    marginTop: 12,
    backgroundColor: colors.orange50,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.orange300,
  },
  incompleteBannerTitle: {
    color: colors.orange800,
    fontSize: 14,
    fontWeight: '800',
  },
  incompleteBannerBody: {
    color: colors.orange900,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  hymenophorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emerald100,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  hymenophorePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.emerald900,
  },
  hymenophoreIcon: {
    marginRight: 4,
  },
});
