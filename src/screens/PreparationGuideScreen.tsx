import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PREPARATION_GUIDE, PREPARATION_TABS } from '../data/preparationRules';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/tokens';
import { ScreenFrame } from '../components/ScreenFrame';

type CategoryFilter = (typeof PREPARATION_TABS)[number]['id'];

export const PreparationGuideScreen: React.FC = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const filteredRules = PREPARATION_GUIDE.filter(
    (rule) => activeCategory === 'ALL' || rule.category === activeCategory,
  );

  return (
    <ScreenFrame title={t('preparation.title')} subtitle={t('preparation.subtitle')}>
        <View style={styles.tabsRow}>
          {PREPARATION_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setActiveCategory(tab.id)}
                testID={tab.testID}
              >
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {tab.icon}
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {filteredRules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <View style={styles.ruleTop}>
                  <Text style={styles.ruleTitle}>🍄 {t(`preparation.rules.${rule.id}.title`)}</Text>
                </View>
                <Text style={styles.ruleDesc}>{t(`preparation.rules.${rule.id}.description`)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    gap: 6,
    flexWrap: 'wrap',
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate600,
  },
  tabChipTextActive: {
    color: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.black,
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
    color: colors.slate800,
  },
  ruleDesc: {
    fontSize: 13,
    color: colors.slate600,
    lineHeight: 19,
    marginTop: 6,
  },
});
