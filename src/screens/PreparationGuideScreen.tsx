import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { PREPARATION_GUIDE } from '../data/preparationRules';
import { useLanguage } from '../contexts/LanguageContext';

type CategoryFilter = 'ALL' | 'CLEAN' | 'COOK' | 'STORE';

export const PreparationGuideScreen: React.FC = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const filteredRules = PREPARATION_GUIDE.filter((rule) => {
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'CLEAN') return rule.id === 'clean';
    if (activeCategory === 'COOK') return rule.id === 'cooking' || rule.id === 'blanch';
    if (activeCategory === 'STORE') return rule.id === 'store' || rule.id === 'dry';
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('preparation.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('preparation.subtitle')}</Text>
        </View>

        {/* Zakładki filtrów kategorii */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabChip, activeCategory === 'ALL' && styles.tabChipActive]}
            onPress={() => setActiveCategory('ALL')}
            testID="tab-prep-all"
          >
            <Text style={[styles.tabChipText, activeCategory === 'ALL' && styles.tabChipTextActive]}>
              Wszystkie
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeCategory === 'CLEAN' && styles.tabChipActive]}
            onPress={() => setActiveCategory('CLEAN')}
            testID="tab-prep-clean"
          >
            <Text style={[styles.tabChipText, activeCategory === 'CLEAN' && styles.tabChipTextActive]}>
              🧹 {t('preparation.cleanTab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeCategory === 'COOK' && styles.tabChipActive]}
            onPress={() => setActiveCategory('COOK')}
            testID="tab-prep-cook"
          >
            <Text style={[styles.tabChipText, activeCategory === 'COOK' && styles.tabChipTextActive]}>
              🍳 {t('preparation.cookTab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeCategory === 'STORE' && styles.tabChipActive]}
            onPress={() => setActiveCategory('STORE')}
            testID="tab-prep-store"
          >
            <Text style={[styles.tabChipText, activeCategory === 'STORE' && styles.tabChipTextActive]}>
              📦 {t('preparation.storeTab')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {filteredRules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleTop}>
                  <Text style={styles.ruleTitle}>🍄 {rule.title}</Text>
                </View>
                <Text style={styles.ruleDesc}>{rule.description}</Text>
              </View>
            ))}
          </View>
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
    flexWrap: 'wrap',
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabChipActive: {
    backgroundColor: '#1B3B22',
    borderColor: '#1B3B22',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ruleTop: {
    marginBottom: 4,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  ruleDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginTop: 6,
  },
});
