import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import type { Tabs } from 'expo-router';

import type { ThemeName } from '@/core/theme';
import { AppText } from '@/ui/text';
import { touchTargetMinDp, themes } from '@/ui/tokens';

export type NativeTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabBarProps = NativeTabBarProps & {
  theme?: ThemeName;
};

/**
 * Autorski pasek zakładek TabBar (Pileus v1.0).
 * Zapewnia:
 *  - Centralny, wyróżniony przycisk CTA Skanera (min. 48×48 px)
 *  - Podkreślenie aktywnej zakładki 2,5 px
 *  - W trybie High Contrast: ostre ramki 2px, brak szarości (WCAG AAA)
 *  - Spełnienie żelaznej reguły pola dotyku min. 48×48 px dla każdej zakładki
 */
export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  theme = 'light',
}: TabBarProps) {
  const colors = themes[theme];
  const isHc = theme === 'highContrast';

  return (
    <View
      testID="tab-bar"
      className="flex-row items-center justify-around px-2 py-1"
      style={{
        backgroundColor: colors.paper,
        borderTopWidth: isHc ? 2 : 1,
        borderTopColor: isHc ? colors.borderStrong : colors.border,
        minHeight: touchTargetMinDp + 8,
      }}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const descriptor = descriptors[route.key];
        const rawLabel = descriptor?.options.tabBarLabel ?? descriptor?.options.title ?? route.name;

        const label = typeof rawLabel === 'function' ? route.name : (rawLabel ?? route.name);
        const isScanner = route.name === 'scanner';

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        if (isScanner) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={String(label)}
              accessibilityState={{ selected: isFocused }}
              onPress={onPress}
              className="items-center justify-center rounded-full px-5 py-2"
              style={{
                backgroundColor: colors.accent,
                minHeight: touchTargetMinDp,
                minWidth: 100,
                borderWidth: isHc ? 2 : 1,
                borderColor: isHc ? colors.borderStrong : colors.accent,
              }}
            >
              <View className="flex-row items-center gap-1.5">
                <AppText className="text-sm">📷</AppText>
                <AppText
                  emphasis
                  className="text-xs uppercase tracking-wider"
                  style={{ color: colors.onAccent }}
                >
                  {String(label)}
                </AppText>
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={String(label)}
            accessibilityState={{ selected: isFocused }}
            onPress={onPress}
            className="flex-1 items-center justify-center py-2"
            style={{ minHeight: touchTargetMinDp, minWidth: touchTargetMinDp }}
          >
            <AppText
              emphasis={isFocused}
              className="text-xs"
              style={{
                color: isFocused ? colors.ink : colors.muted,
              }}
            >
              {String(label)}
            </AppText>
            {/* Podkreślenie aktywnej zakładki: 2.5 px */}
            <View
              style={{
                height: 2.5,
                width: 24,
                marginTop: 3,
                backgroundColor: isFocused ? colors.accent : 'transparent',
                borderRadius: 1.5,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
