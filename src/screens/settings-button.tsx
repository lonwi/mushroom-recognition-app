import { Link } from 'expo-router';
import { Pressable } from 'react-native';

import { messagesFor } from '@/core/i18n';
import { useSettings } from '@/infra/settings/use-settings-store';
import { touchTargetMinDp } from '@/ui/tokens';
import { AppText } from '@/ui/text';

export function SettingsButton() {
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  return (
    <Link href="/settings" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.settings.open}
        style={{
          minWidth: touchTargetMinDp,
          minHeight: touchTargetMinDp,
          justifyContent: 'center',
        }}
      >
        <AppText>{messages.settings.open}</AppText>
      </Pressable>
    </Link>
  );
}
