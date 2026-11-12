import { Image, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { SpeciesListItem } from '@/core/db/species-search';
import type { ThemeName } from '@/core/theme';
import { EdibilityBadge } from '@/ui/badge';
import { LatinBinomial } from '@/ui/latin-binomial';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

export interface SpeciesCardProps {
  item: SpeciesListItem;
  onPress: (id: string) => void;
  edibilityLabel: string;
  theme?: ThemeName;
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

function BotanicalIllustrationPlate() {
  return (
    <View className="h-full w-full items-center justify-center p-4">
      <View className="mb-2 h-14 w-14 items-center justify-center rounded-full border border-borderSubtle bg-paperActive/80">
        <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3C6.5 3 2.5 7.5 2.5 11.5C2.5 12.3 3.2 13 4 13C6.5 13 8 12.2 12 12.2C16 12.2 17.5 13 20 13C20.8 13 21.5 12.3 21.5 11.5C21.5 7.5 17.5 3 12 3Z"
            stroke="#1b382b"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 13V19.5C9.5 20.3 10.2 21 11 21H13C13.8 21 14.5 20.3 14.5 19.5V13"
            stroke="#1b382b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <Path
            d="M6 13C7.5 14.5 9.5 15.2 12 15.2C14.5 15.2 16.5 14.5 18 13"
            stroke="#1b382b"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
        </Svg>
      </View>
      <AppText className="text-[11px] font-semibold tracking-wider text-muted opacity-80 uppercase">
        Rycina botaniczna
      </AppText>
    </View>
  );
}

export function SpeciesCard({ item, onPress, edibilityLabel, theme = 'light' }: SpeciesCardProps) {
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
  const isDeadly = item.edibility === 'DEADLY_POISONOUS';

  return (
    <Pressable
      testID={`species-card-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.latinName}, ${edibilityLabel}`}
      onPress={() => onPress(item.id)}
      className={`mb-3.5 w-full overflow-hidden rounded-2xl border bg-surface shadow-2xs ${
        isDeadly ? 'border-danger/40' : 'border-border'
      }`}
      style={{ minHeight: touchTargetMinDp }}
    >
      {/* Obszar zdjęcia lub ryciny botanicznej (wysokość 180 dp) */}
      <View className="relative w-full overflow-hidden bg-paperActive/50" style={{ height: 180 }}>
        {item.primaryPhoto?.file ? (
          <Image
            source={{ uri: item.primaryPhoto.file }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityLabel={item.name}
          />
        ) : (
          <BotanicalIllustrationPlate />
        )}

        {/* Plakietka statusu w prawym górnym rogu */}
        <View className="absolute top-3 right-3 z-10 shadow-sm">
          <EdibilityBadge
            status={item.edibility}
            statusDisputed={item.statusDisputed}
            label={edibilityLabel}
            incompleteCard={item.incompleteCard}
            theme={theme}
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
        <View className="my-2.5 h-[1px] bg-borderSubtle" />

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
                inSeasonNow ? 'border border-accent/20 bg-paperActive' : 'bg-transparent'
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
