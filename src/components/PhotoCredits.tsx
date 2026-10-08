import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { creditLicenseUrl, type PhotoCredit } from '../services/attributionPackage';

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
      <FlatList
        data={credits}
        keyExtractor={(credit, index) => `${credit.imageUrl}-${index}`}
        scrollEnabled
        nestedScrollEnabled
        style={styles.list}
        renderItem={({ item, index }) => {
          const license = item.licenseNormalized || item.license;
          const url = creditLicenseUrl(item);
          return (
            <View style={styles.row} testID={`photo-credit-${index}`}>
              <Text style={styles.creator}>{item.creator || t('settings.photoCreditsUnknownAuthor')}</Text>
              {url ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(url);
                  }}
                  testID={`photo-credit-license-${index}`}
                >
                  <Text style={styles.licenseLink}>{license}</Text>
                </Pressable>
              ) : (
                <Text style={styles.license}>{license}</Text>
              )}
              {item.taxonName ? <Text style={styles.meta}>{item.taxonName}</Text> : null}
              {item.sourceUrl ? (
                <Text style={styles.url} testID={`photo-credit-source-${index}`}>
                  {item.sourceUrl}
                </Text>
              ) : null}
            </View>
          );
        }}
      />
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
  list: {
    maxHeight: 420,
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
  licenseLink: {
    fontSize: 13,
    color: '#1D4ED8',
    marginTop: 2,
    textDecorationLine: 'underline',
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
