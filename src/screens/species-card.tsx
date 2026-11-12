import { Image, Pressable, View } from 'react-native';

import type { SpeciesListItem } from '@/core/db/species-search';
import { EdibilityBadge } from '@/ui/badge';
import { LatinBinomial } from '@/ui/latin-binomial';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

export interface SpeciesCardProps {
  item: SpeciesListItem;
  onPress: (id: string) => void;
  edibilityLabel: string;
}

const POLISH_MONTHS = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
];

function formatMonthsRange(months: number[]): string {
  if (!months || months.length === 0) return '';
  const min = Math.min(...months);
  const max = Math.max(...months);
  if (min === max) return POLISH_MONTHS[min - 1] ?? '';
  return `${POLISH_MONTHS[min - 1]} – ${POLISH_MONTHS[max - 1]}`;
}

export function SpeciesCard({ item, onPress, edibilityLabel }: SpeciesCardProps) {
  const currentMonth = new Date().getMonth() + 1;
  const inSeasonNow = item.months.includes(currentMonth);
  const seasonText = formatMonthsRange(item.months);

  const hymenophoreMap: Record<string, string> = {
    TUBES: 'rurki',
    GILLS: 'blaszki',
    FOLDS: 'listewki',
    SPINES: 'kolce',
    OTHER: 'inny',
  };

  const hymenophoreText = item.hymenophore
    ? (hymenophoreMap[item.hymenophore] ?? item.hymenophore)
    : null;

  const subtitleTraits = [item.habitat, hymenophoreText].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.latinName}, ${edibilityLabel}`}
      onPress={() => onPress(item.id)}
      className="mb-3.5 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xs"
      style={{ minHeight: touchTargetMinDp }}
    >
      {/* Obszar zdjęcia lub ryciny botanicznej */}
      <View className="relative h-44 w-full overflow-hidden bg-paperActive/50">
        {item.primaryPhoto?.file ? (
          <Image
            source={{ uri: item.primaryPhoto.file }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityLabel={item.name}
          />
        ) : (
          <View className="h-full w-full items-center justify-center p-4">
            <AppText className="text-3xl opacity-40">🍄</AppText>
            <AppText className="mt-1 text-xs font-semibold tracking-wider text-muted opacity-80 uppercase">
              Rycina botaniczna
            </AppText>
          </View>
        )}

        {/* Plakietka statusu w prawym górnym rogu */}
        <View className="absolute top-3 right-3 z-10 shadow-sm">
          <EdibilityBadge
            status={item.edibility}
            statusDisputed={item.statusDisputed}
            label={edibilityLabel}
            incompleteCard={item.incompleteCard}
          />
        </View>
      </View>

      {/* Szczegóły gatunku w stylu Nordic Field Guide */}
      <View className="px-4.5 pt-3.5 pb-4">
        <View className="flex-row items-baseline justify-between">
          <AppText emphasis className="text-lg font-bold tracking-tight text-ink">
            {item.name}
          </AppText>
        </View>

        <LatinBinomial name={item.latinName} className="mt-0.5 text-xs text-muted" />

        {/* Delikatna linia podziału */}
        <View className="my-2.5 h-[1px] bg-border/60" />

        {/* Dolny wiersz: siedlisko / cecha po lewej, sezon po prawej */}
        <View className="flex-row items-center justify-between">
          <View className="mr-2 flex-1 flex-row items-center">
            <AppText className="mr-1 text-xs opacity-70">🌲</AppText>
            <AppText className="text-xs text-muted" numberOfLines={1}>
              {subtitleTraits || 'Lasy i polany'}
            </AppText>
          </View>

          {seasonText ? (
            <View
              className={`flex-row items-center rounded-full px-2.5 py-0.5 ${
                inSeasonNow ? 'bg-paperActive' : 'bg-transparent'
              }`}
            >
              {inSeasonNow ? <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
              <AppText
                className={`text-[11px] ${
                  inSeasonNow ? 'font-bold text-ink' : 'font-medium text-muted'
                }`}
              >
                {inSeasonNow ? `W sezonie (${seasonText})` : `Sezon: ${seasonText}`}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
