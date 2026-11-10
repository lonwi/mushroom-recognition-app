import { View } from 'react-native';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';

export default function ScannerScreen() {
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  return (
    <ThemeFrame>
      <View className="px-4 pt-6">
        <AppText emphasis className="text-2xl">
          {messages.scanner.title}
        </AppText>
        <AppText className="mt-4 text-muted">{messages.scanner.unavailable}</AppText>
        <AppText className="mt-4">{messages.safety.notAVerdict}</AppText>
      </View>
    </ThemeFrame>
  );
}
