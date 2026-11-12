import { Pressable, View } from 'react-native';

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

export function SpeciesCard({ item, onPress, edibilityLabel }: SpeciesCardProps) {
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.latinName}, ${edibilityLabel}`}
      onPress={() => onPress(item.id)}
      className="mb-3 flex-row items-center justify-between rounded-xl border border-border bg-surface p-4"
      style={{ minHeight: touchTargetMinDp }}
    >
      <View className="mr-3 flex-1">
        <View className="flex-row items-center">
          <AppText emphasis className="text-base text-ink">
            {item.name}
          </AppText>
        </View>
        <LatinBinomial name={item.latinName} className="text-xs" />
        {hymenophoreText ? (
          <AppText className="mt-1 text-xs text-muted">{hymenophoreText}</AppText>
        ) : null}
      </View>
      <View className="items-end">
        <EdibilityBadge
          status={item.edibility}
          statusDisputed={item.statusDisputed}
          label={edibilityLabel}
        />
      </View>
    </Pressable>
  );
}
