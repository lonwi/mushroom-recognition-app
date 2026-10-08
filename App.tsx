import React, { useState, useEffect } from 'react';
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
import { MushroomSpecies } from './src/types/mushroom';
import { getSpecies } from './src/data/speciesCatalog';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';

import { PaperProvider } from 'react-native-paper';
import { paperTheme } from './src/theme/paperTheme';
import { colors, radius, spacing, typography } from './src/theme/tokens';

type Tab = 'SCANNER' | 'ATLAS' | 'JOURNAL' | 'SAFETY' | 'PREPARATION' | 'SETTINGS';

const TAB_BAR: ReadonlyArray<{ id: Tab; icon: string; labelKey: string; resetAtlas?: boolean }> = [
  { id: 'SCANNER', icon: '📷', labelKey: 'nav.scanner' },
  { id: 'ATLAS', icon: '📖', labelKey: 'nav.atlas', resetAtlas: true },
  { id: 'JOURNAL', icon: '🧺', labelKey: 'nav.journal' },
  { id: 'SAFETY', icon: '🛡', labelKey: 'nav.safety' },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('SCANNER');
  const [selectedSpecies, setSelectedSpecies] = useState<MushroomSpecies | null>(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const checkDisclaimer = async () => {
      const accepted = await settingsStore.hasAcceptedDisclaimer();
      if (!accepted) {
        setDisclaimerVisible(true);
      }
    };
    checkDisclaimer();
  }, []);

  const handleAcceptDisclaimer = async () => {
    await settingsStore.setAcceptedDisclaimer(true);
    setDisclaimerVisible(false);
  };

  const handleOpenAtlasSpecies = (speciesId: string) => {
    const match = getSpecies(speciesId);
    if (match) {
      setSelectedSpecies(match);
      setActiveTab('ATLAS');
    }
  };

  const handleSavedToJournal = () => {
    setJournalRefreshKey((prev) => prev + 1);
  };

  const screens: Record<Tab, React.ReactNode> = {
    SCANNER: (
      <ScannerScreen
        onOpenAtlasSpecies={handleOpenAtlasSpecies}
        onSavedToJournal={handleSavedToJournal}
      />
    ),
    ATLAS: selectedSpecies ? (
      <SpeciesDetailScreen
        species={selectedSpecies}
        onBack={() => setSelectedSpecies(null)}
        onOpenLookAlike={handleOpenAtlasSpecies}
      />
    ) : (
      <AtlasScreen onSelectSpecies={(species) => setSelectedSpecies(species)} />
    ),
    JOURNAL: (
      <JournalScreen
        key={journalRefreshKey}
        onOpenAtlasSpecies={handleOpenAtlasSpecies}
      />
    ),
    SAFETY: (
      <SafetyGuideScreen
        onShowDisclaimer={() => setDisclaimerVisible(true)}
        onOpenPreparation={() => setActiveTab('PREPARATION')}
      />
    ),
    PREPARATION: <PreparationGuideScreen />,
    SETTINGS: <SettingsScreen />,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🍄</Text>
          <View>
            <Text style={styles.brandTitle}>{t('app.title')}</Text>
            <Text style={styles.brandSubtitle}>{t('app.subtitle')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.offlinePill}>
            <Text style={styles.offlinePillText}>{t('app.offline')}</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={{ marginLeft: 12 }}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
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
              onPress={() => {
                if (tab.resetAtlas) setSelectedSpecies(null);
                setActiveTab(tab.id);
              }}
              activeOpacity={0.7}
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
    color: colors.emerald200,
    fontWeight: '600',
  },
  offlinePill: {
    backgroundColor: colors.emerald950,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.emerald600,
  },
  offlinePillText: {
    color: colors.emerald300,
    fontSize: 10,
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
