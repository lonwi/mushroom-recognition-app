import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { AtlasScreen } from './src/screens/AtlasScreen';
import { SpeciesDetailScreen } from './src/screens/SpeciesDetailScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { SafetyGuideScreen } from './src/screens/SafetyGuideScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PreparationGuideScreen } from './src/screens/PreparationGuideScreen';
import { SafetyDisclaimerModal } from './src/components/SafetyDisclaimerModal';
import { ScreenErrorBoundary } from './src/components/ScreenErrorBoundary';
import { BottomNavigationBar } from './src/components/BottomNavigationBar';
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
import {
  NavigationProvider,
  type NavigationContextValue,
} from './src/navigation/NavigationContext';

import { PaperProvider } from 'react-native-paper';
import { paperTheme } from './src/theme/paperTheme';
import { colors, radius, spacing, typography } from './src/theme/tokens';

type Tab = ShellTab;

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
  const route = visibleRoute(stack);
  const contentKey =
    route.kind === 'species'
      ? `${activeTab}:species:${route.speciesId}`
      : `${activeTab}:${route.kind}`;
  const screens = shellScreens(stack, {
    journalRefreshSignal,
    onOpenAtlasSpecies: handleOpenAtlasSpecies,
    onBack: () => setSelectedSpecies(null),
    onOpenPreparation: () => setActiveTab('PREPARATION'),
    onSavedToJournal: () => setJournalRefreshSignal((value) => value + 1),
    onShowDisclaimer: () => setDisclaimerVisible(true),
  });

  const navValue: NavigationContextValue = {
    stack,
    activeScreen: activeTab,
    currentTab: stack.tab,
    visibleRoute: route,
    goToTab: setActiveTab,
    openSpecies: handleOpenAtlasSpecies,
    openPreparation: () => setActiveTab('PREPARATION'),
    openSettings: () => setActiveTab('SETTINGS'),
    goBack: () => setSelectedSpecies(null),
  };

  return (
    <NavigationProvider value={navValue}>
      {/* Top, bottom, and side insets are applied once, here. Tab screens sit in
          `content`, between the header and the tab bar, and must not add them again. */}
      <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
        {/* @ts-expect-error backgroundColor is a valid runtime prop missing from RN types */}
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
          <View style={styles.headerRight}>
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>{t('app.offline')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveTab('SETTINGS')}
              style={styles.settingsHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel={t('nav.settings')}
              testID="nav-settings-header"
            >
              <Text style={styles.settingsIcon} importantForAccessibility="no">
                ⚙️
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <ScreenErrorBoundary resetKey={contentKey}>{screens[activeTab]}</ScreenErrorBoundary>
        </View>

        <BottomNavigationBar activeTab={activeTab} onSelectTab={setActiveTab} />

        <SafetyDisclaimerModal visible={disclaimerVisible} onAccept={handleAcceptDisclaimer} />
      </SafeAreaView>
    </NavigationProvider>
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
    position: 'relative',
    zIndex: 100,
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
    color: colors.emerald50,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsHeaderBtn: {
    marginLeft: spacing.md,
  },
  settingsIcon: {
    fontSize: 20,
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
    color: colors.onPrimary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
