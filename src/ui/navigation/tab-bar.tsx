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

const TAB_ICONS: Record<string, string> = {
  index: '📖',
  journal: '📝',
  scanner: '📷',
  help: '🛟',
  profile: '🎒',
};

/**
 * Autorski pasek zakładek TabBar (Nordic Field Guide v3.1).
 * Zapewnia:
 *  - Centralny, wyróżniony przycisk CTA Skanera w leśnej zieleni (#1b382b)
 *  - Ikony tematyczne i czytelne etykiety
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
      className="flex-row items-center justify-around px-1 py-1"
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
        const icon = TAB_ICONS[route.name] ?? '🍄';

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
              className="items-center justify-center py-1 px-1.5"
              style={{ minHeight: touchTargetMinDp }}
            >
              <View
                className="flex-row items-center justify-center rounded-xl px-3.5 py-2 shadow-sm"
                style={{
                  backgroundColor: colors.accent,
                  minHeight: 40,
                  borderWidth: isHc ? 2 : 1,
                  borderColor: isHc ? colors.borderStrong : colors.accent,
                }}
              >
                <AppText className="mr-1 text-sm">📷</AppText>
                <AppText
                  emphasis
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: colors.onAccent }}
                >
                  {String(label)}
                </AppText>
              </View>
              {/* Podkreślenie aktywnej zakładki: 2.5 px */}
              <View
                style={{
                  height: 2.5,
                  width: 24,
                  marginTop: 2,
                  backgroundColor: isFocused ? colors.accent : 'transparent',
                  borderRadius: 1.5,
                }}
              />
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
            className="flex-1 items-center justify-center py-1"
            style={{ minHeight: touchTargetMinDp, minWidth: touchTargetMinDp }}
          >
            <View className="items-center justify-center">
              <AppText className={`text-base ${isFocused ? 'opacity-100' : 'opacity-70'}`}>
                {icon}
              </AppText>
              <AppText
                emphasis={isFocused}
                className="mt-0.5 text-[11px]"
                style={{
                  color: isFocused ? colors.ink : colors.muted,
                  fontWeight: isFocused ? '700' : '500',
                }}
              >
                {String(label)}
              </AppText>
              {/* Podkreślenie aktywnej zakładki: 2.5 px */}
              <View
                style={{
                  height: 2.5,
                  width: 24,
                  marginTop: 2,
                  backgroundColor: isFocused ? colors.accent : 'transparent',
                  borderRadius: 1.5,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
