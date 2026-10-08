import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasFatalLookAlikeRisk, MUSHROOMS_DATABASE } from '../data/mushrooms';
import { countByStatus, filterAtlasSpecies, HymenophoreFilter, StatusFilter } from '../data/atlasQuery';
import { MushroomSpecies } from '../types/mushroom';
import { SpeciesStatusBadge } from '../components/EdibilityBadge';
import { useLanguage } from '../contexts/LanguageContext';
import { getMushroomImage } from '../utils/mushroomImages';

interface Props {
  onSelectSpecies: (species: MushroomSpecies) => void;
}

export const AtlasScreen: React.FC<Props> = ({ onSelectSpecies }) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [hymenophoreFilter, setHymenophoreFilter] = useState<HymenophoreFilter>('ALL');
  const statusCounts = useMemo(() => countByStatus(MUSHROOMS_DATABASE), []);

  const filteredMushrooms = useMemo(() => {
    return filterAtlasSpecies(MUSHROOMS_DATABASE, {
      query: searchQuery,
      status: statusFilter,
      hymenophore: hymenophoreFilter,
    });
  }, [searchQuery, statusFilter, hymenophoreFilter]);

  const renderItem = ({ item }: { item: MushroomSpecies }) => {
    const hymenophoreLabel =
      item.hymenophore === 'TUBES'
        ? t('atlas.hymenophoreTubes')
        : item.hymenophore === 'GILLS'
        ? t('atlas.hymenophoreGills')
        : item.hymenophore === 'FOLDS'
        ? t('atlas.hymenophoreFolds')
        : item.hymenophore === 'SPINES'
        ? t('atlas.hymenophoreSpines')
        : t('atlas.hymenophoreOther');

    const monthsStr = t('atlas.monthRange')
      .replace('{start}', String(item.months[0]))
      .replace('{end}', String(item.months[item.months.length - 1]));

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
              <Text style={styles.cardThumbnailMissingText}>{t('cards.photoMissing')}</Text>
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
                <Text style={styles.tagText} testID={`atlas-months-${item.id}`}>{`📅 ${monthsStr}`}</Text>
              </View>
              {hasFatalLookAlikeRisk(item) && (
                <View style={[styles.tag, styles.tagDanger]}>
                  <Text style={styles.tagDangerText}>{t('atlas.lookAlikeTag')}</Text>
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

        <Text style={styles.scopeNotice} testID="atlas-scope-notice">
          {t('atlas.scopeNotice').replace('{count}', String(MUSHROOMS_DATABASE.length))}
        </Text>

        {language === 'en' ? (
          <Text style={styles.sourceLanguageNote} testID="atlas-source-language-note">
            {t('cards.sourceLanguageNote')}
          </Text>
        ) : null}

        <View style={styles.filtersRow}>
          {(
            [
              ['ALL', `${t('atlas.filterAll')} (${statusCounts.ALL})`],
              ['EDIBLE', `🟢 ${t('atlas.filterEdible')} (${statusCounts.EDIBLE})`],
              ['INEDIBLE', `🟡 ${t('atlas.filterInedible')} (${statusCounts.INEDIBLE})`],
              ['POISONOUS', `🔴 ${t('atlas.filterPoisonous')} (${statusCounts.POISONOUS})`],
              ['DEADLY_POISONOUS', `☠ ${t('atlas.filterDeadly')} (${statusCounts.DEADLY_POISONOUS})`],
              ['INCOMPLETE', `${t('atlas.filterIncomplete')} (${statusCounts.INCOMPLETE})`],
            ] as const
          ).map(([status, label]) => (
            <TouchableOpacity
              key={status}
              testID={`filter-status-${status}`}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filtersRowSecondary}>
          {(
            [
              ['TUBES', t('atlas.hymenophoreTubes')],
              ['GILLS', t('atlas.hymenophoreGills')],
              ['SPINES', t('atlas.hymenophoreSpines')],
              ['FOLDS', t('atlas.hymenophoreFolds')],
              ['OTHER', t('atlas.hymenophoreOther')],
            ] as const
          ).map(([type, label]) => (
            <TouchableOpacity
              key={type}
              testID={`filter-hymenophore-${type}`}
              style={[styles.chipSecondary, hymenophoreFilter === type && styles.chipSecondaryActive]}
              onPress={() => setHymenophoreFilter(hymenophoreFilter === type ? 'ALL' : type)}
            >
              <Text style={[styles.chipSecText, hymenophoreFilter === type && styles.chipSecTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultCount} testID="atlas-result-count">
          {t('atlas.resultCount').replace('{count}', String(filteredMushrooms.length))}
        </Text>

        {filteredMushrooms.length === 0 ? (
          <View style={styles.emptyContainer} testID="atlas-empty">
            <Text style={styles.emptyIcon}>🍄</Text>
            <Text style={styles.emptyTitle}>{t('atlas.emptyTitle')}</Text>
            {/szatan/.test(searchQuery.toLowerCase()) ? (
              <Text style={styles.emptyDesc} testID="atlas-szatan-notice">
                {t('atlas.szatanNotice')}
              </Text>
            ) : (
              <Text style={styles.emptyDesc}>{t('atlas.emptyDesc')}</Text>
            )}
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {filteredMushrooms.map((item) => (
              <View key={item.id}>{renderItem({ item })}</View>
            ))}
          </ScrollView>
        )}
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
  scopeNotice: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#7C2D12',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  sourceLanguageNote: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#1E3A5F',
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  resultCount: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
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
  list: {
    flex: 1,
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
