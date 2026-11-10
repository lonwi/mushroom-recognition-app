import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useSettings } from '@/infra/settings/use-settings-store';
import { themeVars } from '@/ui/theme-vars';

export function ThemeFrame({ children }: { children: ReactNode }) {
  const theme = useSettings((state) => state.theme);
  return (
    <View className="flex-1 bg-paper" style={themeVars(theme)}>
      {children}
    </View>
  );
}
