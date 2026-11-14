import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { messagesFor } from '@/core/i18n';
import type { ThemeName } from '@/core/theme';
import { diagnosticLog } from '@/infra/diagnostics/file-log';
import { shareDiagnosticLog } from '@/infra/diagnostics/share-log';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

const themeChoices = ['light', 'dark', 'highContrast'] as const satisfies readonly ThemeName[];

export default function SettingsScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const setTheme = useSettings((state) => state.setTheme);
  const setEnglishEnabled = useSettings((state) => state.setEnglishEnabled);
  const messages = messagesFor(englishEnabled);
  const [shareFailed, setShareFailed] = useState(false);
  const labels: Record<ThemeName, string> = {
    light: messages.settings.themeLight,
    dark: messages.settings.themeDark,
    highContrast: messages.settings.themeHighContrast,
  };

  return (
    <ThemeFrame>
      <View className="px-4 pt-6">
        <AppText emphasis className="text-2xl">
          {messages.settings.title}
        </AppText>
        <AppText className="mt-6">{messages.settings.theme}</AppText>
        <View className="mt-2">
          {themeChoices.map((choice) => (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityLabel={labels[choice]}
              accessibilityState={{ selected: theme === choice }}
              onPress={() => {
                setTheme(choice);
                diagnosticLog.append(`motyw: ${choice}`);
              }}
              className="mb-2 justify-center border border-line bg-surface px-4"
              style={{ minHeight: touchTargetMinDp }}
            >
              <AppText>{labels[choice]}</AppText>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.settings.english}
          accessibilityState={{ checked: englishEnabled }}
          onPress={() => {
            const next = !englishEnabled;
            setEnglishEnabled(next);
            diagnosticLog.append(`angielski: ${next ? 'on' : 'off'}`);
          }}
          className="mt-4 justify-center border border-line bg-surface px-4"
          style={{ minHeight: touchTargetMinDp }}
        >
          <AppText>{messages.settings.english}</AppText>
          <AppText className="text-muted">
            {englishEnabled ? messages.settings.englishOn : messages.settings.englishOff}
          </AppText>
        </Pressable>
        <AppText className="mt-6">{messages.settings.log}</AppText>
        <AppText className="mt-2 text-muted">{messages.settings.logHint}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.settings.share}
          onPress={() => {
            void shareDiagnosticLog(messages.settings.log).then((result) => {
              setShareFailed(result === 'unavailable');
            });
          }}
          className="mt-2 items-center justify-center bg-accent"
          style={{ minHeight: touchTargetMinDp }}
        >
          <AppText className="text-on-accent">{messages.settings.share}</AppText>
        </Pressable>
        {shareFailed ? <AppText className="mt-2">{messages.settings.shareFailed}</AppText> : null}
        {__DEV__ ? (
          <Link href="/dev/styling" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.settings.spike}
              className="mt-6 justify-center"
              style={{ minHeight: touchTargetMinDp }}
            >
              <AppText emphasis>{messages.settings.spike}</AppText>
            </Pressable>
          </Link>
        ) : null}
        {__DEV__ ? (
          <Link href="/dev/decoder" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.settings.decoderSpike}
              className="mt-2 justify-center"
              style={{ minHeight: touchTargetMinDp }}
            >
              <AppText emphasis>{messages.settings.decoderSpike}</AppText>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </ThemeFrame>
  );
}
