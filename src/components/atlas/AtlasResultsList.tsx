import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AtlasRow } from '../../data/atlasFilterModel';
import type { MushroomSpecies } from '../../types/mushroom';
import { AtlasSpeciesCard } from '../AtlasSpeciesCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors, spacing } from '../../theme/tokens';
import { warningNoticeBox } from './atlasNoticeStyles';

interface Props {
  matches: readonly AtlasRow[];
  unverified: readonly AtlasRow[];
  focusUnverified: boolean;
  onSelectSpecies: (species: MushroomSpecies) => void;
}

export const AtlasResultsList: React.FC<Props> = ({
  matches,
  unverified,
  focusUnverified,
  onSelectSpecies,
}) => {
  const { t } = useLanguage();

  const unverifiedBlock =
    unverified.length > 0 || focusUnverified ? (
      <View style={styles.unverified} testID="atlas-unverified">
        <Text style={styles.unverifiedTitle} testID="atlas-unverified-title">
          {t('atlas.unverifiedTitle', { count: unverified.length })}
        </Text>
        <Text style={styles.unverifiedBody}>{t('atlas.unverifiedBody')}</Text>
        {unverified.map((row) => (
          <AtlasSpeciesCard key={row.species.id} row={row} onPress={onSelectSpecies} />
        ))}
      </View>
    ) : null;

  return (
    <View testID="atlas-results">
      {focusUnverified ? unverifiedBlock : null}
      {matches.length > 0 ? (
        <View testID="atlas-matches">
          {matches.map((row) => (
            <AtlasSpeciesCard key={row.species.id} row={row} onPress={onSelectSpecies} />
          ))}
        </View>
      ) : (
        <Text style={styles.matchNote} testID="atlas-no-matches">
          {t('atlas.emptyDesc')}
        </Text>
      )}
      {focusUnverified ? null : unverifiedBlock}
    </View>
  );
};

const styles = StyleSheet.create({
  matchNote: {
    marginBottom: 12,
    color: colors.slate600,
    fontSize: 13,
    lineHeight: 18,
  },
  unverified: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.orange300,
  },
  unverifiedTitle: {
    marginBottom: 4,
    color: colors.orange900,
    fontSize: 14,
    fontWeight: '800',
  },
  unverifiedBody: warningNoticeBox,
});
