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
import { storageService } from './src/services/storageService';
import { MushroomSpecies } from './src/types/mushroom';
import { MUSHROOMS_DATABASE } from './src/data/mushrooms';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';

import { PaperProvider } from 'react-native-paper';
import { paperTheme } from './src/theme/paperTheme';

type Tab = 'SCANNER' | 'ATLAS' | 'JOURNAL' | 'SAFETY' | 'PREPARATION' | 'SETTINGS';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('SCANNER');
  const [selectedSpecies, setSelectedSpecies] = useState<MushroomSpecies | null>(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const checkDisclaimer = async () => {
      const accepted = await storageService.hasAcceptedDisclaimer();
      if (!accepted) {
        setDisclaimerVisible(true);
      }
    };
    checkDisclaimer();
  }, []);

  const handleAcceptDisclaimer = async () => {
    await storageService.setAcceptedDisclaimer(true);
    setDisclaimerVisible(false);
  };

  const handleOpenAtlasSpecies = (speciesId: string) => {
    const match = MUSHROOMS_DATABASE.find((m) => m.id === speciesId);
    if (match) {
      setSelectedSpecies(match);
      setActiveTab('ATLAS');
    }
  };

  const handleSavedToJournal = () => {
    setJournalRefreshKey((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3B22" />

      {/* Górny Pasek Aplikacji */}
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

      {/* Zawartość Aktywnej Zakładki */}
      <View style={styles.content}>
        {activeTab === 'SCANNER' && (
          <ScannerScreen
            onOpenAtlasSpecies={handleOpenAtlasSpecies}
            onSavedToJournal={handleSavedToJournal}
          />
        )}

        {activeTab === 'ATLAS' &&
          (selectedSpecies ? (
            <SpeciesDetailScreen
              species={selectedSpecies}
              onBack={() => setSelectedSpecies(null)}
            />
          ) : (
            <AtlasScreen onSelectSpecies={(species) => setSelectedSpecies(species)} />
          ))}

        {activeTab === 'JOURNAL' && (
          <JournalScreen
            key={journalRefreshKey}
            onOpenAtlasSpecies={handleOpenAtlasSpecies}
          />
        )}

        {activeTab === 'SAFETY' && (
          <SafetyGuideScreen
            onShowDisclaimer={() => setDisclaimerVisible(true)}
            onOpenPreparation={() => setActiveTab('PREPARATION')}
          />
        )}

        {activeTab === 'PREPARATION' && <PreparationGuideScreen />}
        
        {activeTab === 'SETTINGS' && <SettingsScreen />}
      </View>

      {/* Dolny Pasek Nawigacyjny */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'SCANNER' && styles.navItemActive]}
          onPress={() => setActiveTab('SCANNER')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>📷</Text>
          <Text style={[styles.navText, activeTab === 'SCANNER' && styles.navTextActive]}>
            {t('nav.scanner')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'ATLAS' && styles.navItemActive]}
          onPress={() => {
            setSelectedSpecies(null);
            setActiveTab('ATLAS');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>📖</Text>
          <Text style={[styles.navText, activeTab === 'ATLAS' && styles.navTextActive]}>
            {t('nav.atlas')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'JOURNAL' && styles.navItemActive]}
          onPress={() => setActiveTab('JOURNAL')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🧺</Text>
          <Text style={[styles.navText, activeTab === 'JOURNAL' && styles.navTextActive]}>
            {t('nav.journal')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'SAFETY' && styles.navItemActive]}
          onPress={() => setActiveTab('SAFETY')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🛡</Text>
          <Text style={[styles.navText, activeTab === 'SAFETY' && styles.navTextActive]}>
            {t('nav.safety')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Zasad Bezpieczeństwa */}
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
    backgroundColor: '#1B3B22',
  },
  topHeader: {
    backgroundColor: '#1B3B22',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C5E37',
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
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  offlinePill: {
    backgroundColor: '#064E3B',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  offlinePillText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingBottom: 12,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#E8F5E9',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextActive: {
    color: '#1B3B22',
    fontWeight: '800',
  },
});
