import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storageService } from '../services/storageService';
import { SightingRecord } from '../types/mushroom';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { EdibilityBadge } from '../components/EdibilityBadge';

interface Props {
  onOpenAtlasSpecies?: (speciesId: string) => void;
}

export const JournalScreen: React.FC<Props> = ({ onOpenAtlasSpecies }) => {
  const [sightings, setSightings] = useState<SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSightings = async () => {
    setLoading(true);
    const data = await storageService.getSightings();
    setSightings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSightings();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Usuń wpis',
      `Czy na pewno chcesz usunąć znalezisko "${name}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            await storageService.deleteSighting(id);
            loadSightings();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SightingRecord }) => {
    const species = MUSHROOMS_DATABASE.find((m) => m.id === item.speciesId);
    const dateStr = new Date(item.timestamp).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const hasGps = item.latitude !== undefined && item.longitude !== undefined;

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Text style={{ fontSize: 24 }}>🍄</Text>
            </View>
          )}

          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.speciesNamePl} numberOfLines={1}>
                {item.speciesNamePl}
              </Text>
              {species && <EdibilityBadge status={species.status} size="small" />}
            </View>

            <Text style={styles.speciesNameLatin}>{item.speciesNameLatin}</Text>
            <Text style={styles.dateText}>📅 {dateStr}</Text>

            {hasGps && (
              <Text style={styles.gpsText}>
                📍 GPS: {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
              </Text>
            )}

            {item.notes && <Text style={styles.notesText}>📝 {item.notes}</Text>}
          </View>
        </View>

        <View style={styles.cardActions}>
          {onOpenAtlasSpecies && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onOpenAtlasSpecies(item.speciesId)}
            >
              <Text style={styles.actionBtnText}>📖 Karta w Atlasie</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item.id, item.speciesNamePl)}
          >
            <Text style={styles.deleteBtnText}>🗑 Usuń</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dziennik Leśnych Zbiorów</Text>
          <Text style={styles.headerSubtitle}>
            Zapisane okazy i Twoje grzybowe miejscówki (offline)
          </Text>
        </View>

        <FlatList
          data={sightings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={loadSightings}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🧺</Text>
              <Text style={styles.emptyTitle}>Twój koszyk jest jeszcze pusty</Text>
              <Text style={styles.emptyDesc}>
                Gdy znajdziesz grzyba w lesie, zrób mu zdjęcie w skanerze AI i kliknij "Zapisz Znalezisko",
                aby zachować jego współrzędne GPS i datę.
              </Text>
            </View>
          }
        />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  speciesNamePl: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  speciesNameLatin: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  gpsText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
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
  },
  actionBtnText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
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
});
