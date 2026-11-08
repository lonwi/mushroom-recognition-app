import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors, spacing } from '../../theme/tokens';

interface ScannerControlsProps {
  isAnalyzing: boolean;
  onTakePhoto: () => void;
  onPickGallery: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
  isAnalyzing,
  onTakePhoto,
  onPickGallery,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.cameraControls}>
      <TouchableOpacity
        style={styles.galleryButton}
        onPress={onPickGallery}
        disabled={isAnalyzing}
        activeOpacity={0.7}
        testID="scanner-gallery"
        accessibilityRole="button"
        accessibilityLabel={t('scanner.gallery')}
        accessibilityState={{ disabled: isAnalyzing }}
      >
        <Text style={styles.galleryIcon} importantForAccessibility="no" accessibilityElementsHidden>
          🖼
        </Text>
        <Text style={styles.galleryText}>{t('scanner.gallery')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.shutterButton}
        onPress={onTakePhoto}
        disabled={isAnalyzing}
        activeOpacity={0.8}
        testID="scanner-shutter"
        accessibilityRole="button"
        accessibilityLabel={t('scanner.takePhoto')}
        accessibilityState={{ disabled: isAnalyzing, busy: isAnalyzing }}
      >
        <View style={styles.shutterInner}>
          {isAnalyzing ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View style={styles.shutterCenter} />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.spacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.overlayDark50,
  },
  galleryButton: {
    alignItems: 'center',
    width: 60,
  },
  galleryIcon: {
    fontSize: 26,
  },
  galleryText: {
    color: colors.white,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  shutterButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayLight20,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCenter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
  },
  spacer: {
    width: 60,
  },
});
