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

interface Props {
  species: MushroomSpecies;
  onBack: () => void;
  onOpenLookAlike?: (speciesId: string) => void;
}

export const SpeciesDetailScreen: React.FC<Props> = ({ species, onBack, onOpenLookAlike }) => {
  const { t, language } = useLanguage();
  const monthsNames = [
    t('months.jan'),
    t('months.feb'),
    t('months.mar'),
    t('months.apr'),
    t('months.may'),
    t('months.jun'),
    t('months.jul'),
    t('months.aug'),
    t('months.sep'),
    t('months.oct'),
    t('months.nov'),
    t('months.dec'),
  ];
  const photo = getMushroomImage(species.id);
  const fatalLookAlike = hasFatalLookAlikeRisk(species);

  const getHymenophoreIcon = (type: string) => {
    switch(type) {
      case 'TUBES': return 'grid-outline';
      case 'GILLS': return 'reorder-four-outline';
      case 'FOLDS': return 'water-outline';
      case 'SPINES': return 'pin-outline';
      default: return 'help-circle-outline';
    }
  };

  const getHymenophoreName = (type: string) => {
    switch(type) {
      case 'TUBES': return 'Rurki';
      case 'GILLS': return 'Blaszki';
      case 'FOLDS': return 'Listewki';
      case 'SPINES': return 'Kolce';
      default: return 'Inny';
    }
  };

  const kitchen = showsKitchenSection(species);
  const isToxic = species.status === 'DEADLY_POISONOUS' || species.status === 'POISONOUS';
  const isInedible = species.status === 'INEDIBLE';
  const useTone = kitchen ? 'edible' : isToxic ? 'toxic' : isInedible ? 'inedible' : 'neutral';
  const useSection = {
    edible: {
      testId: 'species-use-edible',
      title: t('cards.useKitchen'),
      icon: 'check' as const,
      titleColor: '#047857',
      iconColor: '#059669',
      iconBg: '#D1FAE5',
    },
    toxic: {
      testId: 'species-use-toxic',
      title: t('cards.useToxic'),
      icon: 'alert-triangle' as const,
      titleColor: '#B91C1C',
      iconColor: '#DC2626',
      iconBg: '#FEE2E2',
    },
    inedible: {
      testId: 'species-use-inedible',
      title: t('cards.useInedible'),
      icon: 'slash' as const,
      titleColor: '#9A3412',
      iconColor: '#C2410C',
      iconBg: '#FFEDD5',
    },
    neutral: {
      testId: 'species-use-neutral',
      title: t('cards.useLiterature'),
      icon: 'book-open' as const,
      titleColor: '#334155',
      iconColor: '#475569',
      iconBg: '#E2E8F0',
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
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
              <View style={styles.backBtnCircle}>
                <Ionicons name="chevron-back" size={22} color="#10B981" />
              </View>
              <Text style={styles.backBtnText}>Atlas</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        <View style={styles.heroContent}>
           <Text style={styles.namePl}>{species.namePl}</Text>
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
                <Ionicons name={getHymenophoreIcon(species.hymenophore) as any} size={14} color="#047857" style={{marginRight: 4}} />
                <Text style={styles.hymenophorePillText}>{getHymenophoreName(species.hymenophore)}</Text>
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

        {species.warningNotes ? (
          <View style={styles.warningBox} testID="species-warning-notes">
            <Feather name="info" size={18} color="#B45309" style={{ marginTop: 2 }} />
            <Text style={styles.warningText}>{species.warningNotes}</Text>
          </View>
        ) : null}

        {/* Main Info Card */}
        <View style={styles.mainCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>RODZINA</Text>
              <Text style={styles.infoValue}>{species.family}</Text>
            </View>
          </View>
          
          {species.commonNicknames.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>INNE NAZWY</Text>
                  <Text style={styles.infoValue}>{species.commonNicknames.join(' • ')}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />
          
          <Text style={styles.infoLabel}>SEZON WYSTĘPOWANIA W POLSCE</Text>
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

        <Text style={styles.sectionTitle}>Morfologia i siedlisko</Text>
        
        {/* Botanical Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="map-pin" size={18} color="#059669" /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle}>Występowanie</Text>
              <Text style={styles.detailItemDesc}>{species.habitat}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="umbrella" size={18} color="#059669" /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle}>Kapelusz</Text>
              <Text style={styles.detailItemDesc}>{species.capDescription}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="align-justify" size={18} color="#059669" /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle}>Spód ({getHymenophoreName(species.hymenophore)})</Text>
              <Text style={styles.detailItemDesc}>{species.hymenophoreDescription}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconBox}><Feather name="menu" size={18} color="#059669" style={{transform: [{rotate: '90deg'}]}} /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle}>Trzon i osłona</Text>
              <Text style={styles.detailItemDesc}>{species.stemDescription}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.detailIconBox}><Feather name="droplet" size={18} color="#059669" /></View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailItemTitle}>Miąższ, smak i zapach</Text>
              <Text style={styles.detailItemDesc}>{species.fleshDescription} {species.tasteAndSmell}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Znaczenie i zastosowanie</Text>

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
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    backgroundColor: '#064E3B', // Dark forest green
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#064E3B',
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
    color: '#D1FAE5',
  },
  heroContent: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  namePl: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  nameLatin: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#A7F3D0',
    marginTop: 4,
    fontWeight: '500',
  },
  photoMissingText: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  incompleteBanner: {
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  incompleteBannerTitle: {
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '800',
  },
  incompleteBannerBody: {
    color: '#7C2D12',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '600',
  },
  fatalBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fatalBannerTitle: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: '800',
  },
  fatalBannerBody: {
    color: '#7F1D1D',
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
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  hymenophorePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#64748B',
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
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthBoxActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  monthText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  lookAlikeContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  detailItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
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
    color: '#334155',
    marginBottom: 4,
  },
  detailItemDesc: {
    fontSize: 14,
    color: '#475569',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#34D399',
    shadowColor: '#059669',
  },
  neutralCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#64748B',
  },
  inedibleCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    shadowColor: '#C2410C',
  },
  toxicCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    shadowColor: '#DC2626',
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
    color: '#334155',
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    marginLeft: 10,
    lineHeight: 20,
  },
  sourceLanguageNote: {
    color: '#1E3A5F',
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
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
