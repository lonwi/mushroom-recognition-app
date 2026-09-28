import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { classifierService, ClassificationResult } from '../services/classifierService';
import { ResultModal } from '../components/ResultModal';

interface Props {
  onOpenAtlasSpecies?: (speciesId: string) => void;
  onSavedToJournal?: () => void;
}

export const ScannerScreen: React.FC<Props> = ({ onOpenAtlasSpecies, onSavedToJournal }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const cameraRef = useRef<any>(null);

  // Zrobienie zdjęcia aparatem i uruchomienie klasyfikacji
  const takePictureAndAnalyze = async () => {
    if (cameraRef.current) {
      try {
        setIsAnalyzing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
        });

        if (photo && photo.uri) {
          const res = await classifierService.classifyImage(photo.uri);
          setClassificationResult(res);
          setResultModalVisible(true);
        }
      } catch (err) {
        console.error('Błąd wykonania zdjęcia:', err);
        // Fallback w symulatorze
        const res = await classifierService.classifyImage('https://images.unsplash.com/photo-1509198397868-475647b2a1e5');
        setClassificationResult(res);
        setResultModalVisible(true);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // Fallback jeśli kamera nie jest zainicjalizowana
      triggerQuickTest('boletus_edulis');
    }
  };

  // Wybór zdjęcia z galerii telefonu
  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setIsAnalyzing(true);
        const res = await classifierService.classifyImage(result.assets[0].uri);
        setClassificationResult(res);
        setResultModalVisible(true);
      }
    } catch (err) {
      Alert.alert('Błąd', 'Nie udało się załadować zdjęcia z galerii.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Szybki test demo z bazy danych
  const triggerQuickTest = async (speciesId: string) => {
    setIsAnalyzing(true);
    try {
      const mockUri = 'https://images.unsplash.com/photo-1546842931-886c185b4c8c';
      const res = await classifierService.classifyImage(mockUri, speciesId);
      setClassificationResult(res);
      setResultModalVisible(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1B3B22" />
        <Text style={styles.loadingText}>Inicjalizacja modułu aparatu...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Dostęp do aparatu jest wymagany</Text>
        <Text style={styles.permissionDesc}>
          Aby analizować grzyby w lesie w czasie rzeczywistym, aplikacja potrzebuje dostępu do kamery urządzenia.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permissionBtnText}>Zezwól na aparat</Text>
        </TouchableOpacity>

        {/* Możliwość testu z galerii lub demo nawet bez uprawnień do kamery */}
        <View style={styles.demoFallbackBox}>
          <Text style={styles.demoFallbackTitle}>Możesz również wybrać zdjęcie z galerii:</Text>
          <TouchableOpacity style={styles.galleryBtnAlt} onPress={pickImageFromGallery}>
            <Text style={styles.galleryBtnAltText}>🖼 Wybierz z galerii</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Podgląd kamery */}
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchEnabled}
        ref={cameraRef}
      >
        {/* Górny pasek sterowania w aparacie */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity
            style={[styles.toolBtn, torchEnabled && styles.toolBtnActive]}
            onPress={() => setTorchEnabled(!torchEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolIcon}>{torchEnabled ? '🔦 WŁ' : '🔦 Latarka'}</Text>
          </TouchableOpacity>

          <View style={styles.badgeOffline}>
            <Text style={styles.badgeOfflineText}>● 100% OFFLINE</Text>
          </View>
        </View>

        {/* Celownik i wskazówki kadrowania makro */}
        <View style={styles.viewfinderCenter}>
          <View style={styles.frameCornerTopLeft} />
          <View style={styles.frameCornerTopRight} />
          <View style={styles.frameCornerBottomLeft} />
          <View style={styles.frameCornerBottomRight} />

          <View style={styles.guideBadge}>
            <Text style={styles.guideBadgeText}>Skieruj aparat na kapelusz i spód grzyba</Text>
          </View>
        </View>

        {/* Pasek szybkiego testu demonstracyjnego */}
        <View style={styles.demoTestContainer}>
          <Text style={styles.demoTestLabel}>Szybki test gatunków (Demo offline):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoScroll}>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => triggerQuickTest('boletus_edulis')}
              disabled={isAnalyzing}
            >
              <Text style={styles.demoChipText}>🌲 Borowik</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoChip, styles.demoChipDanger]}
              onPress={() => triggerQuickTest('amanita_phalloides')}
              disabled={isAnalyzing}
            >
              <Text style={[styles.demoChipText, styles.demoChipDangerText]}>☠ Muchomor sromotnikowy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => triggerQuickTest('macrolepiota_procera')}
              disabled={isAnalyzing}
            >
              <Text style={styles.demoChipText}>☂ Czubajka kania</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => triggerQuickTest('cantharellus_cibarius')}
              disabled={isAnalyzing}
            >
              <Text style={styles.demoChipText}>🍳 Kurka</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Dolne przyciski migawki */}
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickImageFromGallery}
            disabled={isAnalyzing}
            activeOpacity={0.7}
          >
            <Text style={styles.galleryIcon}>🖼</Text>
            <Text style={styles.galleryText}>Galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterButton}
            onPress={takePictureAndAnalyze}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner}>
              {isAnalyzing ? (
                <ActivityIndicator color="#1B3B22" size="large" />
              ) : (
                <View style={styles.shutterCenter} />
              )}
            </View>
          </TouchableOpacity>

          <View style={{ width: 60 }} />
        </View>
      </CameraView>

      {/* Modal z wynikiem rozpoznania */}
      <ResultModal
        visible={resultModalVisible}
        result={classificationResult}
        onClose={() => setResultModalVisible(false)}
        onOpenAtlasSpecies={onOpenAtlasSpecies}
        onSavedToJournal={onSavedToJournal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  toolBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  toolBtnActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  toolIcon: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeOffline: {
    backgroundColor: 'rgba(46, 125, 50, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeOfflineText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewfinderCenter: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4ADE80',
    borderTopLeftRadius: 10,
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4ADE80',
    borderTopRightRadius: 10,
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4ADE80',
    borderBottomLeftRadius: 10,
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4ADE80',
    borderBottomRightRadius: 10,
  },
  guideBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  guideBadgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  demoTestContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  demoTestLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  demoScroll: {
    gap: 8,
  },
  demoChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  demoChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  demoChipDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.4)',
    borderColor: '#EF4444',
  },
  demoChipDangerText: {
    color: '#FCA5A5',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  galleryButton: {
    alignItems: 'center',
    width: 60,
  },
  galleryIcon: {
    fontSize: 26,
  },
  galleryText: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  shutterButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCenter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1B3B22',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  permissionIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: '#1B3B22',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  demoFallbackBox: {
    marginTop: 40,
    alignItems: 'center',
  },
  demoFallbackTitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  galleryBtnAlt: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  galleryBtnAltText: {
    color: '#1E293B',
    fontWeight: '700',
  },
});
