import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { creditLicenseUrl, type PhotoCredit } from '../services/attributionPackage';

/**
 * FlatList is the only scroll container. Settings must not mount this inside
 * its own ScrollView: a shipped model has about 20–22k credit rows.
 */
export const PhotoCredits: React.FC<{
  credits: PhotoCredit[] | null;
  onClose?: () => void;
}> = ({ credits, onClose }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const rows = credits ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((item) => {
      const haystack = `${item.creator} ${item.taxonName} ${item.license} ${item.licenseNormalized}`.toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  return (
    <SafeAreaView style={styles.safeArea} testID="photo-credits-screen">
      <View style={styles.header}>
        {onClose ? (
          <Pressable onPress={onClose} testID="photo-credits-back">
            <Text style={styles.back}>{t('settings.photoCreditsBack')}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{t('settings.photoCreditsOpen')}</Text>
      </View>
      {rows.length === 0 ? (
        <Text style={styles.empty} testID="photo-credits-empty">
          {t('settings.photoCreditsEmpty')}
        </Text>
      ) : (
        <FlatList
          style={styles.list}
          testID="photo-credits-list"
          data={filtered}
          keyExtractor={(item, index) => `${item.imageUrl}-${index}`}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <Text style={styles.lead}>{t('settings.photoCreditsLead')}</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('settings.photoCreditsSearch')}
                style={styles.search}
                testID="photo-credits-search"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty} testID="photo-credits-no-matches">
              {t('settings.photoCreditsNoMatches')}
            </Text>
          }
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  back: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3B22',
  },
  list: {
    flex: 1,
  },
  empty: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    padding: 16,
  },
  lead: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
