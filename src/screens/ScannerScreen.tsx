import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { classifierService, ClassificationResult } from '../services/classifierService';
import { SKIP_PROCESSING_CAPTURE, uprightCaptureWidth, widthForCapture } from '../services/photoPixels';
import { DevInferenceOverlay } from '../components/DevInferenceOverlay';
import { ResultModal } from '../components/ResultModal';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../theme/tokens';
import { ScannerExamples } from '../components/scanner/ScannerExamples';
import { ScannerReticle } from '../components/scanner/ScannerReticle';
import { ScannerControls } from '../components/scanner/ScannerControls';
import { ScannerPermissionPrompt } from '../components/scanner/ScannerPermissionPrompt';

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
      // Leave EXIF orientation on the file. readPhotoAsPngBytes bakes it,
      // then imagePreprocess area-resizes to match the training PNGs.
      // iOS can reject the capture when exif is requested; retry without it.
      const capture = { quality: 0.8, ...SKIP_PROCESSING_CAPTURE };
      let photo;
      try {
        photo = await camera.takePictureAsync({ ...capture, exif: true });
      } catch (exifError) {
        if (Platform.OS !== 'ios') {
          throw exifError;
        }
        photo = await camera.takePictureAsync(capture);
      }

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('scanner.cameraInit')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionWrapper}>
        <ScannerPermissionPrompt
          onRequestPermission={requestPermission}
          onPickGallery={pickImageFromGallery}
        />
        <DevInferenceOverlay />
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
            testID="scanner-torch"
            accessibilityRole="switch"
            accessibilityLabel={torchEnabled ? t('scanner.torchOn') : t('scanner.torchOff')}
            accessibilityState={{ checked: torchEnabled }}
          >
            <Text style={styles.toolIcon}>
              {torchEnabled ? t('scanner.torchOnShort') : t('scanner.torchOffShort')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScannerReticle />

        <ScannerExamples
          onOpenAtlasSample={openAtlasSample}
          disabled={isAnalyzing}
        />

        <ScannerControls
          isAnalyzing={isAnalyzing}
          onTakePhoto={takePictureAndAnalyze}
          onPickGallery={pickImageFromGallery}
        />
      </View>

      <DevInferenceOverlay />
      {resultModal}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  permissionWrapper: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: 20,
  },
  toolBtn: {
    backgroundColor: colors.overlayDark55,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.overlayLight30,
  },
  toolBtnActive: {
    backgroundColor: colors.amber500,
    borderColor: colors.amber500,
  },
  toolIcon: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.slate700,
  },
});
