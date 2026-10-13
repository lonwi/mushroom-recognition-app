import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { EdibilityStatus, HymenophoreType } from '../types/mushroom';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const HYMENOPHORE_META: Record<HymenophoreType, { labelKey: string; icon: IoniconName }> = {
  TUBES: { labelKey: 'atlas.hymenophoreTubes', icon: 'grid-outline' },
  GILLS: { labelKey: 'atlas.hymenophoreGills', icon: 'reorder-four-outline' },
  FOLDS: { labelKey: 'atlas.hymenophoreFolds', icon: 'water-outline' },
  SPINES: { labelKey: 'atlas.hymenophoreSpines', icon: 'pin-outline' },
  OTHER: { labelKey: 'atlas.hymenophoreOther', icon: 'help-circle-outline' },
};

/** Atlas filter chips. Order is the order shown on the atlas screen. */
export const HYMENOPHORE_FILTERS: readonly HymenophoreType[] = ['TUBES', 'GILLS', 'SPINES', 'FOLDS', 'OTHER'];

export const EDIBILITY_BADGE: Record<EdibilityStatus, { labelKey: string; icon: string }> = {
  EDIBLE: { labelKey: 'edibility.edible', icon: '✓' },
  INEDIBLE: { labelKey: 'edibility.inedible', icon: '⚠' },
  POISONOUS: { labelKey: 'edibility.poisonous', icon: '✕' },
  DEADLY_POISONOUS: { labelKey: 'edibility.deadly', icon: '☠' },
};

export const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;
