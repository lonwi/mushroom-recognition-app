import type { ThemeName } from '@/core/theme';

/**
 * Pileus v1.0 — jedno źródło prawdy dla koloru, siatki, pisma i kinetyki (D-03).
 * Trzy motywy terenowe:
 *  - Light: Dzień, ciepły papier botaniczny (Nordic Botanical Paper), wysoka czytelność
 *  - Dark: Las / noc, oszczędność baterii (Forest Nocturne OLED-friendly)
 *  - High Contrast: Ostre słońce, okulary polaryzacyjne, WCAG AAA (zero szarości, czysty czarny/biały)
 */

export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
} as const;

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  gutter: 16,
  cardPadding: 16,
  sectionGap: 24,
  inlineGap: 8,
} as const;

export const touchTargetMinDp = 48;

export const touchTarget = {
  min: 48,
  comfortable: 56,
  skanerPill: { width: 120, height: 48 },
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  headlineLg: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.bold },
  headlineMd: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.bold },
  speciesLatin: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.semibold,
    fontStyle: 'italic' as const,
  },
  bodyDefault: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  labelBadge: { fontSize: 10, lineHeight: 12, fontFamily: fontFamily.bold, letterSpacing: 0.5 },
} as const;

/**
 * Elewacja bez rozmyć (Zero blur > 4px).
 * Wszystkie cienie są ostre, imitujące papierowe zagęszczenia (fable-4 §2.3.4).
 */
export const elevation = {
  level0: { borderWidth: 1 },
  level1: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  level2: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 2,
  },
  level3: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 3,
  },
} as const;

export const motion = {
  touchFeedback: 80,
  focusRing: 150,
  modalSpring: 200,
  sheetSlide: 250,
} as const;

export type { ThemeName };

export interface SemanticBadgeColors {
  bg: string;
  text: string;
  border: string;
}

export interface ThemeColors {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  focus: string;
  danger: string;
  warning: string;
  edible: SemanticBadgeColors;
  inedible: SemanticBadgeColors;
  disputed: SemanticBadgeColors;
  poisonous: SemanticBadgeColors;
  deadly: SemanticBadgeColors;
}

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    paper: '#F6F5F1',
    ink: '#1B382B',
    muted: '#3E5348',
    accent: '#1B382B',
    onAccent: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#EAE6DC',
    border: '#DCDAD3',
    borderStrong: '#767B74',
    focus: '#1D4ED8',
    danger: '#AD1414',
    warning: '#92400E',
    edible: { bg: '#E8F5E9', text: '#1F6B2A', border: '#81C784' },
    inedible: { bg: '#FFF3E0', text: '#9A3412', border: '#FFB74D' },
    disputed: { bg: '#FFF8E1', text: '#8A5A12', border: '#FFE082' },
    poisonous: { bg: '#FFEBEE', text: '#B71C1C', border: '#FF8A80' },
    deadly: { bg: '#2A080C', text: '#FF4560', border: '#FF1744' },
  },
  dark: {
    paper: '#121614',
    ink: '#F4F1E8',
    muted: '#A3ABA5',
    accent: '#8FC7A4',
    onAccent: '#121614',
    surface: '#1C2420',
    surfaceRaised: '#222A26',
    border: '#2E3833',
    borderStrong: '#6B7A72',
    focus: '#93C5FD',
    danger: '#FF6B6B',
    warning: '#FBBF24',
    edible: { bg: '#14261A', text: '#81C784', border: '#2E5B37' },
    inedible: { bg: '#2B1D0A', text: '#FFB74D', border: '#664414' },
    disputed: { bg: '#262010', text: '#FFD54F', border: '#5C4A1A' },
    poisonous: { bg: '#2D1212', text: '#FF8A80', border: '#662525' },
    deadly: { bg: '#2A080C', text: '#FF4560', border: '#FF1744' },
  },
  highContrast: {
    paper: '#000000',
    ink: '#FFFFFF',
    muted: '#FFFFFF',
    accent: '#FFFFFF',
    onAccent: '#000000',
    surface: '#000000',
    surfaceRaised: '#000000',
    border: '#FFFFFF',
    borderStrong: '#FFFFFF',
    focus: '#FFFFFF',
    danger: '#FF0000',
    warning: '#FFFF00',
    edible: { bg: '#000000', text: '#00FF66', border: '#00FF66' },
    inedible: { bg: '#000000', text: '#FFB300', border: '#FFB300' },
    disputed: { bg: '#000000', text: '#FFCC00', border: '#FFCC00' },
    poisonous: { bg: '#000000', text: '#FF3333', border: '#FF3333' },
    deadly: { bg: '#2A080C', text: '#FFFFFF', border: '#FF1744' },
  },
};

/**
 * Plakietka śmiertelnie trującego (Deadly Poisonous Badge).
 * W High Contrast biały tekst (#FFFFFF) na #2A080C daje kontrast 18.45:1 (WCAG AAA).
 * W Light/Dark tekst #FF4560 na #2A080C daje kontrast 5.51:1 (WCAG AA).
 */
export const deadlyBadge = {
  background: '#2A080C',
  text: '#FF4560',
  border: '#FF1744',
  textHighContrast: '#FFFFFF',
} as const;

export function getDeadlyBadgeColors(theme: ThemeName = 'light') {
  const isHc = theme === 'highContrast';
  return {
    background: deadlyBadge.background,
    text: isHc ? deadlyBadge.textHighContrast : deadlyBadge.text,
    border: deadlyBadge.border,
    borderWidth: isHc ? 2 : 1.5,
  };
}

/**
 * Kolor jadalności jest zarezerwowany dla statusu z bazy. `CONDITIONALLY_EDIBLE`
 * nigdy nie dostaje zieleni (D-12). Instrukcji obróbki tu nie ma.
 */
export const edibilityInk = {
  edible: themes.light.edible.text,
  disputed: themes.light.disputed.text,
  inedible: themes.light.inedible.text,
  poisonous: themes.light.poisonous.text,
  deadly: deadlyBadge.text,
} as const;

export const edibilityPresentation = {
  EDIBLE: 'edible',
  CONDITIONALLY_EDIBLE: 'disputed',
  INEDIBLE: 'inedible',
  POISONOUS: 'poisonous',
  DEADLY_POISONOUS: 'deadly',
} as const;

/** Jedyne zielone tokeny jadalności. Nowy zielony kolor dopisz tutaj, inaczej test go nie pilnuje. */
export const greenEdibilityTokens = {
  edible: themes.light.edible.text,
} as const;

export type StoredEdibility = keyof typeof edibilityPresentation;

function edibilityTone(
  status: StoredEdibility,
  statusDisputed: boolean,
  incompleteCard = false,
): keyof typeof edibilityPresentation {
  if (statusDisputed || incompleteCard || status === 'CONDITIONALLY_EDIBLE')
    return 'CONDITIONALLY_EDIBLE';
  return status;
}

export function edibilityColor(
  status: StoredEdibility,
  statusDisputed = false,
  incompleteCard = false,
  theme: ThemeName = 'light',
): string {
  const tone = edibilityTone(status, statusDisputed, incompleteCard);
  const key = edibilityPresentation[tone];
  return themes[theme][key].text;
}

export function getStatusBadgeColors(
  status: StoredEdibility,
  statusDisputed = false,
  theme: ThemeName = 'light',
  incompleteCard = false,
): SemanticBadgeColors {
  if (status === 'DEADLY_POISONOUS') {
    const d = getDeadlyBadgeColors(theme);
    return { bg: d.background, text: d.text, border: d.border };
  }
  const tone = edibilityTone(status, statusDisputed, incompleteCard);
  const key = edibilityPresentation[tone];
  return themes[theme][key];
}
