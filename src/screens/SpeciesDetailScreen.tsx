import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MushroomSpecies } from '../types/mushroom';
import { EdibilityBadge } from '../components/EdibilityBadge';
import { LookAlikeAlert } from '../components/LookAlikeAlert';

interface Props {
  species: MushroomSpecies;
  onBack: () => void;
}

export const SpeciesDetailScreen: React.FC<Props> = ({ species, onBack }) => {
  const monthsNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

  const getHymenophoreIcon = (type: string) => {
    switch(type) {
      case 'TUBES': return 'grid-outline';
      case 'GILLS': return 'reorder-four-outline';
      case 'FOLDS': return 'water-outline';
      default: return 'help-circle-outline';
    }
  };

  const getHymenophoreName = (type: string) => {
    switch(type) {
      case 'TUBES': return 'Rurki';
      case 'GILLS': return 'Blaszki';
      case 'FOLDS': return 'Listewki';
      default: return 'Inny';
    }
  };

  const isToxic = species.status === 'DEADLY_POISONOUS' || species.status === 'POISONOUS';

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
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
           
           <View style={styles.badgesRow}>
             <EdibilityBadge status={species.status} size="large" />
             <View style={styles.hymenophorePill}>
                <Ionicons name={getHymenophoreIcon(species.hymenophore) as any} size={14} color="#047857" style={{marginRight: 4}} />
                <Text style={styles.hymenophorePillText}>{getHymenophoreName(species.hymenophore)}</Text>
             </View>
           </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
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
                  <Text style={[styles.monthText, isActive && styles.monthTextActive]}>{m}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Lookalikes Warning */}
        <View style={styles.lookAlikeContainer}>
          <LookAlikeAlert risks={species.confusionRisks} />
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

        {/* Action / Culinary Card */}
        <View style={[
          styles.actionCard, 
          isToxic ? styles.toxicCard : styles.edibleCard
        ]}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIconCircle, isToxic ? {backgroundColor: '#FEE2E2'} : {backgroundColor: '#D1FAE5'}]}>
              <Feather 
                name={isToxic ? "alert-triangle" : "check"} 
                size={22} 
                color={isToxic ? "#DC2626" : "#059669"} 
              />
            </View>
            <Text style={[
              styles.actionTitle,
              isToxic ? {color: '#B91C1C'} : {color: '#047857'}
            ]}>
              {isToxic ? 'Toksyczność i objawy' : 'W kuchni'}
            </Text>
          </View>
          
          <Text style={styles.actionBody}>{species.culinaryValue}</Text>

          {species.warningNotes && (
            <View style={styles.warningBox}>
              <Feather name="info" size={18} color="#B45309" style={{marginTop: 2}} />
              <Text style={styles.warningText}>{species.warningNotes}</Text>
            </View>
          )}
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
    marginTop: 20,
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
});
