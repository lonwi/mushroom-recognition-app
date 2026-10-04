import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClassificationResult } from '../services/classifierService';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  visible: boolean;
  result: ClassificationResult | null;
  onClose: () => void;
  onOpenAtlasSpecies?: (speciesId: string) => void;
  onSavedToJournal?: () => void;
}

function isLocalCaptureUri(uri: string): boolean {
  return /^(file:|content:|data:|blob:|ph:|assets-library:)/.test(uri);
}

export const ResultModal: React.FC<Props> = ({ visible, result, onClose }) => {
  const { t } = useLanguage();

  if (!result || result.status !== 'unavailable') {
    return null;
  }

  const photoUri = result.processedImageUri;
  const showPhoto = !!photoUri && isLocalCaptureUri(photoUri);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>✕ {t('scanner.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle} testID="recognition-unavailable-title">
              {t('scanner.recognitionUnavailableTitle')}
            </Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {showPhoto ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
              </View>
            ) : null}

            <View style={styles.resultCard}>
              <Text style={styles.heading} testID="recognition-unavailable-body">
                {t('scanner.recognitionUnavailableBody')}
              </Text>
              <Text style={styles.note}>{t('scanner.recognitionUnavailableNote')}</Text>
            </View>
          </ScrollView>
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
    flex: 1,
    textAlign: 'center',
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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1B3B22',
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 10,
  },
  note: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});
