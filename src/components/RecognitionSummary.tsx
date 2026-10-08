import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { getSpecies } from '../data/speciesCatalog';
import { formatConfidencePercent } from '../services/recognitionDecision';
import { colors, radius, spacing } from '../theme/tokens';

type RejectedReason = 'not_a_mushroom' | 'unknown_mushroom' | 'unclear';

export type RecognitionCandidate = {
  id: string;
  namePl: string;
  nameLatin: string;
  confidence: number;
  rank: number;
};

/**
 * Shared scan outcome. Extra fields on a classification result (photo uri, genus)
 * are ignored. `legacy` exists only on journal rows.
 */
export type RecognitionSummaryData =
  | { status: 'unavailable' }
  | { status: 'rejected'; reason: RejectedReason }
  | {
      status: 'candidates';
      top3: ReadonlyArray<RecognitionCandidate>;
      expertVerificationRequired: boolean;
      warningReasons: ReadonlyArray<'dangerous_genus' | 'low_confidence'>;
    }
  | {
      status: 'legacy';
      speciesId?: string;
      speciesNamePl?: string;
      speciesNameLatin?: string;
      confidence?: number;
    };

const MODAL_REJECTED_CHROME = {
  unknown_mushroom: { titleKey: 'scanner.unknownMushroomTitle', testID: 'recognition-unknown-title' },
  unclear: { titleKey: 'scanner.rejectedTitle', testID: 'recognition-rejected-title' },
  not_a_mushroom: { titleKey: 'scanner.rejectedTitle', testID: 'recognition-rejected-title' },
} as const satisfies Record<RejectedReason, { titleKey: string; testID: string }>;

const REJECTED_BODY_KEY = {
  unknown_mushroom: 'scanner.unknownMushroomBody',
  unclear: 'scanner.rejectedUnclear',
  not_a_mushroom: 'scanner.rejectedNotMushroom',
} as const satisfies Record<RejectedReason, string>;

export function modalRecognitionChrome(
  recognition: Exclude<RecognitionSummaryData, { status: 'legacy' }>,
): { titleKey: string; testID: string } {
  if (recognition.status === 'unavailable') {
    return { titleKey: 'scanner.recognitionUnavailableTitle', testID: 'recognition-unavailable-title' };
  }
  if (recognition.status === 'rejected') {
    return MODAL_REJECTED_CHROME[recognition.reason];
  }
  return { titleKey: 'scanner.candidatesTitle', testID: 'recognition-candidates-title' };
}

type Props = {
  recognition: RecognitionSummaryData;
  onOpenAtlasSpecies?: (speciesId: string) => void;
} & ({ variant: 'modal' } | { variant: 'journal'; entryId: string });

export const RecognitionSummary: React.FC<Props> = (props) => {
  const { t, language } = useLanguage();
  const { recognition, onOpenAtlasSpecies } = props;

  if (recognition.status === 'legacy') {
    if (props.variant !== 'journal') return null;
    const entryId = props.entryId;
    return (
      <View>
        <Text style={journalStyles.legacyBanner} testID={`journal-legacy-${entryId}`}>
          {t('journal.legacyBanner')}
        </Text>
        <Text style={journalStyles.speciesNamePl} testID={`journal-title-${entryId}`}>
          {t('journal.legacyTitle')}
        </Text>
        {recognition.speciesNamePl || recognition.speciesNameLatin ? (
          <View>
            <Text style={journalStyles.honestBody} testID={`journal-legacy-name-${entryId}`}>
              {t('journal.legacyStoredName')}: {recognition.speciesNamePl ?? recognition.speciesNameLatin}
              {recognition.speciesNamePl && recognition.speciesNameLatin
                ? ` (${recognition.speciesNameLatin})`
                : ''}
            </Text>
            <Text style={journalStyles.honestBody} testID={`journal-legacy-name-notice-${entryId}`}>
              {t('journal.legacyNameNotice')}
            </Text>
          </View>
        ) : null}
        <Text style={journalStyles.warningText} testID={`journal-legacy-edibility-${entryId}`}>
          {t('journal.legacyEdibility')}
        </Text>
      </View>
    );
  }

  if (recognition.status === 'unavailable') {
    if (props.variant === 'modal') {
      return (
        <View style={modalStyles.resultCard}>
          <Text style={modalStyles.heading} testID="recognition-unavailable-body">
            {t('scanner.recognitionUnavailableBody')}
          </Text>
          <Text style={modalStyles.note}>{t('scanner.recognitionUnavailableNote')}</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={journalStyles.speciesNamePl} testID={`journal-title-${props.entryId}`}>
          {t('journal.unavailableTitle')}
        </Text>
        <Text style={journalStyles.honestBody}>{t('scanner.recognitionUnavailableNote')}</Text>
      </View>
    );
  }

  if (recognition.status === 'rejected') {
    const body = t(REJECTED_BODY_KEY[recognition.reason]);
    if (props.variant === 'modal') {
      if (recognition.reason === 'unknown_mushroom') {
        return (
          <View style={modalStyles.resultCard}>
            <Text style={modalStyles.heading} testID="recognition-unknown-body">
              {body}
            </Text>
            <Text style={modalStyles.expertBody} testID="recognition-unknown-deadly">
              {t('scanner.unknownMushroomDeadly')}
            </Text>
            <Text style={modalStyles.note} testID="recognition-unknown-verify">
              {t('scanner.rejectedVerify')}
            </Text>
          </View>
        );
      }
      return (
        <View style={modalStyles.resultCard}>
          <Text style={modalStyles.heading} testID="recognition-rejected-body">
            {body}
          </Text>
          <Text style={modalStyles.note}>{t('scanner.rejectedVerify')}</Text>
        </View>
      );
    }

    const entryId = props.entryId;
    if (recognition.reason === 'unknown_mushroom') {
      return (
        <View>
          <Text style={journalStyles.speciesNamePl} testID={`journal-title-${entryId}`}>
            {t('journal.unknownMushroomTitle')}
          </Text>
          <Text style={journalStyles.honestBody} testID={`journal-unknown-${entryId}`}>
            {body}
          </Text>
          <Text style={journalStyles.warningText} testID={`journal-unknown-deadly-${entryId}`}>
            {t('scanner.unknownMushroomDeadly')}
          </Text>
          <Text style={journalStyles.honestBody} testID={`journal-unknown-verify-${entryId}`}>
            {t('scanner.rejectedVerify')}
          </Text>
        </View>
      );
    }
    const titleKey = recognition.reason === 'unclear' ? 'journal.unclearTitle' : 'journal.notMushroomTitle';
    return (
      <View>
        <Text style={journalStyles.speciesNamePl} testID={`journal-title-${entryId}`}>
          {t(titleKey)}
        </Text>
        <Text style={journalStyles.honestBody}>{body}</Text>
      </View>
    );
  }

  const primary = recognition.top3[0];
  if (props.variant === 'journal') {
    const entryId = props.entryId;
    const primaryCard = primary ? getSpecies(primary.id) : undefined;
    return (
      <View>
        <Text style={journalStyles.speciesNamePl} testID={`journal-title-${entryId}`}>
          {t('journal.candidatesTitle')}
        </Text>
        <Text style={journalStyles.honestBody}>{t('scanner.candidatesLead')}</Text>
        <Text style={journalStyles.honestBody} testID={`journal-not-edible-${entryId}`}>
          {t('scanner.notEdibilityVerdict')}
        </Text>
        {recognition.expertVerificationRequired ? (
          <Text style={journalStyles.warningText} testID={`journal-expert-${entryId}`}>
            {t('scanner.expertWarningBody')}
          </Text>
        ) : null}
        {recognition.warningReasons.includes('dangerous_genus') ? (
          <Text style={journalStyles.warningText}>{t('scanner.dangerousGenusWarning')}</Text>
        ) : null}
        {recognition.warningReasons.includes('low_confidence') ? (
          <Text style={journalStyles.warningText} testID={`journal-low-confidence-${entryId}`}>
            {t('scanner.lowConfidenceWarning')}
          </Text>
        ) : null}
        {recognition.top3.map((candidate) => (
          <Text
            key={`${entryId}-${candidate.rank}-${candidate.id}`}
            style={journalStyles.candidateText}
            testID={`journal-candidate-${entryId}-${candidate.rank}`}
          >
            {candidate.rank}. {candidate.namePl} · {t('journal.confidence')}:{' '}
            {formatConfidencePercent(candidate.confidence)}
          </Text>
        ))}
        {primary && primaryCard && onOpenAtlasSpecies ? (
          <TouchableOpacity
            style={journalStyles.actionBtn}
            onPress={() => onOpenAtlasSpecies(primary.id)}
            testID={`journal-open-candidate-${entryId}`}
          >
            <Text style={journalStyles.actionBtnText}>
              {t('journal.openCandidate')}: {primary.namePl}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {recognition.expertVerificationRequired ? (
        <View style={modalStyles.expertBanner} testID="expert-verification-banner">
          <Text style={modalStyles.expertTitle}>{t('scanner.expertWarningTitle')}</Text>
          <Text style={modalStyles.expertBody}>{t('scanner.expertWarningBody')}</Text>
          {recognition.warningReasons.includes('dangerous_genus') ? (
            <Text style={modalStyles.expertDetail} testID="dangerous-genus-warning">
              {t('scanner.dangerousGenusWarning')}
            </Text>
          ) : null}
          {recognition.warningReasons.includes('low_confidence') ? (
            <Text style={modalStyles.expertDetail} testID="low-confidence-warning">
              {t('scanner.lowConfidenceWarning')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={modalStyles.resultCard}>
        <Text style={modalStyles.heading}>{t('scanner.candidatesLead')}</Text>
        <Text style={modalStyles.note} testID="not-edibility-verdict">
          {t('scanner.notEdibilityVerdict')}
        </Text>
        {recognition.top3.some((candidate) => candidate.id === 'morchella_esculenta') ? (
          <View style={modalStyles.morelBanner} testID="morel-protection-notice">
            <Text style={modalStyles.morelBannerTitle}>{t('cards.morelProtectionTitle')}</Text>
            <Text style={modalStyles.morelBannerBody}>{t('cards.morelProtectionBody')}</Text>
          </View>
        ) : null}
        {recognition.top3.map((candidate) => {
          const card = getSpecies(candidate.id);
          return (
            <View key={`${candidate.rank}-${candidate.id}`} style={modalStyles.candidate} testID={`candidate-rank-${candidate.rank}`}>
              <Text style={modalStyles.candidateRank}>
                {candidate.rank}. {candidate.namePl}
              </Text>
              {language === 'en' && card?.nameEn ? (
                <Text style={modalStyles.candidateLatin} testID={`candidate-name-en-${candidate.rank}`}>
                  {card.nameEn}
                </Text>
              ) : null}
              <Text style={modalStyles.candidateLatin}>{candidate.nameLatin}</Text>
              <Text style={modalStyles.candidateConfidence} testID={`candidate-confidence-${candidate.rank}`}>
                {t('scanner.confidence')}: {formatConfidencePercent(candidate.confidence)}
              </Text>
              {card && onOpenAtlasSpecies ? (
                <TouchableOpacity
                  onPress={() => onOpenAtlasSpecies(candidate.id)}
                  style={modalStyles.atlasBtn}
                  testID={`open-atlas-${candidate.id}`}
                >
                  <Text style={modalStyles.atlasBtnText}>{t('scanner.openAtlas')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slate900,
    lineHeight: 22,
    marginBottom: 10,
  },
  note: {
    fontSize: 14,
    color: colors.slate700,
    lineHeight: 20,
  },
  expertBanner: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red600,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  expertTitle: {
    color: colors.red800,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  expertBody: {
    color: colors.red900,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  expertDetail: {
    color: colors.red900,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  morelBanner: {
    marginBottom: spacing.md,
    backgroundColor: colors.amber50,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  morelBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.amber800,
    marginBottom: 6,
  },
  morelBannerBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.amber900,
  },
  candidate: {
    marginTop: 14,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
  },
  candidateRank: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  candidateLatin: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.slate600,
    marginTop: spacing.xxs,
  },
  candidateConfidence: {
    fontSize: 14,
    color: colors.slate800,
    marginTop: spacing.xs,
  },
  atlasBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.edibleBg,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  atlasBtnText: {
    color: colors.green950,
    fontWeight: '700',
    fontSize: 13,
  },
});

const journalStyles = StyleSheet.create({
  speciesNamePl: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.slate900,
  },
  legacyBanner: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange900,
    backgroundColor: colors.orange100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: 6,
    lineHeight: 17,
  },
  honestBody: {
    fontSize: 12,
    color: colors.slate700,
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  warningText: {
    fontSize: 12,
    color: colors.red800,
    fontWeight: '700',
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  candidateText: {
    fontSize: 12,
    color: colors.slate900,
    marginTop: spacing.xs,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: '600',
  },
});
