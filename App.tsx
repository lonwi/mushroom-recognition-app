import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { AtlasScreen } from './src/screens/AtlasScreen';
import { SpeciesDetailScreen } from './src/screens/SpeciesDetailScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { SafetyGuideScreen } from './src/screens/SafetyGuideScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PreparationGuideScreen } from './src/screens/PreparationGuideScreen';
import { SafetyDisclaimerModal } from './src/components/SafetyDisclaimerModal';
import { settingsStore } from './src/services/storage/settingsStore';
import { getSpecies } from './src/data/speciesCatalog';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { useHardwareBack } from './src/navigation/hardwareBack';
import {
  activateShellTab,
  applyHardwareBack,
  initialViewStack,
  selectSpecies,
  shellScreen,
  visibleRoute,
  type ShellTab,
  type ViewStack,
} from './src/navigation/viewStack';

import { PaperProvider } from 'react-native-paper';
import { paperTheme } from './src/theme/paperTheme';
import { colors, radius, spacing, typography } from './src/theme/tokens';

type Tab = ShellTab;

const TAB_BAR: ReadonlyArray<{ id: Tab; icon: string; labelKey: string }> = [
  { id: 'SCANNER', icon: '📷', labelKey: 'nav.scanner' },
  { id: 'ATLAS', icon: '📖', labelKey: 'nav.atlas' },
  { id: 'JOURNAL', icon: '🧺', labelKey: 'nav.journal' },
  { id: 'SAFETY', icon: '🛡', labelKey: 'nav.safety' },
];

interface ShellHandlers {
  journalRefreshSignal: number;
  onOpenAtlasSpecies: (speciesId: string) => void;
  onBack: () => void;
  onOpenPreparation: () => void;
  onSavedToJournal: () => void;
  onShowDisclaimer: () => void;
}

function shellScreens(stack: ViewStack, handlers: ShellHandlers): Record<Tab, React.ReactNode> {
  const route = visibleRoute(stack);
  const species = route.kind === 'species' ? getSpecies(route.speciesId) : undefined;
  const speciesCard = species ? (
    <SpeciesDetailScreen
      key={species.id}
      species={species}
      onBack={handlers.onBack}
      onOpenLookAlike={handlers.onOpenAtlasSpecies}
    />
  ) : null;
  return {
    SCANNER: speciesCard ?? (
      <ScannerScreen
        onOpenAtlasSpecies={handlers.onOpenAtlasSpecies}
        onSavedToJournal={handlers.onSavedToJournal}
      />
    ),
    ATLAS: speciesCard ?? (
      <AtlasScreen onSelectSpecies={(item) => handlers.onOpenAtlasSpecies(item.id)} />
    ),
    JOURNAL: speciesCard ?? (
      <JournalScreen
        refreshSignal={handlers.journalRefreshSignal}
        onOpenAtlasSpecies={handlers.onOpenAtlasSpecies}
      />
    ),
    SAFETY: speciesCard ?? (
      <SafetyGuideScreen
        onShowDisclaimer={handlers.onShowDisclaimer}
        onOpenPreparation={handlers.onOpenPreparation}
      />
    ),
    PREPARATION: <PreparationGuideScreen />,
    SETTINGS: <SettingsScreen />,
  };
}

function AppContent() {
  const [stack, setStack] = useState(initialViewStack);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [journalRefreshSignal, setJournalRefreshSignal] = useState(0);
  const { t } = useLanguage();
  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    const checkDisclaimer = async () => {
      const accepted = await settingsStore.hasAcceptedDisclaimer();
      if (!accepted) {
        setDisclaimerVisible(true);
      }
    };
    checkDisclaimer();
  }, []);

  // One subscription for the life of the shell. Photo credits adds its own
  // listener later and must receive the Android back press first.
  useHardwareBack(() => {
    const result = applyHardwareBack(stackRef.current);
    if (!result.handled) return false;
    setStack(result.stack);
    return true;
  });

  const handleAcceptDisclaimer = async () => {
    await settingsStore.setAcceptedDisclaimer(true);
    setDisclaimerVisible(false);
  };

  const setActiveTab = (tab: Tab) => {
    setStack((current) => activateShellTab(current, tab));
  };

  const setSelectedSpecies = (species: { id: string } | null) => {
    setStack((current) => selectSpecies(current, species?.id ?? null));
  };

  const handleOpenAtlasSpecies = (speciesId: string) => {
    const match = getSpecies(speciesId);
    if (match) setSelectedSpecies(match);
  };

  const activeTab = shellScreen(stack);
  const screens = shellScreens(stack, {
    journalRefreshSignal,
    onOpenAtlasSpecies: handleOpenAtlasSpecies,
    onBack: () => setSelectedSpecies(null),
    onOpenPreparation: () => setActiveTab('PREPARATION'),
    onSavedToJournal: () => setJournalRefreshSignal((value) => value + 1),
    onShowDisclaimer: () => setDisclaimerVisible(true),
  });

  return (
    // Top, bottom, and side insets are applied once, here. Tab screens sit in
    // `content`, between the header and the tab bar, and must not add them again.
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.brandRow}
          onPress={() => {
            setSelectedSpecies(null);
            setActiveTab('SCANNER');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('app.title')}
        >
          <Text style={styles.brandIcon} importantForAccessibility="no">
            🍄
          </Text>
          <View>
            <Text style={styles.brandTitle}>{t('app.title')}</Text>
            <Text style={styles.brandSubtitle}>{t('app.subtitle')}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>{t('app.offline')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setActiveTab('SETTINGS')}
            style={{ marginLeft: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel={t('nav.settings')}
          >
            <Text style={{ fontSize: 20 }} importantForAccessibility="no">
              ⚙️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{screens[activeTab]}</View>

      <View style={styles.bottomNav}>
        {TAB_BAR.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              testID={`nav-${tab.id}`}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
              <Text style={[styles.navText, active && styles.navTextActive]}>{t(tab.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SafetyDisclaimerModal
        visible={disclaimerVisible}
        onAccept={handleAcceptDisclaimer}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <PaperProvider theme={paperTheme}>
          <AppContent />
        </PaperProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  topHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: typography.caption,
    // emerald50 on primary is 11.76:1. 10px text needs WCAG AA 4.5:1.
    color: colors.emerald50,
    fontWeight: '600',
  },
  offlinePill: {
    backgroundColor: colors.emerald900,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.emerald600,
  },
  offlinePillText: {
    // onPrimary on emerald900 is 9.72:1.
    color: colors.onPrimary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
    justifyContent: 'space-around',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  navItemActive: {
    backgroundColor: colors.edibleBg,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
