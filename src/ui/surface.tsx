import type { ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { elevation, type ThemeName, themes } from '@/ui/tokens';

export interface SurfaceProps extends ViewProps {
  children?: ReactNode;
  level?: 0 | 1 | 2 | 3;
  theme?: ThemeName;
  className?: string;
}

/**
 * Autorski komponent Surface (Pileus v1.0).
 * Zapewnia papierowe elewacje o ostrych krawędziach (Zero blur > 4px).
 * W trybie High Contrast: czysty czarny/biały, ostra ramka 1-2px, zero szarości.
 */
export function Surface({
  children,
  level = 1,
  theme = 'light',
  className = '',
  style,
  ...rest
}: SurfaceProps) {
  const elev = elevation[`level${level}`];
  const colors = themes[theme];
  const isHc = theme === 'highContrast';

  const surfaceStyle: ViewStyle = {
    backgroundColor: level >= 2 ? colors.surfaceRaised : colors.surface,
    borderColor: isHc ? colors.borderStrong : colors.border,
    ...elev,
  };

  return (
    <View className={`rounded-xl ${className}`} style={[surfaceStyle, style]} {...rest}>
      {children}
    </View>
  );
}
