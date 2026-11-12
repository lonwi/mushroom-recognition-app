import { View } from 'react-native';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { Surface } from '@/ui/surface';
import { AppText } from '@/ui/text';

export function JournalScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);

  return (
    <ThemeFrame>
      <View className="flex-1 justify-center px-6 py-8">
        <Surface level={1} theme={theme} className="items-center p-8 text-center">
          <AppText className="text-5xl opacity-40">🌲</AppText>
          <AppText emphasis className="mt-4 text-xl font-bold text-ink">
            {messages.placeholders.journalTitle}
          </AppText>
          <AppText className="mt-2.5 text-center text-sm leading-relaxed text-muted">
            {messages.placeholders.journalMessage}
          </AppText>
          <View className="mt-6 rounded-full bg-paperActive px-3 py-1">
            <AppText className="text-xs font-semibold tracking-wider text-muted uppercase">
              {messages.placeholders.comingSoon}
            </AppText>
          </View>
        </Surface>
      </View>
    </ThemeFrame>
  );
}
