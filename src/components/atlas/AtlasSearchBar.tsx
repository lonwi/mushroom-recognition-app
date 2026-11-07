import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';

interface Props {
  query: string;
  onChangeQuery: (query: string) => void;
}

export const AtlasSearchBar: React.FC<Props> = ({ query, onChangeQuery }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder={t('atlas.searchPlaceholder')}
        placeholderTextColor={colors.slate400}
        value={query}
        onChangeText={onChangeQuery}
        clearButtonMode="while-editing"
      />
      {query !== '' ? (
        <TouchableOpacity
          accessibilityLabel={t('common.clear') || 'Wyczyść'}
          accessibilityRole="button"
          onPress={() => onChangeQuery('')}
        >
          <Text style={styles.clearBtn}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.slate900,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.slate400,
    padding: 6,
  },
});
