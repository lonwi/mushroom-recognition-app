import { ScrollView, View } from 'react-native';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { Surface } from '@/ui/surface';
import { AppText } from '@/ui/text';

export function HelpScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);

  return (
    <ThemeFrame>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
      >
        <AppText emphasis className="mb-4 text-2xl text-ink">
          {messages.help.title}
        </AppText>

        {/* Safety Mandate Banner */}
        <Surface level={2} theme={theme} className="mb-4 p-4">
          <AppText emphasis className="text-sm text-ink">
            {messages.safety.notAVerdict}
          </AppText>
          <AppText className="mt-1 text-xs text-muted">{messages.help.body}</AppText>
        </Surface>

        {/* Core Foraging Safety Rules */}
        <Surface level={1} theme={theme} className="mb-4 p-4">
          <AppText emphasis className="mb-3 text-base text-ink">
            {messages.help.rulesTitle}
          </AppText>
          <View className="gap-2.5">
            <View className="flex-row items-start gap-2">
              <AppText className="text-xs text-muted">1.</AppText>
              <AppText className="flex-1 text-xs text-ink">{messages.help.rule1}</AppText>
            </View>
            <View className="flex-row items-start gap-2">
              <AppText className="text-xs text-muted">2.</AppText>
              <AppText className="flex-1 text-xs text-ink">{messages.help.rule2}</AppText>
            </View>
            <View className="flex-row items-start gap-2">
              <AppText className="text-xs text-muted">3.</AppText>
              <AppText className="flex-1 text-xs text-ink">{messages.help.rule3}</AppText>
            </View>
            <View className="flex-row items-start gap-2">
              <AppText className="text-xs text-muted">4.</AppText>
              <AppText className="flex-1 text-xs text-ink">{messages.help.rule4}</AppText>
            </View>
          </View>
        </Surface>

        {/* Emergency Numbers Notice (Q19) */}
        <Surface level={1} theme={theme} className="mb-4 p-4">
          <AppText emphasis className="mb-1 text-sm text-ink">
            Numery alarmowe
          </AppText>
          <AppText className="text-xs text-muted">{messages.help.numbers}</AppText>
        </Surface>

        {/* Legal Disclaimer */}
        <Surface level={1} theme={theme} className="p-4">
          <AppText emphasis className="mb-1 text-sm text-ink">
            {messages.help.disclaimerTitle}
          </AppText>
          <AppText className="text-xs text-muted">{messages.help.disclaimerBody}</AppText>
        </Surface>
      </ScrollView>
    </ThemeFrame>
  );
}
