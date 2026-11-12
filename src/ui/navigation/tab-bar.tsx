import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import type { Tabs } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { ThemeName } from '@/core/theme';
import { AppText } from '@/ui/text';
import { elevation, themes, touchTargetMinDp } from '@/ui/tokens';

export type NativeTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabBarProps = NativeTabBarProps & {
  theme?: ThemeName;
};

interface TabIconProps {
  color: string;
  size?: number;
}

function AtlasTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function JournalTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l5 5v11a2 2 0 01-2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 4v5h5M7 13h5M7 17h8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ScannerTabIcon({ color, size = 20 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={13}
        r={3.5}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HelpTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={17}
        x2={12.01}
        y2={17}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProfileTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={7}
        r={4}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function renderTabIcon(routeName: string, color: string) {
  switch (routeName) {
    case 'index':
      return <AtlasTabIcon color={color} />;
    case 'journal':
      return <JournalTabIcon color={color} />;
    case 'scanner':
      return <ScannerTabIcon color={color} />;
    case 'help':
      return <HelpTabIcon color={color} />;
    case 'profile':
      return <ProfileTabIcon color={color} />;
    default:
      return <AtlasTabIcon color={color} />;
  }
}

/**
 * Autorski dolny pasek nawigacyjny TabBar (Nordic Field Guide v3.1).
 * Wzorowany bezpośrednio na specyfikacji Stitcha (Flow 01/02):
 *  - 5 ergonomicznych zakładek z wektorami SVG (Atlas, Dziennik, Skaner, Pomoc, Profil)
 *  - Centralny, wyróżniony przycisk CTA Skanera w leśnej zieleni (#1b382b) z cieniem level2
 *  - Czytelne etykiety 11px pod ikonami
 *  - Aktywny wskaźnik kreskowy 28×2.5 px pod bieżącą zakładką
 *  - Dyskretny wskaźnik gestu domowego Androida (Home Indicator)
 *  - Pełna obsługa motywów (Light, Dark, High Contrast WCAG AAA)
 *  - Żelazna reguła pola dotyku min. 48×48 dp dla każdej zakładki
 */
export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  theme = 'light',
}: TabBarProps) {
  const colors = themes[theme];
  const isHc = theme === 'highContrast';
  const bottomInset = Math.max(insets?.bottom ?? 0, 4);

  return (
    <View
      testID="tab-bar"
      className="shrink-0 pt-1.5"
      style={{
        backgroundColor: colors.paper,
        borderTopWidth: isHc ? 2 : 1,
        borderTopColor: isHc ? colors.borderStrong : colors.border,
        paddingBottom: bottomInset,
      }}
      accessibilityRole="tablist"
    >
      <View className="mx-auto w-full max-w-[420px] flex-row items-end justify-between px-2">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          const rawLabel =
            descriptor?.options.tabBarLabel ?? descriptor?.options.title ?? route.name;
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
                testID={`tab-${route.name}`}
                accessibilityRole="tab"
                accessibilityLabel={String(label)}
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                className="flex-1 items-center justify-end py-0.5"
                style={{ minHeight: touchTargetMinDp, minWidth: touchTargetMinDp }}
              >
                {/* Wyróżniony pojemnik aparatu Skanera */}
                <View
                  className="items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: colors.accent,
                    width: 52,
                    height: 38,
                    borderWidth: isHc ? 2 : 1,
                    borderColor: isHc ? colors.borderStrong : colors.accent,
                    ...(isHc ? {} : elevation.level2),
                  }}
                >
                  <ScannerTabIcon color={colors.onAccent} size={22} />
                </View>

                {/* Etykieta Skanera */}
                <AppText
                  emphasis
                  className="mt-1 text-[11px] font-bold"
                  style={{
                    color: isFocused ? colors.ink : colors.muted,
                  }}
                >
                  {String(label)}
                </AppText>

                {/* Wskaźnik aktywnej zakładki: 28×2.5 px */}
                <View
                  style={{
                    height: 2.5,
                    width: 28,
                    marginTop: 2,
                    backgroundColor: isFocused ? colors.accent : 'transparent',
                    borderRadius: 1.5,
                  }}
                />
              </Pressable>
            );
          }

          const iconColor = isFocused ? colors.ink : colors.muted;

          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={String(label)}
              accessibilityState={{ selected: isFocused }}
              onPress={onPress}
              className="flex-1 items-center justify-end py-0.5"
              style={{ minHeight: touchTargetMinDp, minWidth: touchTargetMinDp }}
            >
              <View className="h-6 items-center justify-center">
                {renderTabIcon(route.name, iconColor)}
              </View>

              {/* Etykieta tekstowa */}
              <AppText
                emphasis={isFocused}
                className="mt-1 text-[11px]"
                style={{
                  color: isFocused ? colors.ink : colors.muted,
                  fontWeight: isFocused ? '700' : '500',
                }}
              >
                {String(label)}
              </AppText>

              {/* Wskaźnik aktywnej zakładki: 28×2.5 px */}
              <View
                style={{
                  height: 2.5,
                  width: 28,
                  marginTop: 2,
                  backgroundColor: isFocused ? colors.accent : 'transparent',
                  borderRadius: 1.5,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Dyskretny pasek gestów domowych (Home indicator bar) */}
      <View className="w-full items-center pt-1.5 pb-0.5">
        <View
          style={{
            width: 128,
            height: 4,
            borderRadius: 2,
            backgroundColor: isHc ? colors.borderStrong : colors.border,
            opacity: 0.6,
          }}
        />
      </View>
    </View>
  );
}
