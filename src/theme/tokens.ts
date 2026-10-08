/**
 * Single source for colour, spacing, radius, and type size.
 * Screens import these tokens instead of hex literals.
 * Status colours match `paperTheme`. The deadly badge keeps a lighter label
 * than its border: `#FF4560` on `#2A080C` is 5.51:1 (the old chip was 5.18:1
 * for `#FF4560` on `#3E000C`). Border `#FF1744` on the species header
 * `#064E3B` is 2.53:1; `#D50000` there was only 1.77:1.
 */
export const colors = {
  white: '#FFFFFF',
  black: '#000000',

  primary: '#1B3B22',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D1E7D5',
  onPrimaryContainer: '#0B2613',

  secondary: '#2C5E37',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8F5E9',
  onSecondaryContainer: '#133519',

  tertiary: '#8D5B28',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FCEFD8',
  onTertiaryContainer: '#351C03',

  edible: '#2E7D32',
  edibleBg: '#E8F5E9',
  edibleBorder: '#81C784',

  inedible: '#E65100',
  inedibleBg: '#FFF3E0',
  inedibleBorder: '#FFB74D',

  poisonous: '#C62828',
  poisonousBg: '#FFEBEE',
  poisonousBorder: '#EF5350',

  deadly: '#FF1744',
  deadlyBg: '#2A080C',
  /** Badge label. Lighter than `deadly` so text on `deadlyBg` stays above 5.18:1. */
  deadlyText: '#FF4560',
  /** Same red as `deadly`. Darker `#D50000` fails on the `#064E3B` species header. */
  deadlyBorder: '#FF1744',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  outline: '#CBD5E1',

  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald200: '#A7F3D0',
  emerald300: '#6EE7B7',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  /** Tailwind emerald-800. */
  emerald800: '#065F46',
  /** Tailwind emerald-900. Species-card header. */
  emerald900: '#064E3B',

  green400: '#4ADE80',
  green600: '#16A34A',
  green700: '#15803D',
  green800: '#166534',
  green950: '#14532D',

  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red300: '#FCA5A5',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',
  red900: '#7F1D1D',
  redDeep: '#B71C1C',
  redMaterial: '#D32F2F',
  redInk: '#491217',
  rose600: '#E11D48',

  orange50: '#FFF7ED',
  orange100: '#FFEDD5',
  orange300: '#FDBA74',
  orange700: '#C2410C',
  orange800: '#9A3412',
  orange900: '#7C2D12',
  orangeDeep: '#D84315',

  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber500: '#F59E0B',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',
  amberMaterial: '#FFA000',
  amberMaterialLight: '#FFB300',
  amberMaterialBg: '#FFF8E1',
  amberMaterialBgLight: '#FFFDE7',

  blue50: '#EFF6FF',
  blue300: '#93C5FD',
  blueInk: '#1E3A5F',

  canvas: '#F3F6F3',
  sheet: '#F9FBF9',
  gray100: '#EDF2F7',
  gray300: '#E0E0E0',
  gray333: '#333333',
  gray555: '#555555',
  gray600: '#4A5568',
  gray800: '#424242',
  gray900: '#212121',
  brown600: '#6D4C41',
} as const;

export const edibilityColors = {
  EDIBLE: {
    background: colors.edibleBg,
    text: colors.edible,
    border: colors.edibleBorder,
  },
  INEDIBLE: {
    background: colors.inedibleBg,
    // `#E65100` on `#FFF3E0` is 3.46:1. `orange700` on the same fill is 4.72:1.
    text: colors.orange700,
    border: colors.inedibleBorder,
  },
  POISONOUS: {
    background: colors.poisonousBg,
    text: colors.poisonous,
    border: colors.poisonousBorder,
  },
  DEADLY_POISONOUS: {
    background: colors.deadlyBg,
    text: colors.deadlyText,
    border: colors.deadlyBorder,
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  pill: 12,
} as const;

export const typography = {
  caption: 10,
  small: 12,
  body: 14,
  title: 16,
  headline: 20,
} as const;
