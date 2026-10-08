import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import type { PhotoCredit } from '../services/attributionPackage';

export const PhotoCredits: React.FC<{ credits: PhotoCredit[] | null }> = ({ credits }) => {
  const { t } = useLanguage();
  if (!credits || credits.length === 0) {
    return (
      <Text style={styles.empty} testID="photo-credits-empty">
        {t('settings.photoCreditsEmpty')}
      </Text>
    );
  }
  return (
    <View testID="photo-credits-list">
      <Text style={styles.lead}>{t('settings.photoCreditsLead')}</Text>
      {credits.map((credit, index) => (
        <View key={`${credit.imageUrl}-${index}`} style={styles.row} testID={`photo-credit-${index}`}>
          <Text style={styles.creator}>{credit.creator || t('settings.photoCreditsUnknownAuthor')}</Text>
          <Text style={styles.license}>{credit.licenseNormalized || credit.license}</Text>
          {credit.taxonName ? <Text style={styles.meta}>{credit.taxonName}</Text> : null}
          {credit.sourceUrl ? (
            <Text style={styles.url} testID={`photo-credit-source-${index}`}>
              {credit.sourceUrl}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  lead: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  row: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  creator: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  license: {
    fontSize: 13,
    color: '#166534',
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  url: {
    fontSize: 12,
    color: '#1D4ED8',
    marginTop: 2,
  },
});
