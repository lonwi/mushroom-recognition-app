import { Tabs } from 'expo-router';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { SettingsButton } from '@/screens/settings-button';
import { fontFamily, themes, touchTargetMinDp } from '@/ui/tokens';

export default function TabLayout() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const colors = themes[theme];
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fontFamily.semibold },
        headerRight: () => <SettingsButton />,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.border,
          minHeight: touchTargetMinDp,
        },
        tabBarItemStyle: { minHeight: touchTargetMinDp },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: messages.tabs.atlas }} />
      <Tabs.Screen name="scanner" options={{ title: messages.tabs.scanner }} />
      <Tabs.Screen name="help" options={{ title: messages.tabs.help }} />
    </Tabs>
  );
}
