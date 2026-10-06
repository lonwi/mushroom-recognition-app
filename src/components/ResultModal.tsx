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
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { useLanguage } from '../contexts/LanguageContext';
import type { ClassificationResult } from '../services/classifierService';
import { createJournalEntryFromScan, type SavedJournalEntry } from '../services/journalEntry';
import { JournalReadError } from '../services/storageService';
import { isDisplayableCaptureUri } from '../services/journalPhotos';
import { formatConfidencePercent } from '../services/recognitionDecision';

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
  const title =
    result.status === 'unavailable'
      ? t('scanner.recognitionUnavailableTitle')
      : result.status === 'rejected'
        ? t('scanner.rejectedTitle')
        : t('scanner.candidatesTitle');
  const titleTestId =
    result.status === 'unavailable'
      ? 'recognition-unavailable-title'
      : result.status === 'rejected'
        ? 'recognition-rejected-title'
        : 'recognition-candidates-title';

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

            {result.status === 'unavailable' ? (
              <View style={styles.resultCard}>
                <Text style={styles.heading} testID="recognition-unavailable-body">
                  {t('scanner.recognitionUnavailableBody')}
                </Text>
                <Text style={styles.note}>{t('scanner.recognitionUnavailableNote')}</Text>
              </View>
            ) : null}

            {result.status === 'rejected' ? (
              <View style={styles.resultCard}>
                <Text style={styles.heading} testID="recognition-rejected-body">
                  {result.reason === 'unclear' ? t('scanner.rejectedUnclear') : t('scanner.rejectedNotMushroom')}
                </Text>
                <Text style={styles.note}>{t('scanner.rejectedVerify')}</Text>
              </View>
            ) : null}

            {result.status === 'candidates' ? (
              <View>
                {result.expertVerificationRequired ? (
                  <View style={styles.expertBanner} testID="expert-verification-banner">
                    <Text style={styles.expertTitle}>{t('scanner.expertWarningTitle')}</Text>
                    <Text style={styles.expertBody}>{t('scanner.expertWarningBody')}</Text>
                    {result.warningReasons.includes('dangerous_genus') ? (
                      <Text style={styles.expertDetail} testID="dangerous-genus-warning">
                        {t('scanner.dangerousGenusWarning')}
                      </Text>
                    ) : null}
                    {result.warningReasons.includes('low_confidence') ? (
                      <Text style={styles.expertDetail} testID="low-confidence-warning">
                        {t('scanner.lowConfidenceWarning')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.resultCard}>
                  <Text style={styles.heading}>{t('scanner.candidatesLead')}</Text>
                  <Text style={styles.note} testID="not-edibility-verdict">
                    {t('scanner.notEdibilityVerdict')}
                  </Text>
                  {result.top3.map((candidate) => {
                    const inAtlas = MUSHROOMS_DATABASE.some((species) => species.id === candidate.id);
                    return (
                      <View key={`${candidate.rank}-${candidate.id}`} style={styles.candidate} testID={`candidate-rank-${candidate.rank}`}>
                        <Text style={styles.candidateRank}>
                          {candidate.rank}. {candidate.namePl}
                        </Text>
                        <Text style={styles.candidateLatin}>{candidate.nameLatin}</Text>
                        <Text style={styles.candidateConfidence} testID={`candidate-confidence-${candidate.rank}`}>
                          {t('scanner.confidence')}: {formatConfidencePercent(candidate.confidence)}
                        </Text>
                        {inAtlas && onOpenAtlasSpecies ? (
                          <TouchableOpacity
                            onPress={() => onOpenAtlasSpecies(candidate.id)}
                            style={styles.atlasBtn}
                            testID={`open-atlas-${candidate.id}`}
                          >
                            <Text style={styles.atlasBtnText}>{t('scanner.openAtlas')}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={askToSave}
              disabled={saving}
              testID="save-to-journal"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
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
  expertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  expertTitle: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  expertBody: {
    color: '#7F1D1D',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  expertDetail: {
    color: '#7F1D1D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  candidate: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  candidateRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  candidateLatin: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 2,
  },
  candidateConfidence: {
    fontSize: 14,
    color: '#1E293B',
    marginTop: 4,
  },
  atlasBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  atlasBtnText: {
    color: '#14532D',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#1B3B22',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
