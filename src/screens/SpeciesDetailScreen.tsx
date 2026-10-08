import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MushroomSpecies } from '../types/mushroom';
import { SpeciesStatusBadge } from '../components/EdibilityBadge';
import { LookAlikeAlert } from '../components/LookAlikeAlert';
import { getMushroomImage } from '../utils/mushroomImages';
import { hasFatalLookAlikeRisk, MUSHROOM_IDS, showsKitchenSection } from '../data/mushrooms';
import { useLanguage } from '../contexts/LanguageContext';
import { HYMENOPHORE_META, MONTH_KEYS } from '../presentation/speciesMeta';
import { colors } from '../theme/tokens';

interface Props {
  species: MushroomSpecies;
  onBack: () => void;
  onOpenLookAlike?: (speciesId: string) => void;
}

export const SpeciesDetailScreen: React.FC<Props> = ({ species, onBack, onOpenLookAlike }) => {
  const { t, language } = useLanguage();
  const monthsNames = MONTH_KEYS.map((month) => t(`months.${month}`));
  const photo = getMushroomImage(species.id);
  const fatalLookAlike = hasFatalLookAlikeRisk(species);
  const hymenophore = HYMENOPHORE_META[species.hymenophore];
  const hymenophoreName = t(hymenophore.labelKey);

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
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {photo ? (
          <Image
            source={photo}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            testID="species-photo"
          />
        ) : null}
        <View style={styles.heroOverlay} />
        <SafeAreaView>
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.8}
              testID="species-back"
            >
              <View style={styles.backBtnCircle}>
                <Ionicons name="chevron-back" size={22} color={colors.emerald500} />
              </View>
              <Text style={styles.backBtnText} testID="species-back-label">{t('nav.atlas')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        <View style={styles.heroContent}>
           <Text style={styles.namePl}>{species.namePl}</Text>
           {species.nameEn ? (
             <Text style={styles.nameEn} testID="species-name-en">{species.nameEn}</Text>
           ) : null}
           <Text style={styles.nameLatin}>{species.nameLatin}</Text>
           {photo ? null : (
             <Text style={styles.photoMissingText} testID="species-photo-missing">{t('cards.photoMissing')}</Text>
           )}

           {species.incompleteCard ? (
             <View style={styles.incompleteBanner} testID="incomplete-card-banner">
               <Text style={styles.incompleteBannerTitle}>{t('cardWarnings.incompleteBannerTitle')}</Text>
               <Text style={styles.incompleteBannerBody}>{t('cardWarnings.incompleteBannerBody')}</Text>
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
                <Ionicons name={hymenophore.icon} size={14} color={colors.emerald700} style={{marginRight: 4}} />
                <Text style={styles.hymenophorePillText} testID="species-hymenophore">{hymenophoreName}</Text>
             </View>
           </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {language === 'en' ? (
          <Text style={styles.sourceLanguageNote} testID="species-source-language-note">
            {t('cards.sourceLanguageNote')}
          </Text>
        ) : null}

        {fatalLookAlike ? (
          <View style={styles.fatalBanner} testID="fatal-lookalike-banner">
            <Text style={styles.fatalBannerTitle}>{t('cardWarnings.fatalBannerTitle')}</Text>
            <Text style={styles.fatalBannerBody}>{t('cardWarnings.fatalBannerBody')}</Text>
          </View>
        ) : null}

        {species.id === 'morchella_esculenta' ? (
          <View style={styles.morelBanner} testID="morel-protection-notice">
            <Text style={styles.morelBannerTitle}>{t('cards.morelProtectionTitle')}</Text>
            <Text style={styles.morelBannerBody}>{t('cards.morelProtectionBody')}</Text>
          </View>
        ) : null}

        {species.warningNotes ? (
          <View style={styles.warningBox} testID="species-warning-notes">
            <Feather name="info" size={18} color={colors.amber700} style={{ marginTop: 2 }} />
            <Text style={styles.warningText}>{species.warningNotes}</Text>
          </View>
        ) : null}

        {/* Main Info Card */}
        <View style={styles.mainCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel} testID="species-family-label">{t('cards.family')}</Text>
              <Text style={styles.infoValue}>{species.family}</Text>
            </View>
          </View>
          
          {species.commonNicknames.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel} testID="species-other-names-label">{t('cards.otherNames')}</Text>
                  <Text style={styles.infoValue}>{species.commonNicknames.join(' • ')}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />
          
          <Text style={styles.infoLabel} testID="species-season-label">{t('cards.seasonPoland')}</Text>
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
        </View>

        {/* Lookalikes Warning */}
        <View style={styles.lookAlikeContainer}>
          <LookAlikeAlert
            risks={species.confusionRisks}
            noDangerousLookAlikesSource={species.noDangerousLookAlikes?.source}
            catalogIds={MUSHROOM_IDS}
            ownStatus={species.status}
            onOpenSpecies={onOpenLookAlike}
          />
        </View>

        <Text style={styles.sectionTitle} testID="species-morphology-heading">{t('cards.morphologyHabitat')}</Text>
        
        {/* Botanical Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="map-pin" size={18} color={colors.emerald600} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle} testID="species-occurrence-label">{t('cards.occurrence')}</Text>
              <Text style={styles.detailItemDesc}>{species.habitat}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="umbrella" size={18} color={colors.emerald600} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle} testID="species-cap-label">{t('cards.cap')}</Text>
              <Text style={styles.detailItemDesc}>{species.capDescription}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="align-justify" size={18} color={colors.emerald600} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle} testID="species-underside-label">{t('cards.underside', { type: hymenophoreName })}</Text>
              <Text style={styles.detailItemDesc}>{species.hymenophoreDescription}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="menu" size={18} color={colors.emerald600} style={{transform: [{rotate: '90deg'}]}} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle} testID="species-stem-label">{t('cards.stemVeil')}</Text>
              <Text style={styles.detailItemDesc}>{species.stemDescription}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.detailIconBox}><Feather name="droplet" size={18} color={colors.emerald600} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle} testID="species-flesh-label">{t('cards.fleshTasteSmell')}</Text>
              <Text style={styles.detailItemDesc}>{species.fleshDescription} {species.tasteAndSmell}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle} testID="species-significance-heading">{t('cards.significanceUse')}</Text>

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

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    backgroundColor: colors.emerald950, // Dark forest green
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: colors.emerald950,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 30, 18, 0.68)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  morelBanner: {
    marginBottom: 16,
    backgroundColor: colors.amber50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  morelBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.amber800,
    marginBottom: 6,
  },
  morelBannerBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.amber900,
  },
  namePl: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
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
  fatalBanner: {
    backgroundColor: colors.red50,
    borderWidth: 2,
    borderColor: colors.red600,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fatalBannerTitle: {
    color: colors.red800,
    fontSize: 16,
    fontWeight: '800',
  },
  fatalBannerBody: {
    color: colors.red900,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
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
    color: colors.emerald950,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
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
  lookAlikeContainer: {
    marginBottom: 24,
  },
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
  warningBox: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.amber50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.amber800,
    fontWeight: '600',
    marginLeft: 10,
    lineHeight: 20,
  },
  sourceLanguageNote: {
    color: colors.blueInk,
    backgroundColor: colors.blue50,
    borderColor: colors.blue300,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 16,
  },
});
