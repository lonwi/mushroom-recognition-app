import '../../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { messagesFor } from '@/core/i18n';
import { initSpeciesDbAsync } from '@/infra/db/species-db';
import { diagnosticLog } from '@/infra/diagnostics/file-log';
import { platformName } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { fontFamily, themes } from '@/ui/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const colors = themes[theme];
  const [dbReady, setDbReady] = useState(false);
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    let active = true;
    void initSpeciesDbAsync().finally(() => {
      if (active) setDbReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if ((loaded || error) && dbReady) {
      diagnosticLog.append(`start platform=${platformName()}`);
      void SplashScreen.hideAsync();
    }
  }, [loaded, error, dbReady]);

  if ((!loaded && !error) || !dbReady) return null;

  return (
    <>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fontFamily.semibold },
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="species/[id]" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="look-alikes/[pair-id]" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="settings" options={{ title: messages.settings.title }} />
        {__DEV__ ? (
          <Stack.Screen name="dev/styling" options={{ title: messages.spike.title }} />
        ) : null}
      </Stack>
    </>
  );
}
