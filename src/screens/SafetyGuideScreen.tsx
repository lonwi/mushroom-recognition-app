import React from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  GOLDEN_RULES,
  HOURS_24_7,
  POISON_SYNDROMES,
  TOXICOLOGY_CENTERS,
  toTelUrl,
} from '../data/safetyRules';
import { useLanguage } from '../contexts/LanguageContext';
import { colors } from '../theme/tokens';
import { ScreenFrame } from '../components/ScreenFrame';

interface Props {
  onShowDisclaimer: () => void;
  onOpenPreparation?: () => void;
}

export const SafetyGuideScreen = ({ onShowDisclaimer, onOpenPreparation }: Props) => {
  const { t } = useLanguage();
  const handleCall = async (phone: string) => {
    const url = toTelUrl(phone);
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t('safetyGuide.callNotSupportedTitle'), t('safetyGuide.callNotSupportedBody'));
    }
  };

  return (
    <ScreenFrame title={t('safetyGuide.title')} subtitle={t('safetyGuide.subtitle')}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Przycisk Alarmowy 112 */}
          <TouchableOpacity
            style={styles.emergency112Btn}
            onPress={() => handleCall('112')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('safetyGuide.call112Title')}
            testID="call-112"
          >
            <Text style={styles.emergency112Icon}>🚨</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.emergency112Title}>{t('safetyGuide.call112Title')}</Text>
              <Text style={styles.emergency112Sub}>{t('safetyGuide.call112Sub')}</Text>
            </View>
          </TouchableOpacity>

          {/* Złote zasady grzybiarza */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('safetyGuide.goldenRulesTitle')}</Text>
            {GOLDEN_RULES.map((rule) => (
              <View
                key={rule.id}
                style={[styles.ruleCard, rule.critical && styles.ruleCardCritical]}
              >
                <View style={styles.ruleTop}>
                  <Text style={styles.ruleBadge}>
                    {rule.critical ? t('safetyGuide.badgeCritical') : t('safetyGuide.badgeTip')}
                  </Text>
                  <Text style={styles.ruleTitle}>{t(`safetyGuide.rules.${rule.id}.title`)}</Text>
                </View>
                <Text style={styles.ruleDesc}>{t(`safetyGuide.rules.${rule.id}.description`)}</Text>
              </View>
            ))}
          </View>

          {/* Główne zespoły zatruć */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('safetyGuide.syndromesTitle')}</Text>
            {POISON_SYNDROMES.map((syn) => (
              <View key={syn.id} style={styles.syndromeCard}>
                <Text style={styles.synName}>{t(`safetyGuide.syndromes.${syn.id}.name`)}</Text>
                <Text style={styles.synSpecies}>
                  {t('safetyGuide.speciesLabel')} {t(`safetyGuide.syndromes.${syn.id}.species`)}
                </Text>

                <View style={styles.latencyBox}>
                  <Text style={styles.latencyLabel}>{t('safetyGuide.latencyLabel')}</Text>
                  <Text style={styles.latencyVal}>{t(`safetyGuide.syndromes.${syn.id}.latency`)}</Text>
                </View>

                <Text style={styles.synSymptomsLabel}>{t('safetyGuide.symptomsLabel')}</Text>
                <Text style={styles.synSymptomsText}>{t(`safetyGuide.syndromes.${syn.id}.symptoms`)}</Text>

                <View style={styles.synActionBox}>
                  <Text style={styles.synActionText}>
                    {t('safetyGuide.actionLabel')} {t(`safetyGuide.syndromes.${syn.id}.action`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Ośrodki Informacji Toksykologicznej w Polsce */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('safetyGuide.centersTitle')}</Text>
            <Text style={styles.sectionSub}>{t('safetyGuide.centersSub')}</Text>

            {TOXICOLOGY_CENTERS.map((center) => (
              <View key={center.city} style={styles.centerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.centerCity}>{center.city}</Text>
                  <Text style={styles.centerAddress}>{center.address}</Text>
                  {center.hours ? (
                    <Text style={styles.centerHours}>
                      {t('safetyGuide.availabilityLabel')}{' '}
                      {center.hours === HOURS_24_7 ? t('safetyGuide.hours247') : center.hours}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.callCenterBtns}>
                  {center.phones.map((phone) => (
                    <TouchableOpacity
                      key={phone}
                      style={styles.callCenterBtn}
                      onPress={() => handleCall(phone)}
                      accessibilityRole="button"
                      accessibilityLabel={t('safetyGuide.callCenterA11y', { city: center.city, phone })}
                      testID={`call-center-${phone.replace(/\D/g, '')}`}
                    >
                      <Text style={styles.callCenterBtnText}>📞 {phone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Przycisk do Poradnika Przygotowania Grzybów */}
          {onOpenPreparation && (
            <TouchableOpacity
              style={styles.preparationBtn}
              onPress={onOpenPreparation}
              activeOpacity={0.8}
              testID="open-preparation"
            >
              <Text style={styles.preparationIcon}>🍳</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.preparationTitle}>{t('safetyGuide.preparationTitle')}</Text>
                <Text style={styles.preparationSub}>{t('safetyGuide.preparationSub')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Przycisk ponownego wyświetlenia Disclaimer */}
          <TouchableOpacity
            style={styles.disclaimerReopenBtn}
            onPress={onShowDisclaimer}
            activeOpacity={0.7}
          >
            <Text style={styles.disclaimerReopenText}>{t('safetyGuide.reopenDisclaimer')}</Text>
          </TouchableOpacity>
        </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emergency112Btn: {
    minHeight: 44,
    backgroundColor: colors.red600,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: colors.red600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  emergency112Icon: {
    fontSize: 28,
  },
  emergency112Title: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  emergency112Sub: {
    color: colors.red100,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.slate900,
    marginBottom: 10,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.slate500,
    marginBottom: 12,
  },
  ruleCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  ruleCardCritical: {
    borderLeftWidth: 4,
    borderLeftColor: colors.rose600,
  },
  ruleTop: {
    marginBottom: 4,
  },
  ruleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.rose600,
    marginBottom: 2,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate800,
  },
  ruleDesc: {
    fontSize: 12,
    color: colors.slate600,
    lineHeight: 18,
    marginTop: 4,
  },
  syndromeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  synName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.red800,
  },
  synSpecies: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.slate500,
    marginTop: 2,
    marginBottom: 8,
  },
  latencyBox: {
    backgroundColor: colors.red50,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  latencyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.red800,
  },
  latencyVal: {
    fontSize: 12,
    color: colors.red700,
    fontWeight: '600',
  },
  synSymptomsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate700,
  },
  synSymptomsText: {
    fontSize: 12,
    color: colors.slate600,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 8,
  },
  synActionBox: {
    backgroundColor: colors.amber50,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  synActionText: {
    fontSize: 11,
    color: colors.amber700,
    fontWeight: '700',
  },
  centerRow: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerCity: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.slate800,
  },
  centerAddress: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 1,
  },
  centerHours: {
    fontSize: 10,
    color: colors.green700,
    fontWeight: '600',
    marginTop: 2,
  },
  callCenterBtns: {
    gap: 6,
  },
  callCenterBtn: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  callCenterBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerReopenBtn: {
    paddingVertical: 14,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disclaimerReopenText: {
    color: colors.slate600,
    fontSize: 13,
    fontWeight: '600',
  },
  preparationBtn: {
    backgroundColor: colors.emerald600,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: colors.emerald600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  preparationIcon: {
    fontSize: 28,
  },
  preparationTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  preparationSub: {
    color: colors.emerald100,
    fontSize: 12,
    marginTop: 2,
  },
});
