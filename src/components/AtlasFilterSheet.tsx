import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ATLAS_PANEL_GROUPS } from '../data/atlasFilterModel';
import { AtlasFilterChipList } from './AtlasFilterChip';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  chipIds: ReadonlySet<string>;
  resultCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const AtlasFilterSheet: React.FC<Props> = ({
  visible,
  chipIds,
  resultCount,
  onToggle,
  onClear,
  onClose,
}) => {
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  const groupsScrollStyle = { maxHeight: Math.max(160, Math.min(280, Math.round(height * 0.34))) };
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal} testID="atlas-filter-sheet" accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('atlas.filters.close')}
          testID="atlas-filter-backdrop"
        />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {t('atlas.filters.sheetTitle')}
          </Text>
          <View style={styles.footer}>
            <TouchableOpacity
              testID="atlas-filter-clear"
              accessibilityRole="button"
              accessibilityLabel={t('atlas.filters.clear')}
              style={styles.clearButton}
              onPress={onClear}
            >
              <Text style={styles.clearText}>{t('atlas.filters.clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="atlas-filter-show"
              accessibilityRole="button"
              accessibilityLabel={t('atlas.filters.showA11y', { count: resultCount })}
              style={styles.showButton}
              onPress={onClose}
            >
              <Text style={styles.showText}>{t('atlas.filters.show', { count: resultCount })}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={groupsScrollStyle}
            contentContainerStyle={styles.groups}
            testID="atlas-filter-sheet-groups"
          >
            {ATLAS_PANEL_GROUPS.map((group) => (
              <View key={group.id} style={styles.group} testID={`filter-group-${group.id}`}>
                <Text style={styles.groupLabel}>{t(group.label)}</Text>
                <View style={styles.chips}>
                  <AtlasFilterChipList chips={group.chips} chipIds={chipIds} onToggle={onToggle} />
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: spacing.md,
  },
  title: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '800',
    color: colors.slate900,
  },
  groups: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    zIndex: 2,
    flexShrink: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  clearButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate700,
  },
  showButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  showText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
});
