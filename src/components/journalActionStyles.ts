import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

/** Compact text button shared by the journal card and its recognition summary. */
export const journalActionStyles = StyleSheet.create({
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: '600',
  },
});

export const journalSummaryStyles = StyleSheet.create({
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
});
