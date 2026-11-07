import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, radius } from '../theme/tokens';
import { ShellTab } from '../navigation/viewStack';

interface NavTabItem {
  id: ShellTab;
  iconName: keyof typeof Feather.glyphMap;
  labelKey: string;
  isScanner?: boolean;
}

const TABS: ReadonlyArray<NavTabItem> = [
  { id: 'ATLAS', iconName: 'book-open', labelKey: 'nav.atlas' },
  { id: 'JOURNAL', iconName: 'file-text', labelKey: 'nav.journal' },
  { id: 'SCANNER', iconName: 'camera', labelKey: 'nav.scanner', isScanner: true },
  { id: 'SAFETY', iconName: 'shield', labelKey: 'nav.safety' },
  { id: 'SETTINGS', iconName: 'user', labelKey: 'nav.profile' },
];

interface BottomNavigationBarProps {
  activeTab: ShellTab;
  onSelectTab: (tab: ShellTab) => void;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.navBar} testID="bottom-navigation-bar">
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.isScanner) {
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.scannerTabItem}
                onPress={() => onSelectTab(tab.id)}
                activeOpacity={0.8}
                testID={`nav-${tab.id}`}
                accessibilityRole="button"
                accessibilityLabel={t(tab.labelKey)}
                accessibilityState={{ selected: isActive }}
              >
                <View style={styles.scannerCta}>
                  <Feather name={tab.iconName} size={20} color={colors.white} />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {t(tab.labelKey)}
                </Text>
                <View
                  style={[
                    styles.activeIndicator,
                    isActive && styles.activeIndicatorVisible,
                  ]}
                />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.7}
              testID={`nav-${tab.id}`}
              accessibilityRole="button"
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: isActive }}
            >
              <Feather
                name={tab.iconName}
                size={22}
                color={isActive ? colors.slate900 : colors.slate600}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t(tab.labelKey)}
              </Text>
              <View
                style={[
                  styles.activeIndicator,
                  isActive && styles.activeIndicatorVisible,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.homeIndicatorBar} />
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 4,
    paddingBottom: 4,
    zIndex: 40,
  },
  tabsRow: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  scannerTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    marginTop: -8,
  },
  scannerCta: {
    width: 48,
    height: 36,
    backgroundColor: colors.primaryGreen,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate600,
    marginTop: 4,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: colors.slate900,
  },
  activeIndicator: {
    width: 28,
    height: 2.5,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: colors.transparent,
  },
  activeIndicatorVisible: {
    backgroundColor: colors.slate900,
  },
  homeIndicatorBar: {
    width: 128,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
});
