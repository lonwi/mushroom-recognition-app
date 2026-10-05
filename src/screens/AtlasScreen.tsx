import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { MushroomSpecies, EdibilityStatus, HymenophoreType } from '../types/mushroom';
import { SpeciesStatusBadge } from '../components/EdibilityBadge';
import { useLanguage } from '../contexts/LanguageContext';
import { getMushroomImage } from '../utils/mushroomImages';

interface Props {
  onSelectSpecies: (species: MushroomSpecies) => void;
}

export const AtlasScreen: React.FC<Props> = ({ onSelectSpecies }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EdibilityStatus | 'ALL'>('ALL');
  const [hymenophoreFilter, setHymenophoreFilter] = useState<HymenophoreType | 'ALL'>('ALL');

  const filteredMushrooms = useMemo(() => {
    return MUSHROOMS_DATABASE.filter((m) => {
      // Filtr tekstu
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        m.namePl.toLowerCase().includes(query) ||
        m.nameLatin.toLowerCase().includes(query) ||
        m.commonNicknames.some((nick) => nick.toLowerCase().includes(query));

      // Filtr jadalności
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

      // Filtr hymenoforu
      const matchesHymenophore = hymenophoreFilter === 'ALL' || m.hymenophore === hymenophoreFilter;

      return matchesSearch && matchesStatus && matchesHymenophore;
    });
  }, [searchQuery, statusFilter, hymenophoreFilter]);

  const renderItem = ({ item }: { item: MushroomSpecies }) => {
    const hymenophoreLabel =
      item.hymenophore === 'TUBES'
        ? 'Rurki (gąbka)'
        : item.hymenophore === 'GILLS'
        ? 'Blaszki'
        : item.hymenophore === 'FOLDS'
        ? 'Listewki'
        : 'Inny';

    const monthsStr = `${item.months[0]} - ${item.months[item.months.length - 1]} mies.`;

    const photo = getMushroomImage(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectSpecies(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardMainRow}>
          {photo ? (
            <Image
              source={photo}
              style={styles.cardThumbnail}
              resizeMode="cover"
              testID={`atlas-photo-${item.id}`}
            />
          ) : (
            <View style={[styles.cardThumbnail, styles.cardThumbnailMissing]} testID={`atlas-photo-missing-${item.id}`}>
              <Text style={styles.cardThumbnailMissingText}>Brak zdjęcia</Text>
            </View>
          )}
          <View style={styles.cardDetails}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={styles.namePl}>{item.namePl}</Text>
                <Text style={styles.nameLatin}>{item.nameLatin}</Text>
              </View>
              <SpeciesStatusBadge
                status={item.status}
                incompleteCard={item.incompleteCard}
                size="small"
                testID={`incomplete-card-badge-${item.id}`}
              />
            </View>

            {item.commonNicknames.length > 0 ? (
              <Text style={styles.nicknames} numberOfLines={1}>
                Potocznie: {item.commonNicknames.join(', ')}
              </Text>
            ) : (
              <View style={styles.nicknamesSpacer} />
            )}

            <View style={styles.cardFooter}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>🍄 {hymenophoreLabel}</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>📅 {monthsStr}</Text>
              </View>
              {item.confusionRisks.some((r) => r.fatal) && (
                <View style={[styles.tag, styles.tagDanger]}>
                  <Text style={styles.tagDangerText}>☠ Sobowtór!</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Pasek Wyszukiwania */}
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('atlas.searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtry Jadalności */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.filterText, statusFilter === 'ALL' && styles.filterTextActive]}>
              Wszystkie ({MUSHROOMS_DATABASE.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'EDIBLE' && styles.filterChipActive]}
            onPress={() => setStatusFilter('EDIBLE')}
          >
            <Text style={[styles.filterText, statusFilter === 'EDIBLE' && styles.filterTextActive]}>
              🟢 Jadalne
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'DEADLY_POISONOUS' && styles.filterChipActive]}
            onPress={() => setStatusFilter('DEADLY_POISONOUS')}
          >
            <Text style={[styles.filterText, statusFilter === 'DEADLY_POISONOUS' && styles.filterTextActive]}>
              ☠ Śmiertelne
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtry Spodu / Hymenoforu */}
        <View style={styles.filtersRowSecondary}>
          <TouchableOpacity
            style={[styles.chipSecondary, hymenophoreFilter === 'TUBES' && styles.chipSecondaryActive]}
            onPress={() => setHymenophoreFilter(hymenophoreFilter === 'TUBES' ? 'ALL' : 'TUBES')}
          >
            <Text style={[styles.chipSecText, hymenophoreFilter === 'TUBES' && styles.chipSecTextActive]}>
              Rurki ("gąbka")
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chipSecondary, hymenophoreFilter === 'GILLS' && styles.chipSecondaryActive]}
            onPress={() => setHymenophoreFilter(hymenophoreFilter === 'GILLS' ? 'ALL' : 'GILLS')}
          >
            <Text style={[styles.chipSecText, hymenophoreFilter === 'GILLS' && styles.chipSecTextActive]}>
              Blaszki
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chipSecondary, hymenophoreFilter === 'FOLDS' && styles.chipSecondaryActive]}
            onPress={() => setHymenophoreFilter(hymenophoreFilter === 'FOLDS' ? 'ALL' : 'FOLDS')}
          >
            <Text style={[styles.chipSecText, hymenophoreFilter === 'FOLDS' && styles.chipSecTextActive]}>
              Listewki
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista Grzybów */}
        <FlatList
          data={filteredMushrooms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍄</Text>
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              {/szatan/.test(searchQuery.toLowerCase()) ? (
                <Text style={styles.emptyDesc} testID="atlas-szatan-notice">
                  Borowik szatański (Rubroboletus satanas) nie jest opisany w tym atlasie. To nie jest goryczak żółciowy. Brak karty nie oznacza, że grzyb jest jadalny.
                </Text>
              ) : (
                <Text style={styles.emptyDesc}>Nie znaleziono grzyba odpowiadającego wybranym filtrom.</Text>
              )}
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
    paddingTop: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 6,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
  },
  filterChipActive: {
    backgroundColor: '#1B3B22',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filtersRowSecondary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  chipSecondary: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFF',
  },
  chipSecondaryActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  chipSecText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chipSecTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  cardThumbnailMissing: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardThumbnailMissingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  namePl: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  nameLatin: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 1,
  },
  nicknames: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
  },
  nicknamesSpacer: {
    height: 12,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  tagDanger: {
    backgroundColor: '#FEE2E2',
  },
  tagDangerText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});
