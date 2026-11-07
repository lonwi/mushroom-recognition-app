import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors, radius } from '../../theme/tokens';

interface ScannerPermissionPromptProps {
  onRequestPermission: () => void;
  onPickGallery: () => void;
}

export const ScannerPermissionPrompt: React.FC<ScannerPermissionPromptProps> = ({
  onRequestPermission,
  onPickGallery,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionIcon}>📷</Text>
      <Text style={styles.permissionTitle}>{t('scanner.cameraRequiredTitle')}</Text>
      <Text style={styles.permissionDesc}>{t('scanner.cameraRequiredBody')}</Text>
      <TouchableOpacity
        style={styles.permissionBtn}
        onPress={onRequestPermission}
        activeOpacity={0.8}
      >
        <Text style={styles.permissionBtnText}>{t('scanner.allowCamera')}</Text>
      </TouchableOpacity>

      <View style={styles.demoFallbackBox}>
        <Text style={styles.demoFallbackTitle}>{t('scanner.galleryFallback')}</Text>
        <TouchableOpacity style={styles.galleryBtnAlt} onPress={onPickGallery}>
          <Text style={styles.galleryBtnAltText}>{t('scanner.galleryAlt')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.slate800,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.md,
  },
  permissionBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  demoFallbackBox: {
    marginTop: 40,
    alignItems: 'center',
  },
  demoFallbackTitle: {
    fontSize: 13,
    color: colors.slate600,
    marginBottom: 10,
  },
  galleryBtnAlt: {
    backgroundColor: colors.slate200,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
  },
  galleryBtnAltText: {
    color: colors.slate800,
    fontWeight: '700',
  },
});
