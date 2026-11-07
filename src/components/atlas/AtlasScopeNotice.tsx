import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';
import { warningNoticeBox } from './atlasNoticeStyles';

interface Props {
  count: number;
}

export const AtlasScopeNotice: React.FC<Props> = ({ count }) => {
  const { t, language } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.scopeNotice} testID="atlas-scope-notice">
        {t('atlas.scopeNotice', { count })}
      </Text>
      {language === 'en' ? (
        <Text style={styles.sourceLanguageNote} testID="atlas-source-language-note">
          {t('cards.sourceLanguageNote')}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scopeNotice: warningNoticeBox,
  sourceLanguageNote: {
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.blueInk,
    backgroundColor: colors.blue50,
    borderColor: colors.blue300,
  },
});
