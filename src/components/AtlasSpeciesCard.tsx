import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AtlasRow } from '../data/atlasFilterModel';
import { hasFatalLookAlikeRisk } from '../data/mushrooms';
import { SpeciesStatusBadge } from './EdibilityBadge';
import { useLanguage } from '../contexts/LanguageContext';
import { HYMENOPHORE_META } from '../presentation/speciesMeta';
import { getMushroomImage } from '../utils/mushroomImages';
import { colors, spacing } from '../theme/tokens';

/** Android's default breaker splits narrow titles mid-word ("Much" / "omor"). */
const unbrokenWords = {
  textBreakStrategy: 'simple',
  android_hyphenationFrequency: 'none',
} as const;

interface Props {
  row: AtlasRow;
  onPress: (species: AtlasRow['species']) => void;
}

export const AtlasSpeciesCard: React.FC<Props> = ({ row, onPress }) => {
  const { t } = useLanguage();
  const item = row.species;
  const hymenophoreLabel = t(HYMENOPHORE_META[item.hymenophore].labelKey);
  const monthsStr = t('atlas.monthRange', {
    start: item.months[0],
    end: item.months[item.months.length - 1],
  });
  const photo = getMushroomImage(item.id);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      testID={`atlas-card-${item.id}`}
    >
      <View style={styles.cardMainRow}>
        {photo ? (
          <Image
            source={photo}
            style={styles.cardThumbnail}
            resizeMode="cover"
            testID={`atlas-photo-${item.id}`}
          />
        ) : (
          <View style={[styles.cardThumbnail, styles.cardThumbnailMissing]} testID={`atlas-photo-missing-${item.id}`}>
            <Text style={styles.cardThumbnailMissingText}>{t('cards.photoMissing')}</Text>
          </View>
        )}
        <View style={styles.cardDetails} testID={`atlas-card-copy-${item.id}`}>
          <Text style={styles.namePl} testID={`atlas-name-pl-${item.id}`} {...unbrokenWords}>
            {item.namePl}
          </Text>
          {item.nameEn ? (
            <Text style={styles.nameEn} {...unbrokenWords}>
              {item.nameEn}
            </Text>
          ) : null}
          <Text style={styles.nameLatin} testID={`atlas-name-latin-${item.id}`} {...unbrokenWords}>
            {item.nameLatin}
          </Text>
          <View style={styles.cardBadge} testID={`atlas-card-badge-${item.id}`}>
            <SpeciesStatusBadge
              status={item.status}
              incompleteCard={item.incompleteCard}
              size="small"
              testID={`incomplete-card-badge-${item.id}`}
            />
          </View>
          {row.conditionalEdible ? (
            <Text style={styles.condition} testID={`atlas-condition-${item.id}`}>
              {t('atlas.conditionalEdible')}
            </Text>
          ) : null}
          {row.psychoactive ? (
            <Text style={styles.psychoactive} testID={`atlas-psychoactive-${item.id}`}>
              {t('atlas.psychoactive')}
            </Text>
          ) : null}
          {item.commonNicknames.length > 0 ? (
            <Text style={styles.nicknames} numberOfLines={1}>
              {t('atlas.colloquial', { names: item.commonNicknames.join(', ') })}
            </Text>
          ) : (
            <View style={styles.nicknamesSpacer} />
          )}
          <View style={styles.cardFooter}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>🍄 {hymenophoreLabel}</Text>
            </View>
            {item.months.length > 0 ? (
              <View style={styles.tag}>
                <Text style={styles.tagText} testID={`atlas-months-${item.id}`}>{`📅 ${monthsStr}`}</Text>
              </View>
            ) : null}
            {hasFatalLookAlikeRisk(item) ? (
              <View style={[styles.tag, styles.tagDanger]}>
                <Text style={styles.tagDangerText}>{t('atlas.lookAlikeTag')}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const nameAlign = { alignSelf: 'stretch' } as const;

const flag = {
  alignSelf: 'flex-start',
  marginBottom: spacing.xs,
  borderWidth: 1,
  borderRadius: 6,
  paddingVertical: 3,
  paddingHorizontal: 8,
  fontSize: 11,
  fontWeight: '700',
} as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.slate200,
    marginRight: 12,
  },
  cardThumbnailMissing: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardThumbnailMissingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate500,
    textAlign: 'center',
  },
  cardDetails: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  cardBadge: {
    alignSelf: flag.alignSelf,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  condition: {
    ...flag,
    backgroundColor: colors.amberMaterialBg,
    color: colors.amber900,
    borderColor: colors.amber700,
  },
  psychoactive: {
    ...flag,
    backgroundColor: colors.poisonousBg,
    color: colors.poisonous,
    borderColor: colors.poisonousBorder,
  },
  namePl: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
    ...nameAlign,
  },
  nameEn: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 1,
    ...nameAlign,
  },
  nameLatin: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.slate500,
    marginTop: 1,
    ...nameAlign,
  },
  nicknames: {
    fontSize: 12,
    color: colors.slate400,
    marginBottom: 10,
  },
  nicknamesSpacer: {
    height: 12,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.surfaceVariant,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.slate600,
    fontWeight: '600',
  },
  tagDanger: {
    backgroundColor: colors.red100,
  },
  tagDangerText: {
    color: colors.red600,
    fontSize: 11,
    fontWeight: '700',
  },
});
