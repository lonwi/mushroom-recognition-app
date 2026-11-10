import { vars } from 'nativewind';

import type { ThemeName } from '@/core/theme';

import { themes } from '@/ui/tokens';

/** Zmienne NativeWind z tokenów. Jedno źródło prawdy zostaje w `tokens.ts`. */
export function themeVars(theme: ThemeName) {
  const colors = themes[theme];
  return vars({
    '--color-paper': colors.paper,
    '--color-ink': colors.ink,
    '--color-muted': colors.muted,
    '--color-accent': colors.accent,
    '--color-on-accent': colors.onAccent,
    '--color-surface': colors.surface,
    '--color-border': colors.border,
  });
}
