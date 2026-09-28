import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClassificationResult } from '../services/classifierService';
import { EdibilityBadge } from './EdibilityBadge';
import { LookAlikeAlert } from './LookAlikeAlert';
import { storageService } from '../services/storageService';
import * as Location from 'expo-location';
import { getMushroomImage } from '../utils/mushroomImages';

interface Props {
  visible: boolean;
  result: ClassificationResult | null;
  onClose: () => void;
  onOpenAtlasSpecies?: (speciesId: string) => void;
  onSavedToJournal?: () => void;
}

export const ResultModal: React.FC<Props> = ({
  visible,
  result,
  onClose,
  onOpenAtlasSpecies,
  onSavedToJournal,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!result || result.topPredictions.length === 0) return null;

  const mainPrediction = result.topPredictions[0];
  const mainSpecies = mainPrediction.species;

  const handleSaveToJournal = async () => {
    try {
      setIsSaving(true);
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {
        // Ignoruj brak GPS w trybie offline / las
      }

      await storageService.saveSighting({
        speciesId: mainSpecies.id,
        speciesNamePl: mainSpecies.namePl,
        speciesNameLatin: mainSpecies.nameLatin,
        photoUri: result.processedImageUri,
        timestamp: Date.now(),
        latitude,
        longitude,
        confidence: mainPrediction.confidence,
        notes: `Zidentyfikowano przez model lokalny (${mainPrediction.confidence}%)`,
      });

      setIsSaved(true);
      if (onSavedToJournal) {
        onSavedToJournal();
      }
      Alert.alert('Sukces', 'Znalezisko zostało trwale zapisane w Twoim Dzienniku!');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać znaleziska.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Pasek nawigacji modala */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>✕ Zamknij</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle}>Wynik Rozpoznawania AI</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Zdjęcie i wskaźnik szybkości */}
            <View style={styles.imageContainer}>
              <Image
                source={
                  result.processedImageUri &&
                  (result.processedImageUri.startsWith('file:') ||
                   result.processedImageUri.startsWith('content:') ||
                   result.processedImageUri.startsWith('data:'))
                    ? { uri: result.processedImageUri }
                    : getMushroomImage(mainSpecies.id)
                }
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.latencyBadge}>
                <Text style={styles.latencyText}>⚡ On-device TFLite: {result.inferenceTimeMs} ms</Text>
              </View>
            </View>

            {/* Karta Głównego Rozpoznania */}
            <View style={styles.resultCard}>
              <View style={styles.topRow}>
                <EdibilityBadge status={mainSpecies.status} size="large" />
                <View style={styles.confidenceBox}>
                  <Text style={styles.confidenceValue}>{mainPrediction.confidence}%</Text>
                  <Text style={styles.confidenceLabel}>Pewność AI</Text>
                </View>
              </View>

              <Text style={styles.speciesNamePl}>{mainSpecies.namePl}</Text>
              <Text style={styles.speciesNameLatin}>{mainSpecies.nameLatin}</Text>
              <Text style={styles.familyText}>Rodzina: {mainSpecies.family}</Text>

              <View style={styles.divider} />

              <Text style={styles.descTitle}>Cechy charakterystyczne:</Text>
              <Text style={styles.descText}>{mainSpecies.capDescription}</Text>
              <Text style={styles.descText}>{mainSpecies.hymenophoreDescription}</Text>

              {/* Sekcja Sobowtórów i Zagrożeń */}
              <LookAlikeAlert risks={mainSpecies.confusionRisks} />

              {/* Informacje kulinarne / ostrzeżenia */}
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Wartość użytkowa / kulinarna:</Text>
                <Text style={styles.infoContent}>{mainSpecies.culinaryValue}</Text>
              </View>
            </View>

            {/* Alternatywne hipotezy (Top 2 i 3) */}
            <View style={styles.alternativesSection}>
              <Text style={styles.altSectionTitle}>Alternatywne przypuszczenia modelu:</Text>
              {result.topPredictions.slice(1).map((pred, i) => (
                <View key={i} style={styles.altRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.altNamePl}>{pred.species.namePl}</Text>
                    <Text style={styles.altNameLatin}>{pred.species.nameLatin}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <EdibilityBadge status={pred.species.status} size="small" />
                    <Text style={styles.altConfidence}>{pred.confidence}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Dolny pasek akcji */}
          <View style={styles.bottomBar}>
            {onOpenAtlasSpecies && (
              <TouchableOpacity
                style={styles.atlasBtn}
                onPress={() => {
                  onClose();
                  onOpenAtlasSpecies(mainSpecies.id);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.atlasBtnText}>📖 Karta w Atlasie</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, isSaved && styles.savedBtn]}
              onPress={handleSaveToJournal}
              disabled={isSaving || isSaved}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isSaved ? '✓ Zapisano w dzienniku' : '📍 Zapisz Znalezisko'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6F3',
  },
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  backBtnText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 13,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B3B22',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  latencyBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  latencyText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceBox: {
    alignItems: 'flex-end',
  },
  confidenceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1B3B22',
  },
  confidenceLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  speciesNamePl: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  speciesNameLatin: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 2,
  },
  familyText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1B3B22',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B3B22',
    marginBottom: 4,
  },
  infoContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  alternativesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  altSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  altNamePl: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  altNameLatin: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
  },
  altConfidence: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  atlasBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atlasBtnText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1.3,
    backgroundColor: '#1B3B22',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBtn: {
    backgroundColor: '#2E7D32',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
