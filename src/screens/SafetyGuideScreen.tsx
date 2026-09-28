import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  SafeAreaView,
} from 'react-native';
import { GOLDEN_RULES, POISON_SYNDROMES, TOXICOLOGY_CENTERS } from '../data/safetyRules';

interface Props {
  onShowDisclaimer: () => void;
  onOpenPreparation?: () => void;
}

export const SafetyGuideScreen = ({ onShowDisclaimer, onOpenPreparation }: Props) => {
  const handleCall = (phone: string) => {
    const cleanNumber = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Poradnik Bezpieczeństwa & Pomoc</Text>
          <Text style={styles.headerSubtitle}>
            Zasady bezpiecznego grzybobrania i telefony ratunkowe
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Przycisk Alarmowy 112 */}
          <TouchableOpacity
            style={styles.emergency112Btn}
            onPress={() => handleCall('112')}
            activeOpacity={0.8}
          >
            <Text style={styles.emergency112Icon}>🚨</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.emergency112Title}>Zadzwoń pod numer alarmowy 112</Text>
              <Text style={styles.emergency112Sub}>
                W przypadku podejrzenia spożycia trującego grzyba
              </Text>
            </View>
          </TouchableOpacity>

          {/* Złote zasady grzybiarza */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌲 Złote Zasady Grzybiarza</Text>
            {GOLDEN_RULES.map((rule) => (
              <View
                key={rule.id}
                style={[styles.ruleCard, rule.critical && styles.ruleCardCritical]}
              >
                <View style={styles.ruleTop}>
                  <Text style={styles.ruleBadge}>{rule.critical ? '⚡ WAŻNE' : 'ℹ WSKAZÓWKA'}</Text>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                </View>
                <Text style={styles.ruleDesc}>{rule.description}</Text>
              </View>
            ))}
          </View>

          {/* Główne zespoły zatruć */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>☠ Rozpoznawanie Objawów Zatrucia</Text>
            {POISON_SYNDROMES.map((syn, idx) => (
              <View key={idx} style={styles.syndromeCard}>
                <Text style={styles.synName}>{syn.name}</Text>
                <Text style={styles.synSpecies}>Gatunki: {syn.species}</Text>

                <View style={styles.latencyBox}>
                  <Text style={styles.latencyLabel}>Czas ujawnienia objawów:</Text>
                  <Text style={styles.latencyVal}>{syn.latency}</Text>
                </View>

                <Text style={styles.synSymptomsLabel}>Objawy:</Text>
                <Text style={styles.synSymptomsText}>{syn.symptoms}</Text>

                <View style={styles.synActionBox}>
                  <Text style={styles.synActionText}>🚨 Postępowanie: {syn.action}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Ośrodki Informacji Toksykologicznej w Polsce */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Ośrodki Toksykologiczne w Polsce (24/7)</Text>
            <Text style={styles.sectionSub}>
              Dyżurni toksykolodzy udzielają natychmiastowych porad telefonicznych:
            </Text>

            {TOXICOLOGY_CENTERS.map((center, idx) => (
              <View key={idx} style={styles.centerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.centerCity}>{center.city}</Text>
                  <Text style={styles.centerAddress}>{center.address}</Text>
                  <Text style={styles.centerHours}>Dostępność: {center.hours}</Text>
                </View>

                <TouchableOpacity
                  style={styles.callCenterBtn}
                  onPress={() => handleCall(center.phone)}
                >
                  <Text style={styles.callCenterBtnText}>📞 {center.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Przycisk do Poradnika Przygotowania Grzybów */}
          {onOpenPreparation && (
            <TouchableOpacity
              style={styles.preparationBtn}
              onPress={onOpenPreparation}
              activeOpacity={0.8}
            >
              <Text style={styles.preparationIcon}>🍳</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.preparationTitle}>Jak przygotować grzyby?</Text>
                <Text style={styles.preparationSub}>
                  Poradnik czyszczenia, gotowania i przechowywania
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Przycisk ponownego wyświetlenia Disclaimer */}
          <TouchableOpacity
            style={styles.disclaimerReopenBtn}
            onPress={onShowDisclaimer}
            activeOpacity={0.7}
          >
            <Text style={styles.disclaimerReopenText}>
              📄 Przeczytaj ponownie Regulamin i Ostrzeżenie AI
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3B22',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emergency112Btn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  emergency112Icon: {
    fontSize: 28,
  },
  emergency112Title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  emergency112Sub: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleCardCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#E11D48',
  },
  ruleTop: {
    marginBottom: 4,
  },
  ruleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 2,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ruleDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
  },
  syndromeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  synName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },
  synSpecies: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  latencyBox: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  latencyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  latencyVal: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  synSymptomsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  synSymptomsText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 8,
  },
  synActionBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  synActionText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  centerRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerCity: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  centerAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  centerHours: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 2,
  },
  callCenterBtn: {
    backgroundColor: '#1B3B22',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  callCenterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerReopenBtn: {
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disclaimerReopenText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  preparationBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  preparationIcon: {
    fontSize: 28,
  },
  preparationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  preparationSub: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 2,
  },
});
