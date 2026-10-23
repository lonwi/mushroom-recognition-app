import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { useLanguage } from '../contexts/LanguageContext';
import {
  AUTO_DELEGATE,
  CPU_RUNTIME,
  type DevDelegateMode,
  type InferenceTiming,
  getDevDelegateMode,
  getLastInferenceTiming,
  isDevBuild,
  setDevDelegateMode,
  subscribeInferenceTiming,
} from '../services/inferenceTiming';
import { devOverlayColors, spacing, typography } from '../theme/tokens';

const DEV_OVERLAY_RADIUS = 4;

interface Props {
  /** Tests pass a scheme. The scanner leaves this unset and follows the system theme. */
  scheme?: 'light' | 'dark' | null;
}

function timingCopy(
  timing: InferenceTiming | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  if (!timing) {
    return null;
  }
  if (timing.fellBackToCpu) {
    return t('scanner.devInferenceFallback', { ms: timing.inferenceMs });
  }
  return t('scanner.devInference', { ms: timing.inferenceMs, delegate: timing.delegate });
}

/**
 * Dev-only timing for the last on-device model.run.
 * Radius stays in the 3–6 px range. The border is the same on every side.
 */
export function DevInferenceOverlay({ scheme }: Props) {
  const systemScheme = useColorScheme();
  const { t } = useLanguage();
  const [timing, setTiming] = useState<InferenceTiming | null>(() => getLastInferenceTiming());
  const [mode, setMode] = useState<DevDelegateMode>(() => getDevDelegateMode());

  useEffect(() => subscribeInferenceTiming(setTiming), []);

  if (!isDevBuild()) {
    return null;
  }

  const dark = (scheme === undefined ? systemScheme : scheme) === 'dark';
  const surface = dark ? styles.dark : styles.light;
  const label = dark ? styles.darkText : styles.lightText;
  const selectedSurface = dark ? styles.darkSelected : styles.lightSelected;
  const selectedLabel = dark ? styles.darkSelectedText : styles.lightSelectedText;
  const reading = timingCopy(timing, t);

  const choose = (next: DevDelegateMode) => {
    setDevDelegateMode(next);
    setMode(getDevDelegateMode());
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap} testID="dev-inference-overlay">
      {reading ? (
        <Text style={[styles.timing, surface, label]} testID="dev-inference-timing">
          {reading}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === AUTO_DELEGATE }}
          onPress={() => choose(AUTO_DELEGATE)}
          style={[styles.choice, surface, mode === AUTO_DELEGATE ? selectedSurface : null]}
          testID="dev-delegate-auto"
        >
          <Text style={[styles.choiceText, mode === AUTO_DELEGATE ? selectedLabel : label]} testID="dev-delegate-auto-label">
            {t('scanner.devDelegateAuto')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === CPU_RUNTIME }}
          onPress={() => choose(CPU_RUNTIME)}
          style={[styles.choice, surface, mode === CPU_RUNTIME ? selectedSurface : null]}
          testID="dev-delegate-cpu"
        >
          <Text style={[styles.choiceText, mode === CPU_RUNTIME ? selectedLabel : label]} testID="dev-delegate-cpu-label">
            {t('scanner.devDelegateCpu')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    zIndex: 2,
    alignItems: 'flex-end',
  },
  timing: {
    borderRadius: DEV_OVERLAY_RADIUS,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: typography.small,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  choice: {
    borderRadius: DEV_OVERLAY_RADIUS,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  choiceText: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  light: {
    backgroundColor: devOverlayColors.light.background,
    borderColor: devOverlayColors.light.border,
  },
  dark: {
    backgroundColor: devOverlayColors.dark.background,
    borderColor: devOverlayColors.dark.border,
  },
  lightText: {
    color: devOverlayColors.light.text,
  },
  darkText: {
    color: devOverlayColors.dark.text,
  },
  lightSelected: {
    backgroundColor: devOverlayColors.light.selected,
  },
  darkSelected: {
    backgroundColor: devOverlayColors.dark.selected,
  },
  lightSelectedText: {
    color: devOverlayColors.light.selectedText,
  },
  darkSelectedText: {
    color: devOverlayColors.dark.selectedText,
  },
});
