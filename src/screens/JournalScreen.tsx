import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storageService } from '../services/storageService';
import { resolveJournalPhotoUri } from '../services/journalPhotos';
import { openSpotInMaps } from '../services/mapsLink';
import { formatConfidencePercent } from '../services/recognitionDecision';
import { SightingRecord } from '../types/mushroom';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onOpenAtlasSpecies?: (speciesId: string) => void;
}

function hasGps(item: SightingRecord): item is SightingRecord & { latitude: number; longitude: number } {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
}

export const JournalScreen: React.FC<Props> = ({ onOpenAtlasSpecies }) => {
  const { t } = useLanguage();
  const [sightings, setSightings] = useState<SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SightingRecord | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  const loadSightings = async () => {
    setLoading(true);
    try {
      const data = await storageService.getSightings();
      setSightings(data);
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      Alert.alert(t('journal.readFailedTitle'), t('journal.readFailedBody'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSightings();
  }, []);

  const handleDelete = (item: SightingRecord) => {
    Alert.alert(t('journal.deleteTitle'), t('journal.deleteBody'), [
      { text: t('journal.cancel'), style: 'cancel' },
      {
        text: t('journal.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await storageService.deleteSighting(item.id);
            await loadSightings();
          } catch (error) {
            console.error('Błąd podczas usuwania znaleziska:', error);
            Alert.alert(t('journal.deleteFailedTitle'), t('journal.deleteFailedBody'));
          }
        },
      },
    ]);
  };

  const openNotes = (item: SightingRecord) => {
    setEditing(item);
    setDraftNotes(item.notes ?? '');
  };

  const saveNotes = async () => {
    if (!editing) return;
    try {
      await storageService.updateSightingNotes(editing.id, draftNotes);
      setEditing(null);
      setDraftNotes('');
      await loadSightings();
    } catch (error) {
      console.error('Błąd podczas zapisu notatki:', error);
      Alert.alert(t('journal.notesFailedTitle'), t('journal.notesFailedBody'));
    }
  };

  const openMap = async (latitude: number, longitude: number) => {
    try {
      await openSpotInMaps(latitude, longitude, Platform.OS, Linking);
    } catch (error) {
      console.error('Błąd otwierania map:', error);
      Alert.alert(t('journal.mapFailedTitle'), t('journal.mapFailedBody'));
    }
  };

  const renderRecognition = (item: SightingRecord) => {
    const recognition = item.recognition;
    if (recognition.status === 'legacy') {
      return (
        <View>
          <Text style={styles.legacyBanner} testID={`journal-legacy-${item.id}`}>
            {t('journal.legacyBanner')}
          </Text>
          <Text style={styles.speciesNamePl} testID={`journal-title-${item.id}`}>
            {t('journal.legacyTitle')}
          </Text>
          {recognition.speciesNamePl ? (
            <Text style={styles.honestBody} testID={`journal-legacy-name-${item.id}`}>
              {t('journal.legacyStoredName')}: {recognition.speciesNamePl}
              {recognition.speciesNameLatin ? ` (${recognition.speciesNameLatin})` : ''}
            </Text>
          ) : null}
          {typeof recognition.confidence === 'number' ? (
            <Text style={styles.honestBody} testID={`journal-legacy-confidence-${item.id}`}>
              {t('journal.legacyStoredConfidence')}: {recognition.confidence}
            </Text>
          ) : null}
        </View>
      );
    }
    if (recognition.status === 'rejected' && recognition.reason === 'unclear') {
      return (
        <View>
          <Text style={styles.speciesNamePl} testID={`journal-title-${item.id}`}>
            {t('journal.unclearTitle')}
          </Text>
          <Text style={styles.honestBody}>{t('scanner.rejectedUnclear')}</Text>
        </View>
      );
    }
    if (recognition.status === 'rejected') {
      return (
        <View>
          <Text style={styles.speciesNamePl} testID={`journal-title-${item.id}`}>
            {t('journal.notMushroomTitle')}
          </Text>
          <Text style={styles.honestBody}>{t('scanner.rejectedNotMushroom')}</Text>
        </View>
      );
    }
    if (recognition.status === 'candidates') {
      const primary = recognition.top3[0];
      const inAtlas = primary ? MUSHROOMS_DATABASE.some((species) => species.id === primary.id) : false;
      return (
        <View>
          <Text style={styles.speciesNamePl} testID={`journal-title-${item.id}`}>
            {t('journal.candidatesTitle')}
          </Text>
          <Text style={styles.honestBody}>{t('scanner.candidatesLead')}</Text>
          <Text style={styles.honestBody} testID={`journal-not-edible-${item.id}`}>
            {t('scanner.notEdibilityVerdict')}
          </Text>
          {recognition.expertVerificationRequired ? (
            <Text style={styles.warningText} testID={`journal-expert-${item.id}`}>
              {t('scanner.expertWarningBody')}
            </Text>
          ) : null}
          {recognition.warningReasons.includes('dangerous_genus') ? (
            <Text style={styles.warningText}>{t('scanner.dangerousGenusWarning')}</Text>
          ) : null}
          {recognition.warningReasons.includes('low_confidence') ? (
            <Text style={styles.warningText} testID={`journal-low-confidence-${item.id}`}>
              {t('scanner.lowConfidenceWarning')}
            </Text>
          ) : null}
          {recognition.top3.map((candidate) => (
            <Text
              key={`${item.id}-${candidate.rank}-${candidate.id}`}
              style={styles.candidateText}
              testID={`journal-candidate-${item.id}-${candidate.rank}`}
            >
              {candidate.rank}. {candidate.namePl} · {t('journal.confidence')}:{' '}
              {formatConfidencePercent(candidate.confidence)}
            </Text>
          ))}
          {primary && inAtlas && onOpenAtlasSpecies ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onOpenAtlasSpecies(primary.id)}
              testID={`journal-open-candidate-${item.id}`}
            >
              <Text style={styles.actionBtnText}>
                {t('journal.openCandidate')}: {primary.namePl}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.speciesNamePl} testID={`journal-title-${item.id}`}>
          {t('journal.unavailableTitle')}
        </Text>
        <Text style={styles.honestBody}>{t('scanner.recognitionUnavailableNote')}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SightingRecord }) => {
    const dateStr = new Date(item.timestamp).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const located = hasGps(item);
    const photoUri = resolveJournalPhotoUri(item.photoFile);

    return (
      <View key={item.id} style={styles.card} testID={`journal-entry-${item.id}`}>
        <View style={styles.cardMain}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.thumbnail} testID={`journal-photo-${item.id}`} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ fontSize: 24 }}>🍄</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            {renderRecognition(item)}
            <Text style={styles.dateText}>📅 {dateStr}</Text>

            {located ? (
              <View>
                <Text style={styles.gpsText} testID={`journal-coordinates-${item.id}`}>
                  📍 {t('journal.coordinates')}: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.mapBtn}
                  onPress={() => openMap(item.latitude, item.longitude)}
                  testID={`journal-open-map-${item.id}`}
                >
                  <Text style={styles.mapBtnText}>{t('journal.openMap')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noGpsText} testID={`journal-no-location-${item.id}`}>
                {t('journal.noLocation')}
              </Text>
            )}

            {editing?.id === item.id ? (
              <View>
                <TextInput
                  value={draftNotes}
                  onChangeText={setDraftNotes}
                  placeholder={t('journal.notesPlaceholder')}
                  multiline
                  style={styles.notesInput}
                  testID="journal-notes-input"
                />
                <View style={styles.notesActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setEditing(null);
                      setDraftNotes('');
                    }}
                  >
                    <Text style={styles.actionBtnText}>{t('journal.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mapBtn} onPress={saveNotes} testID="journal-notes-save">
                    <Text style={styles.mapBtnText}>{t('journal.notesSave')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : item.notes ? (
              <Text style={styles.notesText} testID={`journal-notes-${item.id}`}>
                📝 {item.notes}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openNotes(item)}
            testID={`journal-edit-notes-${item.id}`}
          >
            <Text style={styles.actionBtnText}>{t('journal.editNotes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            testID={`journal-delete-${item.id}`}
          >
            <Text style={styles.deleteBtnText}>🗑 {t('journal.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('journal.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('journal.subtitle')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSightings} />}
        >
          {sightings.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>{t('journal.emptyTitle')}</Text>
              <Text style={styles.emptyDesc}>{t('journal.emptyDesc')}</Text>
            </View>
          ) : null}
          {sightings.map((item) => renderItem({ item }))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3B22',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMain: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  thumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  speciesNamePl: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  legacyBanner: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C2D12',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    lineHeight: 17,
  },
  honestBody: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
    lineHeight: 17,
  },
  warningText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 17,
  },
  candidateText: {
    fontSize: 12,
    color: '#0F172A',
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  gpsText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  noGpsText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  mapBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1B3B22',
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  mapBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  notesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
});
