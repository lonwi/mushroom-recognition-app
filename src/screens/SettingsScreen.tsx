import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoCredits } from '../components/PhotoCredits';
import { useLanguage } from '../contexts/LanguageContext';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { loadPhotoCredits, type PhotoCredit } from '../services/attributionPackage';

export const SettingsScreen: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [credits, setCredits] = useState<PhotoCredit[] | null>(null);

  const openCredits = () => {
    setCredits(null);
    setCreditsLoading(true);
    setCreditsOpen(true);
  };

  useEffect(() => {
    if (!creditsOpen) {
      return undefined;
    }
    let cancelled = false;
    setCreditsLoading(true);
    loadPhotoCredits()
      .then((rows) => {
        if (!cancelled) {
          setCredits(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCredits(null);
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
        onClose={() => setCreditsOpen(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

          <View style={styles.languageOptions}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'pl' && styles.langBtnActive]}
              onPress={() => setLanguage('pl')}
              testID="btn-lang-pl"
            >
              <Text style={[styles.langText, language === 'pl' && styles.langTextActive]}>
                🇵🇱 {t('settings.pl')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
              testID="btn-lang-en"
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                🇬🇧 {t('settings.en')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>⚡ 100% On-Device AI</Text>
            <Text style={styles.infoCardText}>{t('settings.offlineNotice')}</Text>
          </View>

          <View style={styles.aboutCard} testID="training-data-license">
            <Text style={styles.aboutTitle}>{t('settings.dataLicenseTitle')}</Text>
            <Text style={styles.aboutVersion}>{t('settings.dataLicenseBody')}</Text>
            <TouchableOpacity
              onPress={openCredits}
              testID="btn-photo-credits"
              style={styles.creditsButton}
            >
              <Text style={styles.creditsButtonText}>{t('settings.photoCreditsOpen')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.aboutCard} testID="atlas-coverage-notice">
            <Text style={styles.aboutTitle}>{t('settings.about')}</Text>
            <Text style={styles.aboutVersion}>{t('settings.version')}</Text>
            <Text style={styles.aboutBody}>
              {t('settings.atlasScope').replace('{count}', String(MUSHROOMS_DATABASE.length))}
            </Text>
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  creditsButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  creditsButtonText: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#16A34A',
  },
  langText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  langTextActive: {
    color: '#16A34A',
    fontWeight: '800',
  },
  infoCard: {
    marginTop: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 14,
  },
  infoCardTitle: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  infoCardText: {
    color: '#047857',
    fontSize: 13,
    lineHeight: 18,
  },
  aboutCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#64748B',
  },
  aboutBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 8,
  },
});
