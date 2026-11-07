import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PhotoCredits } from '../components/PhotoCredits';
import { useLanguage } from '../contexts/LanguageContext';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { loadPhotoCredits, type PhotoCredit } from '../services/attributionPackage';
import { colors, radius, spacing } from '../theme/tokens';
import { ScreenFrame } from '../components/ScreenFrame';

export const SettingsScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsLoadFailed, setCreditsLoadFailed] = useState(false);
  const [credits, setCredits] = useState<PhotoCredit[] | null>(null);

  const openCredits = () => {
    setCredits(null);
    setCreditsLoadFailed(false);
    setCreditsLoading(true);
    setCreditsOpen(true);
  };

  const closeCredits = useCallback(() => {
    setCreditsOpen(false);
  }, []);

  useEffect(() => {
    if (!creditsOpen) {
      return undefined;
    }
    let cancelled = false;
    setCreditsLoading(true);
    loadPhotoCredits()
      .then((rows) => {
        if (!cancelled) {
          setCreditsLoadFailed(false);
          setCredits(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCredits(null);
          setCreditsLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCreditsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [creditsOpen]);

  if (creditsOpen) {
    return (
      <PhotoCredits
        credits={credits}
        loading={creditsLoading}
        loadFailed={creditsLoadFailed}
        onClose={closeCredits}
      />
    );
  }

  return (
    <ScreenFrame title={t('settings.title')}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Forager Profile Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>🌲</Text>
            </View>
            <View style={styles.profileTitleBlock}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{t('settings.badgeForager')}</Text>
              </View>
              <Text style={styles.profileTitle}>{t('settings.profileTitle')}</Text>
              <Text style={styles.profileSubtitle}>{t('settings.profileSubtitle')}</Text>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{MUSHROOMS_DATABASE.length}</Text>
              <Text style={styles.statLabel}>{t('settings.statSpecies')}</Text>
            </View>
            <View style={styles.statBoxDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValueActive}>100%</Text>
              <Text style={styles.statLabel}>{t('settings.statOffline')}</Text>
            </View>
            <View style={styles.statBoxDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{t('settings.statAIReady')}</Text>
              <Text style={styles.statLabel}>{t('settings.statAI')}</Text>
            </View>
          </View>
        </View>

        {/* Language Selection */}
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.languageOptions}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'pl' && styles.langBtnActive]}
            onPress={() => setLanguage('pl')}
            testID="btn-lang-pl"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'pl' }}
          >
            <Text style={[styles.langText, language === 'pl' && styles.langTextActive]}>
              🇵🇱 {t('settings.pl')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
            testID="btn-lang-en"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: language === 'en' }}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              🇬🇧 {t('settings.en')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Offline On-Device Architecture */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>{t('settings.onDeviceTitle')}</Text>
          <Text style={styles.infoCardText}>{t('settings.offlineNotice')}</Text>
        </View>

        {/* Safety & Sanepid Guidance */}
        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>{t('settings.securityNoticeTitle')}</Text>
          <Text style={styles.securityBody}>{t('settings.securityNoticeBody')}</Text>
        </View>

        {/* Data License & Attribution */}
        <View style={styles.aboutCard} testID="training-data-license">
          <Text style={styles.aboutTitle}>{t('settings.dataLicenseTitle')}</Text>
          <Text style={styles.aboutVersion}>{t('settings.dataLicenseBody')}</Text>
          <TouchableOpacity
            onPress={openCredits}
            testID="btn-photo-credits"
            style={styles.creditsButton}
            activeOpacity={0.7}
          >
            <Text style={styles.creditsButtonText}>{t('settings.photoCreditsOpen')}</Text>
          </TouchableOpacity>
        </View>

        {/* App Version & Scope */}
        <View style={styles.aboutCard} testID="atlas-coverage-notice">
          <Text style={styles.aboutTitle}>{t('settings.about')}</Text>
          <Text style={styles.aboutVersion}>{t('settings.version')}</Text>
          <Text style={styles.aboutBody}>
            {t('settings.atlasScope', { count: MUSHROOMS_DATABASE.length })}
          </Text>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  profileHeaderCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.softGreenBg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  profileTitleBlock: {
    flex: 1,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.paperActive,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryGreen,
    letterSpacing: 0.5,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  profileSubtitle: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate800,
  },
  statValueActive: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate500,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryGreen,
    marginBottom: spacing.sm,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  langBtn: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  langBtnActive: {
    backgroundColor: colors.paperActive,
    borderColor: colors.primaryGreen,
  },
  langText: {
    fontSize: 14,
    color: colors.slate600,
    fontWeight: '600',
  },
  langTextActive: {
    color: colors.primaryGreen,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald200,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoCardTitle: {
    color: colors.emerald800,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  infoCardText: {
    color: colors.emerald700,
    fontSize: 13,
    lineHeight: 18,
  },
  securityCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  securityTitle: {
    color: colors.slate800,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  securityBody: {
    color: colors.slate600,
    fontSize: 12,
    lineHeight: 17,
  },
  aboutCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate800,
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 12,
    color: colors.slate500,
  },
  aboutBody: {
    fontSize: 13,
    color: colors.slate700,
    lineHeight: 18,
    marginTop: 8,
  },
  creditsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  creditsButtonText: {
    color: colors.primaryGreen,
    fontWeight: '700',
    fontSize: 14,
  },
});
