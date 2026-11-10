import { Pressable } from '@rn-primitives/slot';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import exampleManifest from '../../../fixtures/model-manifest.example.json';
import schema from '../../../schemas/model-manifest.schema.json';
import { loadModelManifest } from '@/core/ai/degradation';
import { messagesFor } from '@/core/i18n';
import type { ThemeName } from '@/core/theme';
import { platformName } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { themes, touchTargetMinDp } from '@/ui/tokens';

const choices = ['light', 'dark', 'highContrast'] as const satisfies readonly ThemeName[];

const exampleLoad = loadModelManifest(exampleManifest, schema, {
  fileSha256: exampleManifest.model.sha256,
  atlasVersion: exampleManifest.minAtlasVersion,
  productionBuild: false,
});

export default function StylingSpikeScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const setTheme = useSettings((state) => state.setTheme);
  const messages = messagesFor(englishEnabled);
  const startedAt = useRef(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const colors = themes[theme];
  const labels: Record<ThemeName, string> = {
    light: messages.settings.themeLight,
    dark: messages.settings.themeDark,
    highContrast: messages.settings.themeHighContrast,
  };

  function switchTheme(next: ThemeName) {
    startedAt.current = performance.now();
    setTheme(next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLastMs(performance.now() - startedAt.current);
      });
    });
  }

  const timing =
    lastMs === null ? messages.spike.none : messages.spike.last.replace('{ms}', lastMs.toFixed(1));

  return (
    <ThemeFrame>
      <View className="flex-1 px-4 pt-6">
        <AppText emphasis className="text-2xl">
          {messages.spike.title}
        </AppText>
        <AppText className="mt-4 text-muted">{messages.spike.intro}</AppText>
        <AppText className="mt-4">
          {messages.spike.platform.replace('{name}', platformName())}
        </AppText>
        <View className="mt-4 h-24 border border-line bg-surface" />
        <View className="mt-4">
          {choices.map((choice) => (
            <Pressable
              key={choice}
              accessibilityRole="button"
              accessibilityLabel={labels[choice]}
              accessibilityState={{ selected: theme === choice }}
              onPress={() => {
                switchTheme(choice);
              }}
              style={{
                minHeight: touchTargetMinDp,
                marginBottom: 8,
                justifyContent: 'center',
                paddingHorizontal: 16,
                backgroundColor: colors.accent,
                borderColor: colors.border,
                borderWidth: 1,
              }}
            >
              <AppText className="text-on-accent">{labels[choice]}</AppText>
            </Pressable>
          ))}
        </View>
        <AppText className="mt-2">{timing}</AppText>
        <AppText className="mt-6">
          {exampleLoad.valid ? messages.spike.manifestOk : messages.spike.manifestBad}
        </AppText>
        <AppText className="mt-2 text-muted">{messages.spike.manifestNote}</AppText>
        <AppText className="mt-2">
          {messages.spike.reasons.replace('{reasons}', exampleLoad.capabilities.reasons.join(', '))}
        </AppText>
        <AppText className="mt-4 text-muted">{messages.spike.primitive}</AppText>
      </View>
    </ThemeFrame>
  );
}
