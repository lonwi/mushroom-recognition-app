import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';

interface Props {
  query: string;
}

export const AtlasEmptyState: React.FC<Props> = ({ query }) => {
  const { t } = useLanguage();
  const szatan = /szatan/.test(query.toLowerCase());

  return (
    <View style={styles.emptyContainer} testID="atlas-empty">
      <Text style={styles.emptyIcon}>🍄</Text>
      <Text style={styles.emptyTitle}>{t('atlas.emptyTitle')}</Text>
      {szatan ? (
        <Text style={styles.emptyDesc} testID="atlas-szatan-notice">
          {t('atlas.szatanNotice')}
        </Text>
      ) : (
        <Text style={styles.emptyDesc}>{t('atlas.emptyDesc')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate700,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: 4,
  },
});
