import React, { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import type { ClassificationResult } from '../services/classifierService';
import { createJournalEntryFromScan, type SavedJournalEntry } from '../services/journalEntry';
import { JournalReadError } from '../services/storageService';
import { isDisplayableCaptureUri } from '../services/journalPhotos';
import { modalRecognitionChrome, RecognitionSummary } from './RecognitionSummary';
import { colors, radius, spacing } from '../theme/tokens';

interface Props {
  visible: boolean;
  result: ClassificationResult | null;
  onClose: () => void;
  onOpenAtlasSpecies?: (speciesId: string) => void;
  onSavedToJournal?: () => void;
}

function savedMessage(outcome: SavedJournalEntry, t: (key: string) => string): string {
  const location =
    outcome.location.state === 'recorded'
      ? t('journal.savedWithLocation')
      : outcome.location.state === 'unavailable'
        ? t('journal.savedWithoutGps')
        : t('journal.savedWithoutLocationChoice');
  if (outcome.photo.state === 'missing') {
    return `${location} ${t('journal.photoNotKept')}`;
  }
  return location;
}

export const ResultModal: React.FC<Props> = ({
  visible,
  result,
  onClose,
  onOpenAtlasSpecies,
  onSavedToJournal,
}) => {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const persistStarted = useRef(false);

  if (!result) {
    return null;
  }

  const photoUri = result.processedImageUri;
  const showPhoto = !!photoUri && isDisplayableCaptureUri(photoUri);

  const persist = async (includeLocation: boolean) => {
    if (persistStarted.current) return;
    persistStarted.current = true;
    setSaving(true);
    try {
      const outcome = await createJournalEntryFromScan(result, includeLocation);
      Alert.alert(t('journal.savedTitle'), savedMessage(outcome, t));
      onSavedToJournal?.();
      onClose();
    } catch (error) {
      console.error('Błąd zapisu znaleziska:', error);
      const damaged = error instanceof JournalReadError && error.kind === 'corrupt';
      Alert.alert(t('journal.savedTitle'), damaged ? t('journal.saveFailedDamaged') : t('journal.saveFailed'));
    } finally {
      persistStarted.current = false;
      saveLock.current = false;
      setSaving(false);
    }
  };

  const askToSave = () => {
    if (saveLock.current) return;
    saveLock.current = true;
    Alert.alert(t('journal.locationTitle'), t('journal.locationExplain'), [
      {
        text: t('journal.cancel'),
        style: 'cancel',
        onPress: () => {
          saveLock.current = false;
        },
      },
      { text: t('journal.withoutLocation'), onPress: () => persist(false) },
      { text: t('journal.withLocation'), onPress: () => persist(true) },
    ]);
  };
  const chrome = modalRecognitionChrome(result);
  const title = t(chrome.titleKey);
  const titleTestId = chrome.testID;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>✕ {t('scanner.close')}</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle} testID={titleTestId}>
              {title}
            </Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {showPhoto ? (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.image}
                  resizeMode="cover"
                  testID="captured-photo"
                />
              </View>
            ) : null}

            <RecognitionSummary
              variant="modal"
              recognition={result}
              onOpenAtlasSpecies={onOpenAtlasSpecies}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={askToSave}
              disabled={saving}
              testID="save-to-journal"
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>{t('journal.addToJournal')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.slate200,
    borderRadius: radius.sm,
  },
  backBtnText: {
    fontWeight: '700',
    color: colors.slate700,
    fontSize: 13,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 30,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.slate800,
    marginBottom: spacing.lg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
});
