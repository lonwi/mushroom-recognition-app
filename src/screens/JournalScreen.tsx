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
import { JournalReadError, storageService } from '../services/storageService';
import { resolveJournalPhotoUri } from '../services/journalPhotos';
import { openSpotInMaps } from '../services/mapsLink';
import { SightingRecord } from '../types/mushroom';
import { useLanguage } from '../contexts/LanguageContext';
import { RecognitionSummary } from '../components/RecognitionSummary';
import { colors } from '../theme/tokens';

interface Props {
  onOpenAtlasSpecies?: (speciesId: string) => void;
}

function hasGps(item: SightingRecord): item is SightingRecord & { latitude: number; longitude: number } {
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
}

export const JournalScreen: React.FC<Props> = ({ onOpenAtlasSpecies }) => {
  const { t, language } = useLanguage();
  const [sightings, setSightings] = useState<SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalDamaged, setJournalDamaged] = useState(false);
  const [editing, setEditing] = useState<SightingRecord | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  const loadSightings = async () => {
    setLoading(true);
    try {
      const data = await storageService.getSightings();
      setSightings(data);
      setJournalDamaged(false);
    } catch (error) {
      console.error('Błąd podczas odczytu dziennika znalezisk:', error);
      if (error instanceof JournalReadError && error.kind === 'corrupt') {
        setSightings([]);
        setJournalDamaged(true);
      } else {
        Alert.alert(t('journal.readFailedTitle'), t('journal.readFailedBody'));
      }
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

  const confirmStartFresh = () => {
    Alert.alert(t('journal.startFreshTitle'), t('journal.startFreshBody'), [
      { text: t('journal.cancel'), style: 'cancel' },
      {
        text: t('journal.startFresh'),
        style: 'destructive',
        onPress: async () => {
          try {
            await storageService.startFreshJournal();
            await loadSightings();
          } catch (error) {
            console.error('Błąd podczas zakładania nowego dziennika:', error);
            Alert.alert(t('journal.startFreshFailedTitle'), t('journal.startFreshFailedBody'));
          }
        },
      },
    ]);
  };

  const openMap = async (latitude: number, longitude: number) => {
    try {
      await openSpotInMaps(latitude, longitude, Platform.OS, Linking);
    } catch (error) {
      console.error('Błąd otwierania map:', error);
      Alert.alert(t('journal.mapFailedTitle'), t('journal.mapFailedBody'));
    }
  };

  const renderRecognition = (item: SightingRecord) => (
    <RecognitionSummary
      variant="journal"
      entryId={item.id}
      recognition={item.recognition}
      onOpenAtlasSpecies={onOpenAtlasSpecies}
    />
  );

  const renderItem = ({ item }: { item: SightingRecord }) => {
    const dateStr =
      item.timestamp > 0
        ? new Date(item.timestamp).toLocaleDateString(language === 'en' ? 'en-GB' : 'pl-PL', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : t('journal.missingDate');
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
            <Text style={styles.dateText} testID={`journal-date-${item.id}`}>
              📅 {dateStr}
            </Text>

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
          {journalDamaged && !loading ? (
            <View style={styles.emptyContainer} testID="journal-damaged">
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>{t('journal.readFailedTitle')}</Text>
              <Text style={styles.damagedBody} testID="journal-damaged-message">
                {t('journal.damagedBody')}
              </Text>
              <TouchableOpacity style={styles.mapBtn} onPress={confirmStartFresh} testID="journal-start-fresh">
                <Text style={styles.mapBtnText}>{t('journal.startFresh')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {sightings.length === 0 && !loading && !journalDamaged ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>{t('journal.emptyTitle')}</Text>
              <Text style={styles.emptyDesc}>{t('journal.emptyDesc')}</Text>
            </View>
          ) : null}
          {!journalDamaged ? sightings.map((item) => renderItem({ item })) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.black,
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
    backgroundColor: colors.slate200,
  },
  thumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dateText: {
    fontSize: 11,
    color: colors.slate500,
    marginTop: 6,
  },
  gpsText: {
    fontSize: 11,
    color: colors.edible,
    fontWeight: '600',
    marginTop: 2,
  },
  noGpsText: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 4,
  },
  notesText: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.slate700,
    fontWeight: '600',
  },
  mapBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  mapBtnText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.red100,
    borderRadius: 6,
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    color: colors.red600,
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
    color: colors.slate700,
  },
  damagedBody: {
    fontSize: 14,
    color: colors.orange900,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  notesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.slate900,
    textAlignVertical: 'top',
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
});
