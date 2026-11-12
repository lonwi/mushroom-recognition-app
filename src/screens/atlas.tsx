import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { searchSpecies, type SpeciesListItem } from '@/core/db/species-search';
import { messagesFor } from '@/core/i18n';
import { getSpeciesDb } from '@/infra/db/species-db';
import { useSettings } from '@/infra/settings/use-settings-store';
import { SpeciesCard } from '@/screens/species-card';
import { ThemeFrame } from '@/screens/theme-frame';
import { FilterChip } from '@/ui/chip';
import { SearchBar } from '@/ui/search-bar';
import { AppText } from '@/ui/text';
import { themes } from '@/ui/tokens';

const PAGE_SIZE = 30;

export default function AtlasScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const colors = themes[theme];

  const [query, setQuery] = useState('');
  const [selectedEdibility, setSelectedEdibility] = useState<string | null>(null);
  const [selectedHymenophore, setSelectedHymenophore] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const db = useMemo(() => getSpeciesDb(), []);

  const edibilityFilter = useMemo(() => {
    if (!selectedEdibility) return undefined;
    if (selectedEdibility === 'POISONOUS_ALL') {
      return ['POISONOUS', 'DEADLY_POISONOUS'];
    }
    return [selectedEdibility];
  }, [selectedEdibility]);

  const hymenophoreFilter = useMemo(() => {
    if (!selectedHymenophore) return undefined;
    return [selectedHymenophore];
  }, [selectedHymenophore]);

  const items = useMemo(() => {
    try {
      return searchSpecies(db, {
        query: query.trim() || undefined,
        edibility: edibilityFilter,
        hymenophore: hymenophoreFilter,
        limit,
        offset: 0,
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[AtlasScreen] searchSpecies error:', err);
      }
      return [];
    }
  }, [db, query, edibilityFilter, hymenophoreFilter, limit]);

  const edibilityLabels: Record<string, string> = {
    EDIBLE: messages.atlas.edibilityEdible,
    CONDITIONALLY_EDIBLE: messages.atlas.edibilityConditionally,
    INEDIBLE: messages.atlas.edibilityInedible,
    POISONOUS: messages.atlas.edibilityPoisonous,
    DEADLY_POISONOUS: messages.atlas.edibilityDeadly,
  };

  const getEdibilityLabel = (item: SpeciesListItem) => {
    if (item.statusDisputed) return messages.atlas.edibilityDisputed;
    if (!item.edibility) return '';
    return edibilityLabels[item.edibility] ?? item.edibility;
  };

  const handleClearFilters = () => {
    setSelectedEdibility(null);
    setSelectedHymenophore(null);
    setLimit(PAGE_SIZE);
  };

  const countLabel = useMemo(() => {
    const count = items.length;
    if (count === 1) return 'gatunek';
    if (count >= 2 && count <= 4) return 'gatunki';
    return 'gatunków';
  }, [items.length]);

  return (
    <ThemeFrame>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SpeciesCard
            item={item}
            onPress={(id) => router.push(`/species/${id}`)}
            edibilityLabel={getEdibilityLabel(item)}
          />
        )}
        onEndReached={() => {
          if (items.length >= limit) {
            setLimit((prev) => prev + PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Tytuł Atlasu i licznik gatunków wg wzorca Stitch */}
            <View className="mb-3 flex-row items-baseline justify-between pt-1">
              <AppText emphasis className="text-3xl font-extrabold tracking-tight text-ink">
                Atlas
              </AppText>
              <View className="flex-row items-baseline">
                <AppText emphasis className="text-base font-bold italic text-ink">
                  {items.length}
                </AppText>
                <AppText className="ml-1 text-xs text-muted">{countLabel}</AppText>
              </View>
            </View>

            {/* Pasek wyszukiwania */}
            <SearchBar
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setLimit(PAGE_SIZE);
              }}
              placeholder={messages.atlas.searchPlaceholder}
              placeholderTextColor={colors.muted}
              textColor={colors.ink}
              clearAccessibilityLabel={messages.atlas.searchClear}
            />

            {/* Pigułki filtrów terenowych */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 py-1">
              <FilterChip
                label={messages.atlas.filterAll}
                selected={!selectedEdibility && !selectedHymenophore}
                onPress={handleClearFilters}
              />
              <FilterChip
                label={messages.atlas.filterEdible}
                selected={selectedEdibility === 'EDIBLE'}
                onPress={() => {
                  setSelectedEdibility(selectedEdibility === 'EDIBLE' ? null : 'EDIBLE');
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterPoisonous}
                selected={selectedEdibility === 'POISONOUS_ALL'}
                onPress={() => {
                  setSelectedEdibility(
                    selectedEdibility === 'POISONOUS_ALL' ? null : 'POISONOUS_ALL',
                  );
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterDeadly}
                selected={selectedEdibility === 'DEADLY_POISONOUS'}
                onPress={() => {
                  setSelectedEdibility(
                    selectedEdibility === 'DEADLY_POISONOUS' ? null : 'DEADLY_POISONOUS',
                  );
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterInedible}
                selected={selectedEdibility === 'INEDIBLE'}
                onPress={() => {
                  setSelectedEdibility(selectedEdibility === 'INEDIBLE' ? null : 'INEDIBLE');
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterDisputed}
                selected={selectedEdibility === 'CONDITIONALLY_EDIBLE'}
                onPress={() => {
                  setSelectedEdibility(
                    selectedEdibility === 'CONDITIONALLY_EDIBLE' ? null : 'CONDITIONALLY_EDIBLE',
                  );
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterTubes}
                selected={selectedHymenophore === 'rurki'}
                onPress={() => {
                  setSelectedHymenophore(selectedHymenophore === 'rurki' ? null : 'rurki');
                  setLimit(PAGE_SIZE);
                }}
              />
              <FilterChip
                label={messages.atlas.filterGills}
                selected={selectedHymenophore === 'blaszki'}
                onPress={() => {
                  setSelectedHymenophore(selectedHymenophore === 'blaszki' ? null : 'blaszki');
                  setLimit(PAGE_SIZE);
                }}
              />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <AppText className="text-4xl opacity-40">🔍</AppText>
            <AppText emphasis className="mt-3 text-lg text-ink">
              {messages.atlas.emptyTitle}
            </AppText>
            <AppText className="mt-2 text-center text-sm text-muted">
              {messages.atlas.emptyMessage}
            </AppText>
          </View>
        }
      />
    </ThemeFrame>
  );
}
