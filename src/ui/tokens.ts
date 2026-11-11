import type { ThemeName } from '@/core/theme';

/**
 * Pileus — jedno źródło prawdy dla koloru, siatki i pisma (D-03).
 * NativeWind czyta te wartości przez zmienne CSS ustawiane w `theme-vars.ts`.
 * Klasy Tailwind używamy tylko na krokach 8 px (w skali 4 px Tailwinda: 2, 4, 6, 8, 12).
 */

export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
} as const;

export const touchTargetMinDp = 48;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export type { ThemeName };

export interface ThemeColors {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  surface: string;
  border: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    paper: '#F6F5F1',
    ink: '#1B382B',
    muted: '#3E5348',
    accent: '#1B382B',
    onAccent: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#DCDAD3',
  },
  dark: {
    paper: '#121614',
    ink: '#F4F1E8',
    muted: '#C9C6BC',
    accent: '#E4EDE4',
    onAccent: '#121614',
    surface: '#1C2420',
    border: '#3C4640',
  },
  highContrast: {
    paper: '#000000',
    ink: '#FFFFFF',
    muted: '#FFFFFF',
    accent: '#FFFFFF',
    onAccent: '#000000',
    surface: '#000000',
    border: '#FFFFFF',
  },
};

/** Plakietka śmiertelnie trującego. Tekst na tle ma kontrast co najmniej 5.18:1. */
export const deadlyBadge = {
  background: '#2A080C',
  text: '#FF4560',
  border: '#FF1744',
} as const;

/**
 * Kolor jadalności jest zarezerwowany dla statusu z bazy. `CONDITIONALLY_EDIBLE`
 * nigdy nie dostaje zieleni (D-12). Instrukcji obróbki tu nie ma.
 */
export const edibilityInk = {
  edible: '#1B7F4E',
  disputed: '#8A5A12',
  inedible: '#8A5A12',
  poisonous: '#9B2335',
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
  edible: edibilityInk.edible,
} as const;

export type StoredEdibility = keyof typeof edibilityPresentation;

function edibilityTone(
  status: StoredEdibility,
  statusDisputed: boolean,
): keyof typeof edibilityInk {
  if (statusDisputed || status === 'CONDITIONALLY_EDIBLE') return 'disputed';
  return edibilityPresentation[status];
}

export function edibilityColor(status: StoredEdibility, statusDisputed: boolean): string {
  return edibilityInk[edibilityTone(status, statusDisputed)];
}
