import { MD3LightTheme, MD3Theme } from 'react-native-paper';

export const mushroomForestColors = {
  // Leśna paleta główna
  primary: '#1B3B22',       // Głęboka leśna zieleń (moss / pine)
  onPrimary: '#FFFFFF',
  primaryContainer: '#D1E7D5',
  onPrimaryContainer: '#0B2613',

  secondary: '#2C5E37',     // Średnia zieleń leśna
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8F5E9',
  onSecondaryContainer: '#133519',

  tertiary: '#8D5B28',      // Borowikowy brąz
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FCEFD8',
  onTertiaryContainer: '#351C03',

  // Statusy jadalności
  edible: '#2E7D32',        // Jadalny - soczysty szmaragd
  edibleBg: '#E8F5E9',
  edibleBorder: '#81C784',

  inedible: '#E65100',      // Niejadalny - pomarańcz ostrzegawczy
  inedibleBg: '#FFF3E0',
  inedibleBorder: '#FFB74D',

  poisonous: '#C62828',     // Trujący - jaskrawa czerwień
  poisonousBg: '#FFEBEE',
  poisonousBorder: '#EF5350',

  deadly: '#FF1744',        // Śmiertelnie trujący - purpura / neon czerwień
  deadlyBg: '#2A080C',
  deadlyBorder: '#D50000',

  // Tła i powierzchnie
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  outline: '#CBD5E1',
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
