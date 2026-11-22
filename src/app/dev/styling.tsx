import { Pressable } from '@rn-primitives/slot';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import exampleManifest from '../../../fixtures/model-manifest.example.json';
import schema from '../../../schemas/model-manifest.schema.json';
import { loadModelManifest } from '@/core/ai/degradation';
import { devToolsEnabled } from '@/core/config/dev-tools';
import { messagesFor } from '@/core/i18n';
import { durationStats } from '@/core/measure/duration-stats';
import type { ThemeName } from '@/core/theme';
import { platformName } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { themes, touchTargetMinDp } from '@/ui/tokens';

interface SwitchSample {
  from: ThemeName;
  to: ThemeName;
  ms: number;
}

const choices = ['light', 'dark', 'highContrast'] as const satisfies readonly ThemeName[];

const exampleLoad = loadModelManifest(exampleManifest, schema, {
  fileSha256: exampleManifest.model.sha256,
  atlasVersion: exampleManifest.minAtlasVersion,
  productionBuild: false,
});

export default function StylingSpikeRoute() {
  // Produkcja wycina src/app/dev. Przy EXPO_PUBLIC_DEV_TOOLS=1 plik zostaje.
  // Bez tej flagi grzybobranie://dev/styling nie może otworzyć spike'a.
  if (!devToolsEnabled()) {
    return <Redirect href="/" />;
  }
  return <StylingSpikeScreen />;
}

function StylingSpikeScreen() {
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const setTheme = useSettings((state) => state.setTheme);
  const messages = messagesFor(englishEnabled);
  const [samples, setSamples] = useState<SwitchSample[]>([]);
  const colors = themes[theme];
  const labels: Record<ThemeName, string> = {
    light: messages.settings.themeLight,
    dark: messages.settings.themeDark,
    highContrast: messages.settings.themeHighContrast,
  };

  function switchTheme(next: ThemeName) {
    if (next === theme) return;
    const from = theme;
    const started = performance.now();
    setTheme(next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ms = performance.now() - started;
        setSamples((current) => [...current, { from, to: next, ms }]);
      });
    });
  }

  const last = samples[samples.length - 1];
  const stats = durationStats(samples.map((sample) => sample.ms));
  const oneDecimal = (value: number) => value.toFixed(1);
  const timing =
    last === undefined
      ? messages.spike.none
      : messages.spike.last.replace('{ms}', oneDecimal(last.ms));

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
          {choices.map((choice) => {
            const current = theme === choice;
            return (
              <Pressable
                key={choice}
                accessibilityRole="button"
                accessibilityLabel={labels[choice]}
                accessibilityState={{ selected: current, disabled: current }}
                disabled={current}
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
                  opacity: current ? 0.5 : 1,
                }}
              >
                <AppText className="text-on-accent">{labels[choice]}</AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText className="mt-2">{timing}</AppText>
        {stats === null ? null : (
          <View className="mt-2">
            <AppText>{messages.spike.count.replace('{n}', String(stats.count))}</AppText>
            <AppText>{messages.spike.mean.replace('{ms}', oneDecimal(stats.mean))}</AppText>
            <AppText>{messages.spike.median.replace('{ms}', oneDecimal(stats.median))}</AppText>
            <AppText>{messages.spike.min.replace('{ms}', oneDecimal(stats.min))}</AppText>
            <AppText>{messages.spike.max.replace('{ms}', oneDecimal(stats.max))}</AppText>
            {samples.map((sample, index) => (
              <AppText key={`${sample.from}-${sample.to}-${index}`}>
                {messages.spike.transition
                  .replace('{from}', labels[sample.from])
                  .replace('{to}', labels[sample.to])
                  .replace('{ms}', oneDecimal(sample.ms))}
              </AppText>
            ))}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.spike.clear}
          onPress={() => {
            setSamples([]);
          }}
          style={{
            minHeight: touchTargetMinDp,
            marginTop: 8,
            justifyContent: 'center',
            paddingHorizontal: 16,
            borderColor: colors.border,
            borderWidth: 1,
          }}
        >
          <AppText>{messages.spike.clear}</AppText>
        </Pressable>
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
