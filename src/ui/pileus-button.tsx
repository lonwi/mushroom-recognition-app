import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';

import type { ThemeName } from '@/core/theme';
import { AppText } from '@/ui/text';
import { touchTargetMinDp, themes } from '@/ui/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'skanerPill';

export interface PileusButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  theme?: ThemeName;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  icon?: ReactNode;
}

/**
 * Autorski atom PileusButton (Pileus v1.0).
 * Żelazna reguła pola dotyku: minimum 48×48 px w każdym wariancie.
 * W High Contrast: kontrast AAA, ostre ramki 2px, brak szarości.
 */
export function PileusButton({
  label,
  variant = 'primary',
  theme = 'light',
  disabled = false,
  onPress,
  style,
  icon,
  ...rest
}: PileusButtonProps) {
  const colors = themes[theme];
  const isHc = theme === 'highContrast';

  let containerStyle: ViewStyle = {
    minHeight: touchTargetMinDp,
    minWidth: touchTargetMinDp,
    borderRadius: variant === 'skanerPill' ? 9999 : 12,
    borderWidth: isHc ? 2 : 1,
    borderColor: 'transparent',
    opacity: disabled ? 0.4 : 1,
    paddingHorizontal: variant === 'skanerPill' ? 24 : 16,
    paddingVertical: 12,
  };

  let textColor = colors.ink;

  switch (variant) {
    case 'primary':
    case 'skanerPill':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.accent,
        borderColor: isHc ? colors.borderStrong : colors.accent,
      };
      textColor = colors.onAccent;
      break;
    case 'secondary':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.surfaceRaised,
        borderColor: isHc ? colors.borderStrong : colors.border,
      };
      textColor = colors.ink;
      break;
    case 'outline':
      containerStyle = {
        ...containerStyle,
        backgroundColor: colors.surface,
        borderColor: isHc ? colors.borderStrong : colors.border,
      };
      textColor = colors.ink;
      break;
    case 'ghost':
      containerStyle = {
        ...containerStyle,
        backgroundColor: 'transparent',
        borderColor: isHc ? colors.borderStrong : 'transparent',
      };
      textColor = colors.ink;
      break;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-center gap-2"
      style={[containerStyle, style]}
      {...rest}
    >
      {icon}
      <AppText emphasis className="text-center text-sm" style={{ color: textColor }}>
        {label}
      </AppText>
    </Pressable>
  );
}
