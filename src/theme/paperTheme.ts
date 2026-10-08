import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { colors } from './tokens';

/** Paper palette. Values come from `colors` so badges and the provider cannot drift. */
export const mushroomForestColors = {
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  primaryContainer: colors.primaryContainer,
  onPrimaryContainer: colors.onPrimaryContainer,

  secondary: colors.secondary,
  onSecondary: colors.onSecondary,
  secondaryContainer: colors.secondaryContainer,
  onSecondaryContainer: colors.onSecondaryContainer,

  tertiary: colors.tertiary,
  onTertiary: colors.onTertiary,
  tertiaryContainer: colors.tertiaryContainer,
  onTertiaryContainer: colors.onTertiaryContainer,

  edible: colors.edible,
  edibleBg: colors.edibleBg,
  edibleBorder: colors.edibleBorder,

  inedible: colors.inedible,
  inedibleBg: colors.inedibleBg,
  inedibleBorder: colors.inedibleBorder,

  poisonous: colors.poisonous,
  poisonousBg: colors.poisonousBg,
  poisonousBorder: colors.poisonousBorder,

  deadly: colors.deadly,
  deadlyBg: colors.deadlyBg,
  deadlyBorder: colors.deadlyBorder,

  background: colors.background,
  surface: colors.surface,
  surfaceVariant: colors.surfaceVariant,
  outline: colors.outline,
};

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: mushroomForestColors.primary,
    onPrimary: mushroomForestColors.onPrimary,
    primaryContainer: mushroomForestColors.primaryContainer,
    onPrimaryContainer: mushroomForestColors.onPrimaryContainer,
    secondary: mushroomForestColors.secondary,
    onSecondary: mushroomForestColors.onSecondary,
    secondaryContainer: mushroomForestColors.secondaryContainer,
    onSecondaryContainer: mushroomForestColors.onSecondaryContainer,
    tertiary: mushroomForestColors.tertiary,
    onTertiary: mushroomForestColors.onTertiary,
    tertiaryContainer: mushroomForestColors.tertiaryContainer,
    onTertiaryContainer: mushroomForestColors.onTertiaryContainer,
    background: mushroomForestColors.background,
    surface: mushroomForestColors.surface,
    surfaceVariant: mushroomForestColors.surfaceVariant,
    outline: mushroomForestColors.outline,
    error: mushroomForestColors.poisonous,
  },
  roundness: 12,
};
