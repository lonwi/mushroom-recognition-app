import React, { useState } from 'react';
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

interface PanelGroup {
  id: string;
  label: string;
  layout?: 'grid' | 'disclosure';
  chips: readonly { id: string; label: string }[];
}

interface Props {
  visible: boolean;
  chipIds: ReadonlySet<string>;
  visibleCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const AtlasFilterSheet: React.FC<Props> = ({
  visible,
  chipIds,
  visibleCount,
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
              accessibilityLabel={t('atlas.filters.showA11y', { count: visibleCount })}
              style={styles.showButton}
              onPress={onClose}
            >
              <Text style={styles.showText}>{t('atlas.filters.show', { count: visibleCount })}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={groupsScrollStyle}
            contentContainerStyle={styles.groups}
            testID="atlas-filter-sheet-groups"
          >
            {ATLAS_PANEL_GROUPS.map((group) => (
              <SheetGroup key={group.id} group={group} chipIds={chipIds} onToggle={onToggle} />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

function SheetGroup({
  group,
  chipIds,
  onToggle,
}: {
  group: PanelGroup;
  chipIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  if (group.layout === 'disclosure') {
    return <DisclosureGroup group={group} chipIds={chipIds} onToggle={onToggle} />;
  }
  return (
    <View style={styles.group} testID={`filter-group-${group.id}`}>
      <GroupLabel label={group.label} />
      {group.layout === 'grid' ? (
        <MonthGrid chips={group.chips} chipIds={chipIds} onToggle={onToggle} />
      ) : (
        <View style={styles.chips}>
          <AtlasFilterChipList chips={group.chips} chipIds={chipIds} onToggle={onToggle} />
        </View>
      )}
    </View>
  );
}

function DisclosureGroup({
  group,
  chipIds,
  onToggle,
}: {
  group: PanelGroup;
  chipIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group} testID={`filter-group-${group.id}`}>
      <TouchableOpacity
        testID={`filter-group-toggle-${group.id}`}
        accessibilityRole="button"
        accessibilityLabel={t(group.label)}
        accessibilityState={{ expanded: open }}
        style={styles.toggle}
        onPress={() => setOpen((current) => !current)}
      >
        <Text style={styles.groupLabel}>{t(group.label)}</Text>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.chips} testID={`filter-group-chips-${group.id}`}>
          <AtlasFilterChipList chips={group.chips} chipIds={chipIds} onToggle={onToggle} />
        </View>
      ) : null}
    </View>
  );
}

function MonthGrid({
  chips,
  chipIds,
  onToggle,
}: {
  chips: PanelGroup['chips'];
  chipIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const rows: PanelGroup['chips'][] = [];
  for (let index = 0; index < chips.length; index += 4) {
    rows.push(chips.slice(index, index + 4));
  }
  return (
    <View testID="filter-month-grid">
      {rows.map((row) => (
        <View key={row[0].id} style={styles.monthRow}>
          {row.map((chip) => (
            <View key={chip.id} style={styles.monthCell}>
              <AtlasFilterChipList chips={[chip]} chipIds={chipIds} onToggle={onToggle} fill />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function GroupLabel({ label }: { label: string }) {
  const { t } = useLanguage();
  return <Text style={styles.groupLabel}>{t(label)}</Text>;
}

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
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.slate500,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  monthCell: {
    flex: 1,
    minWidth: 0,
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
