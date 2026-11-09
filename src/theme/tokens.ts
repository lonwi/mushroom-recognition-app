/**
 * Single source for colour, spacing, radius, and typography.
 * Screens and components import these tokens instead of hardcoded literals.
 * Aligned with Grzybobranie Design System v1.0.
 */
export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Grzybobranie Design System v1.0 canonical tokens (DESIGN.md)
  primaryGreen: '#1b382b',
  primaryGreenHover: '#152e23',
  paper: '#f6f5f1',
  paperActive: '#eae6dc',
  surfaceCard: '#ffffff',
  borderSubtle: '#dcdad3',
  softGreenBg: '#f4f7f4',
  accentRed: '#ad1414',
  accentRedSoft: '#fdf2f2',
  warningAmber: '#d97706',
  warningSoft: '#fef3c7',

  // Semantic mappings
  primary: '#1b382b',
  onPrimary: '#FFFFFF',
  primaryContainer: '#eae6dc',
  onPrimaryContainer: '#1b382b',

  secondary: '#2C5E37',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#f4f7f4',
  onSecondaryContainer: '#152e23',

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
  /** Badge label. Contrast on `deadlyBg` stays above 5.5:1 (WCAG AA+). */
  deadlyText: '#FF4560',
  deadlyBorder: '#FF1744',

  background: '#f6f5f1',
  appBg: '#f6f5f1',
  surface: '#ffffff',
  surfaceVariant: '#eae6dc',
  outline: '#dcdad3',

  // Tailwind neutral & slate palette
  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  neutral700: '#374151',
  neutral800: '#1f2937',
  neutral900: '#171717',

  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald200: '#A7F3D0',
  emerald300: '#6EE7B7',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
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

  scrim: 'rgba(15, 23, 42, 0.45)',
  overlayDark50: 'rgba(0, 0, 0, 0.5)',
  overlayDark55: 'rgba(0, 0, 0, 0.55)',
  overlayDark65: 'rgba(0, 0, 0, 0.65)',
  overlayDark70: 'rgba(0, 0, 0, 0.7)',
  overlayLight20: 'rgba(255, 255, 255, 0.2)',
  overlayLight25: 'rgba(255, 255, 255, 0.25)',
  overlayLight30: 'rgba(255, 255, 255, 0.3)',
  overlayDanger40: 'rgba(220, 38, 38, 0.4)',
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
  gutter: 16,
} as const;

export const radius = {
  /** 4px: Inner image crops, subtle tags */
  sm: 4,
  /** 6px: Default compact chips */
  md: 6,
  /** 8px: Standard buttons, inputs, checkboxes, Skaner CTA pill */
  lg: 8,
  /** 12px: Contained cards and modules */
  xl: 12,
  /** 16px: Modal sheets, detail panels */
  '2xl': 16,
  /** 9999px: Full pills, filter chips, status badges */
  full: 9999,
  /** Legacy alias for compatibility */
  xs: 4,
  pill: 9999,
} as const;

export const typography = {
  // Legacy scalar scale for compatibility
  caption: 10,
  small: 12,
  body: 13,
  title: 18,
  headline: 24,
  lineHeightSmall: 18,

  // Canonical type tokens matching DESIGN.md
  headlineLg: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.025,
  },
  headlineLgMobile: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.025,
  },
  headlineMd: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.01,
  },
  headlineSm: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800' as const,
  },
  speciesLatin: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  bodyDefault: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
  labelMicro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.025,
  },
  labelBadge: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.05,
  },
} as const;

export const sizing = {
  galleryPhotoHeight: 210,
  cardPhotoHeight: 210,
  shutterButtonSize: 68,
  skanerPillWidth: 52,
  skanerPillHeight: 40,
} as const;

export const devOverlayColors = {
  light: {
    background: colors.surface,
    text: colors.slate800,
    border: colors.outline,
    selected: colors.primaryContainer,
    selectedText: colors.onPrimaryContainer,
  },
  dark: {
    background: colors.slate900,
    text: colors.slate200,
    border: colors.slate700,
    selected: colors.slate700,
    selectedText: colors.slate200,
  },
} as const;
