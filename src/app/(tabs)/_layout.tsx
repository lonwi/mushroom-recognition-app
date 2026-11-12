import { Tabs } from 'expo-router';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { SettingsButton } from '@/screens/settings-button';
import { TabBar } from '@/ui/navigation/tab-bar';
import { fontFamily, themes } from '@/ui/tokens';

export default function TabLayout() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const colors = themes[theme];

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} theme={theme} />}
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fontFamily.semibold },
        headerRight: () => <SettingsButton />,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: messages.tabs.atlas, headerShown: false }} />
      <Tabs.Screen name="journal" options={{ title: messages.tabs.journal }} />
      <Tabs.Screen name="scanner" options={{ title: messages.tabs.scanner }} />
      <Tabs.Screen name="help" options={{ title: messages.tabs.help }} />
      <Tabs.Screen name="profile" options={{ title: messages.tabs.profile }} />
    </Tabs>
  );
}
