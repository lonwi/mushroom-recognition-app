import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { colors } from '../../theme/tokens';

export const ScannerReticle: React.FC = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.viewfinderCenter}>
      <View style={styles.frameCornerTopLeft} />
      <View style={styles.frameCornerTopRight} />
      <View style={styles.frameCornerBottomLeft} />
      <View style={styles.frameCornerBottomRight} />

      <View style={styles.guideBadge}>
        <Text style={styles.guideBadgeText}>{t('scanner.aimGuide')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderColor: colors.green400,
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
    borderColor: colors.green400,
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
    borderColor: colors.green400,
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
    borderColor: colors.green400,
    borderBottomRightRadius: 10,
  },
  guideBadge: {
    backgroundColor: colors.overlayDark65,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  guideBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
