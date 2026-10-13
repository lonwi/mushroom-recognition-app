import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

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
