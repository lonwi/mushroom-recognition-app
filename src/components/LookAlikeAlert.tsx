import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ConfusionRisk, EdibilityStatus } from '../types/mushroom';
import { MissingCardBadge, SpeciesStatusBadge } from './EdibilityBadge';
import {
  ATLAS_NO_VERDICT_NOTE,
  isIncompleteSpeciesCard,
  LOOKALIKES_WITHOUT_CARD,
  MUSHROOM_IDS,
  NOT_FOR_COLLECTION_NOTE,
} from '../data/mushrooms';
import { useLanguage } from '../contexts/LanguageContext';
import { pl } from '../i18n/pl';
import { colors } from '../theme/tokens';

interface Props {
  risks: ConfusionRisk[];
  /**
   * Shown only when the list is empty AND this is a deliberate sourced statement.
   * A missing or blank value never means "no dangerous look-alikes".
   */
  noDangerousLookAlikesSource?: string;
  /** Ids that have an atlas card. Unknown ids are named without a link. */
  catalogIds?: ReadonlySet<string>;
  /** Status of the open card. A deadly card keeps the red warning even when every named twin is edible. */
  ownStatus?: EdibilityStatus;
  onOpenSpecies?: (speciesId: string) => void;
}

export const INCOMPLETE_LOOKALIKE_TITLE = pl.lookalike.incompleteTitle;
export const INCOMPLETE_LOOKALIKE_BODY = pl.lookalike.incompleteBody;

export const LookAlikeAlert: React.FC<Props> = ({
  risks,
  noDangerousLookAlikesSource,
  catalogIds,
  ownStatus,
  onOpenSpecies,
}) => {
  const { t } = useLanguage();
  const list = risks ?? [];
  const source = noDangerousLookAlikesSource?.trim() ?? '';
  const noteFor = (note: string) => {
    if (note === ATLAS_NO_VERDICT_NOTE) return t('lookalike.noVerdict');
    if (note === NOT_FOR_COLLECTION_NOTE) return t('lookalike.notForCollection');
    return note;
  };

  if (list.length === 0) {
    if (source) {
      return (
        <View style={styles.sourcedContainer} testID="lookalike-sourced-clearance">
          <Text style={styles.sourcedTitle}>{t('lookalike.sourcedTitle')}</Text>
          <Text style={styles.sourcedDesc}>
            {t('lookalike.sourcedBody', { source })}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.incompleteContainer} testID="lookalike-incomplete">
        <Text style={styles.incompleteTitle}>{t('lookalike.incompleteTitle')}</Text>
        <Text style={styles.incompleteDesc}>{t('lookalike.incompleteBody')}</Text>
      </View>
    );
  }

  const hasFatal = list.some((r) => r.fatal) || ownStatus === 'DEADLY_POISONOUS';

  return (
    <View style={[styles.container, hasFatal ? styles.fatalBorder : styles.warningBorder]}>
      <View style={styles.headerRow}>
        <Text style={styles.headerIcon}>{hasFatal ? '☠' : '⚠'}</Text>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerTitle, hasFatal && styles.fatalTitle]}>
            {hasFatal ? t('lookalike.fatalTitle') : t('lookalike.warningTitle')}
          </Text>
          <Text style={styles.headerSubtitle}>{t('lookalike.subtitle')}</Text>
        </View>
      </View>

      {list.map((risk, idx) => {
        const inCatalog =
          catalogIds != null
            ? catalogIds.has(risk.confusedWithId)
            : MUSHROOM_IDS.has(risk.confusedWithId);
        const canOpen = catalogIds?.has(risk.confusedWithId) === true && !!onOpenSpecies;
        const unfinishedEdible =
          inCatalog &&
          risk.confusedWithStatus === 'EDIBLE' &&
          isIncompleteSpeciesCard(risk.confusedWithId);
        const withoutCard = LOOKALIKES_WITHOUT_CARD[risk.confusedWithId];
        const verdict = risk.confusedWithStatus;
        const showStatus =
          verdict !== 'NO_ATLAS_VERDICT' &&
          (inCatalog || (withoutCard != null && withoutCard.status !== 'NO_ATLAS_VERDICT'));
        return (
          <View key={`${risk.confusedWithId}-${idx}`} style={styles.riskCard}>
            <View style={styles.riskTop}>
              <Text style={styles.riskName}>
                {t('lookalike.confusedWith', { name: risk.confusedWithName })}
              </Text>
              <View testID={`lookalike-status-${risk.confusedWithId}`}>
                {showStatus ? (
                  <SpeciesStatusBadge
                    status={verdict}
                    incompleteCard={unfinishedEdible}
                    size="small"
                    testID={`incomplete-card-badge-${risk.confusedWithId}`}
                  />
                ) : (
                  <MissingCardBadge size="small" testID={`missing-card-badge-${risk.confusedWithId}`} />
                )}
              </View>
            </View>
            {canOpen ? (
              <TouchableOpacity
                onPress={() => onOpenSpecies?.(risk.confusedWithId)}
                testID={`lookalike-link-${risk.confusedWithId}`}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>{t('lookalike.openCard')}</Text>
              </TouchableOpacity>
            ) : null}
            {!inCatalog ? (
              <Text style={styles.unlinkedNote} testID={`lookalike-unlinked-${risk.confusedWithId}`}>
                {t('lookalike.unlinked')}
                {withoutCard ? ` ${noteFor(withoutCard.note)}.` : ''}
              </Text>
            ) : null}
            <View style={styles.differencesBox}>
              <Text style={styles.diffLabel}>{t('lookalike.differences')}</Text>
              {risk.keyDifferences.map((diff, dIdx) => (
                <View key={dIdx} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{diff}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    backgroundColor: colors.white,
  },
  warningBorder: {
    borderWidth: 1.5,
    borderColor: colors.amberMaterial,
    backgroundColor: colors.amberMaterialBgLight,
  },
  fatalBorder: {
    borderWidth: 2,
    borderColor: colors.redMaterial,
    backgroundColor: colors.poisonousBg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.orangeDeep,
  },
  fatalTitle: {
    color: colors.redDeep,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.gray555,
    marginTop: 2,
  },
  riskCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  riskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  riskName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray900,
    flex: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  unlinkedNote: {
    fontSize: 12,
    color: colors.brown600,
    fontWeight: '600',
    marginBottom: 8,
  },
  differencesBox: {
    marginTop: 4,
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    color: colors.redMaterial,
    fontSize: 14,
    lineHeight: 18,
    marginRight: 6,
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 12,
    color: colors.gray333,
    flex: 1,
    lineHeight: 17,
  },
  incompleteContainer: {
    backgroundColor: colors.amberMaterialBg,
    borderColor: colors.amberMaterialLight,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  incompleteTitle: {
    color: colors.inedible,
    fontWeight: '800',
    fontSize: 14,
  },
  incompleteDesc: {
    color: colors.brown600,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sourcedContainer: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.slate500,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  sourcedTitle: {
    color: colors.slate800,
    fontWeight: '800',
    fontSize: 14,
  },
  sourcedDesc: {
    color: colors.slate700,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
});
