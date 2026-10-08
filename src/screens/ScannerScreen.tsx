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
import { SKIP_PROCESSING_CAPTURE, uprightCaptureWidth, widthForCapture } from '../services/photoPixels';
import { ResultModal } from '../components/ResultModal';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onOpenAtlasSpecies?: (speciesId: string) => void;
  onSavedToJournal?: () => void;
}

export const ScannerScreen: React.FC<Props> = ({ onOpenAtlasSpecies, onSavedToJournal }) => {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const cameraRef = useRef<any>(null);

  const showCapturedPhoto = async (imageUri: string, knownWidth?: number) => {
    const res = await classifierService.classifyImage(imageUri, knownWidth);
    setClassificationResult(res);
    setResultModalVisible(true);
  };

  // Zrobienie zdjęcia aparatem. Brak zdjęcia nie podstawia ilustracji.
  const takePictureAndAnalyze = async () => {
    const camera = cameraRef.current;
    if (!camera || typeof camera.takePictureAsync !== 'function') {
      Alert.alert(t('scanner.cameraUnavailableTitle'), t('scanner.cameraUnavailableBody'));
      return;
    }

    try {
      setIsAnalyzing(true);
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        // Leave EXIF orientation on the file. readPhotoAsPngBytes bakes it,
        // then imagePreprocess area-resizes to match the training PNGs.
        exif: true,
        ...SKIP_PROCESSING_CAPTURE,
      });

      if (photo && photo.uri) {
        // Stored EXIF pixels, swapped for orientations 5–8. Avoids a full
        // decode just to read width on Android and on iOS.
        const width = widthForCapture(photo, SKIP_PROCESSING_CAPTURE);
        await showCapturedPhoto(photo.uri, width);
      } else {
        Alert.alert(t('scanner.photoFailedTitle'), t('scanner.photoFailedBody'));
      }
    } catch (err) {
      console.error('Błąd wykonania zdjęcia:', err);
      Alert.alert(t('scanner.photoFailedTitle'), t('scanner.photoFailedBody'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Wybór zdjęcia z galerii telefonu
  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('scanner.galleryPermissionTitle'), t('scanner.galleryPermissionBody'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setIsAnalyzing(true);
        // ImagePicker DimensionsExporter already swaps width for 90° and 270° EXIF.
        const width = uprightCaptureWidth(result.assets[0].width, { skipProcessing: false });
        await showCapturedPhoto(result.assets[0].uri, width);
      }
    } catch (err: any) {
      console.error('Gallery picker error:', err);
      Alert.alert(
        t('scanner.galleryErrorTitle'),
        t('scanner.galleryErrorBody').replace(
          '{message}',
          err?.message || t('scanner.unknownError'),
        ),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openAtlasSample = (speciesId: string) => {
    if (onOpenAtlasSpecies) {
      onOpenAtlasSpecies(speciesId);
    }
  };

  const resultModal = (
    <ResultModal
      visible={resultModalVisible}
      result={classificationResult}
      onClose={() => setResultModalVisible(false)}
      onOpenAtlasSpecies={onOpenAtlasSpecies}
      onSavedToJournal={onSavedToJournal}
    />
  );

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1B3B22" />
        <Text style={styles.loadingText}>{t('scanner.cameraInit')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>{t('scanner.cameraRequiredTitle')}</Text>
        <Text style={styles.permissionDesc}>{t('scanner.cameraRequiredBody')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permissionBtnText}>{t('scanner.allowCamera')}</Text>
        </TouchableOpacity>

        {/* Galeria bez uprawnień do kamery. Błąd wyboru nie podstawia innego zdjęcia. */}
        <View style={styles.demoFallbackBox}>
          <Text style={styles.demoFallbackTitle}>{t('scanner.galleryFallback')}</Text>
          <TouchableOpacity style={styles.galleryBtnAlt} onPress={pickImageFromGallery}>
            <Text style={styles.galleryBtnAltText}>{t('scanner.galleryAlt')}</Text>
          </TouchableOpacity>
        </View>
        {resultModal}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Podgląd kamery */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        ref={cameraRef}
      />

      {/* Nakładka z elementami sterowania */}
      <View style={styles.cameraOverlay}>
        {/* Górny pasek sterowania w aparacie */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity
            style={[styles.toolBtn, torchEnabled && styles.toolBtnActive]}
            onPress={() => setTorchEnabled(!torchEnabled)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolIcon}>
              {torchEnabled ? t('scanner.torchOnShort') : t('scanner.torchOffShort')}
            </Text>
          </TouchableOpacity>

          <View style={styles.badgeOffline}>
            <Text style={styles.badgeOfflineText}>{t('scanner.offlineBadge')}</Text>
          </View>
        </View>

        {/* Celownik i wskazówki kadrowania makro */}
        <View style={styles.viewfinderCenter}>
          <View style={styles.frameCornerTopLeft} />
          <View style={styles.frameCornerTopRight} />
          <View style={styles.frameCornerBottomLeft} />
          <View style={styles.frameCornerBottomRight} />

          <View style={styles.guideBadge}>
            <Text style={styles.guideBadgeText}>{t('scanner.aimGuide')}</Text>
          </View>
        </View>

        {/* Skróty do kart w atlasie. Nie uruchamiają rozpoznawania. */}
        <View style={styles.demoTestContainer}>
          <Text style={styles.demoTestLabel}>{t('scanner.quickDemo')}</Text>
          <Text style={styles.demoScopeHint} testID="scanner-atlas-scope">
            {t('scanner.atlasScopeHint')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.demoScroll}>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => openAtlasSample('boletus_edulis')}
              disabled={isAnalyzing}
              testID="demo-atlas-boletus"
            >
              <Text style={styles.demoChipText}>{t('scanner.sampleBoletus')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoChip, styles.demoChipDanger]}
              onPress={() => openAtlasSample('amanita_phalloides')}
              disabled={isAnalyzing}
              testID="demo-atlas-amanita"
            >
              <Text style={[styles.demoChipText, styles.demoChipDangerText]}>{t('scanner.sampleAmanita')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => openAtlasSample('macrolepiota_procera')}
              disabled={isAnalyzing}
              testID="demo-atlas-macrolepiota"
            >
              <Text style={styles.demoChipText}>{t('scanner.sampleParasol')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => openAtlasSample('cantharellus_cibarius')}
              disabled={isAnalyzing}
              testID="demo-atlas-cantharellus"
            >
              <Text style={styles.demoChipText}>{t('scanner.sampleChanterelle')}</Text>
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
            testID="scanner-gallery"
          >
            <Text style={styles.galleryIcon}>🖼</Text>
            <Text style={styles.galleryText}>{t('scanner.gallery')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterButton}
            onPress={takePictureAndAnalyze}
            disabled={isAnalyzing}
            activeOpacity={0.8}
            testID="scanner-shutter"
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
      </View>

      {resultModal}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
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
    marginBottom: 2,
  },
  demoScopeHint: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
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
