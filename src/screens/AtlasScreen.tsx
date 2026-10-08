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
import { HYMENOPHORE_FILTERS, HYMENOPHORE_META } from '../presentation/speciesMeta';
import { SpeciesStatusBadge } from '../components/EdibilityBadge';
import { useLanguage } from '../contexts/LanguageContext';
import { getMushroomImage } from '../utils/mushroomImages';
import { colors } from '../theme/tokens';

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
    const hymenophoreLabel = t(HYMENOPHORE_META[item.hymenophore].labelKey);

    const monthsStr = t('atlas.monthRange', {
      start: item.months[0],
      end: item.months[item.months.length - 1],
    });

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
                {item.nameEn ? <Text style={styles.nameEn}>{item.nameEn}</Text> : null}
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
                {t('atlas.colloquial', { names: item.commonNicknames.join(', ') })}
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
            placeholderTextColor={colors.slate400}
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
          {t('atlas.scopeNotice', { count: MUSHROOMS_DATABASE.length })}
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
          {HYMENOPHORE_FILTERS.map((type) => {
            const label = t(HYMENOPHORE_META[type].labelKey);
            return (
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
            );
          })}
        </View>

        <Text style={styles.resultCount} testID="atlas-result-count">
          {t('atlas.resultCount', { count: filteredMushrooms.length })}
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingTop: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate900,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.slate400,
    padding: 6,
  },
  scopeNotice: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: colors.orange900,
    backgroundColor: colors.orange50,
    borderColor: colors.orange300,
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
    color: colors.blueInk,
    backgroundColor: colors.blue50,
    borderColor: colors.blue300,
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
    backgroundColor: colors.gray100,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray600,
  },
  filterTextActive: {
    color: colors.white,
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
    color: colors.slate700,
  },
  chipSecondary: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.white,
  },
  chipSecondaryActive: {
    backgroundColor: colors.edible,
    borderColor: colors.edible,
  },
  chipSecText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
  },
  chipSecTextActive: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
    shadowColor: colors.black,
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
    backgroundColor: colors.slate200,
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
    color: colors.slate500,
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
    color: colors.slate900,
  },
  nameEn: {
    fontSize: 12,
    color: colors.slate600,
    marginTop: 1,
  },
  nameLatin: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.slate500,
    marginTop: 1,
  },
  nicknames: {
    fontSize: 12,
    color: colors.slate400,
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
    backgroundColor: colors.surfaceVariant,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.slate600,
    fontWeight: '600',
  },
  tagDanger: {
    backgroundColor: colors.red100,
  },
  tagDangerText: {
    color: colors.red600,
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
    color: colors.slate700,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginTop: 4,
  },
});
