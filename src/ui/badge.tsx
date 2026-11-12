import { View } from 'react-native';

import type { ThemeName } from '@/core/theme';
import { AppText } from '@/ui/text';
import { getDeadlyBadgeColors, getStatusBadgeColors, type StoredEdibility } from '@/ui/tokens';

export interface DeadlyBadgeProps {
  label?: string;
  theme?: ThemeName;
}

/**
 * Autorski atom DeadlyBadge (Pileus v1.0).
 * W High Contrast: biały tekst (#FFFFFF) na #2A080C dający kontrast 18.45:1 (WCAG AAA)
 * oraz obramowanie 2px #FF1744.
 */
export function DeadlyBadge({ label = 'ŚMIERTELNIE TRUJĄCY', theme = 'light' }: DeadlyBadgeProps) {
  const colors = getDeadlyBadgeColors(theme);
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        borderWidth: colors.borderWidth,
      }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <AppText className="text-xs">☠️</AppText>
      <AppText
        emphasis
        className="text-[10px] uppercase tracking-wider"
        style={{ color: colors.text }}
      >
        {label}
      </AppText>
    </View>
  );
}

export interface EdibilityBadgeProps {
  status: StoredEdibility | null;
  statusDisputed?: boolean;
  label: string;
  theme?: ThemeName;
}

/**
 * Autorski atom EdibilityBadge (Pileus v1.0).
 * Czyste tokeny semantyczne per motyw. Status DEADLY_POISONOUS jest delegowany
 * bezpośrednio do DeadlyBadge.
 */
export function EdibilityBadge({
  status,
  statusDisputed = false,
  label,
  theme = 'light',
}: EdibilityBadgeProps) {
  if (!status) return null;

  if (status === 'DEADLY_POISONOUS') {
    return <DeadlyBadge label={label} theme={theme} />;
  }

  const badgeColors = getStatusBadgeColors(status, statusDisputed, theme);

  return (
    <View
      className="flex-row items-center gap-1 rounded-full border px-2 py-0.5"
      style={{
        backgroundColor: badgeColors.bg,
        borderColor: badgeColors.border,
      }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <AppText emphasis className="text-[10px] tracking-wider" style={{ color: badgeColors.text }}>
        {label}
      </AppText>
    </View>
  );
}

export interface IllustrationBadgeProps {
  label?: string;
}

/**
 * Etykieta pilotażowa dla rycin generowanych (D-17).
 * Wyświetla napis „ilustracja”.
 */
export function IllustrationBadge({ label = 'ilustracja' }: IllustrationBadgeProps) {
  return (
    <View
      className="rounded border border-border bg-surface px-1.5 py-0.5"
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <AppText className="text-[10px] uppercase tracking-wider text-muted">{label}</AppText>
    </View>
  );
}
