import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  DEFAULT_INFERENCE_SERIES_COUNT,
  INFERENCE_SERIES_COUNTS,
} from '@/core/ai/inference-package';
import type { DelegateDump } from '@/core/ai/inference-measurement';
import { buildProfileName } from '@/core/config/build-profile';
import { messagesFor } from '@/core/i18n';
import { sharePlainText } from '@/infra/diagnostics/share-log';
import {
  measureOnDevice,
  packageStatus,
  type PackageStatus,
} from '@/infra/inference/measure-on-device';
import { deviceDescription } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

const DUMP_FILE = 'spike-b-inference.json';

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export default function InferenceSpikeScreen() {
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const copy = messages.inferenceSpike;
  const [seriesCount, setSeriesCount] = useState<number>(DEFAULT_INFERENCE_SERIES_COUNT);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [status, setStatus] = useState<PackageStatus | null>(null);
  const [dump, setDump] = useState<DelegateDump | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const cancelRequested = useRef(false);
  const alive = useRef(true);
  const mounted = useRef(true);
  const stop = useCallback(() => {
    alive.current = false;
    cancelRequested.current = true;
  }, []);
  useEffect(() => stop, [stop]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setStatus(packageStatus());
      return stop;
    }, [stop]),
  );

  const device = deviceDescription();
  const deviceLabel = [device.brand, device.modelName].filter(Boolean).join(' ') || device.platform;

  async function run() {
    if (running) return;
    cancelRequested.current = false;
    setRunning(true);
    setShareFailed(false);
    setRunError(null);
    setPhase(null);
    try {
      const result = await measureOnDevice({
        runs: seriesCount,
        shouldCancel: () => !alive.current || cancelRequested.current,
        afterEach: () =>
          new Promise((resolve) => {
            setTimeout(resolve, 0);
          }),
        onProgress: (name, completed, total) => {
          if (alive.current) setPhase(`${name} ${completed}/${total}`);
        },
      });
      if (!alive.current) return;
      setDump(result.dump);
      setSummary(result.summary);
      setStatus(packageStatus());
    } catch (error) {
      if (alive.current) setRunError(error instanceof Error ? error.message : copy.failed);
    } finally {
      if (mounted.current) {
        cancelRequested.current = false;
        setRunning(false);
      }
    }
  }

  return (
    <ThemeFrame>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-6">
          <AppText emphasis className="text-2xl">
            {copy.title}
          </AppText>
          <AppText className="mt-4 text-muted">{copy.intro}</AppText>
          <AppText className="mt-4">{copy.criteria}</AppText>
          <AppText className="mt-4">{copy.gpu}</AppText>
          <AppText className="mt-4">{fill(copy.platform, { name: deviceLabel })}</AppText>
          <AppText className="mt-2">{fill(copy.profile, { profile: buildProfileName() })}</AppText>
          <AppText className="mt-4">
            {status?.present
              ? fill(copy.modelLine, { version: status.version ?? '' })
              : (status?.detail ?? copy.phaseIdle)}
          </AppText>
          {status?.present ? (
            <AppText className="mt-2">{fill(copy.shaLine, { sha: status.sha256 ?? '' })}</AppText>
          ) : null}
          {status?.present ? (
            <AppText className="mt-2">
              {fill(copy.goldenLine, { n: String(status.goldenCount) })}
            </AppText>
          ) : null}
          {status?.detail && status.present ? (
            <AppText className="mt-2">{status.detail}</AppText>
          ) : null}
          <AppText className="mt-4">{copy.series}</AppText>
          <View className="mt-2">
            {INFERENCE_SERIES_COUNTS.map((count) => {
              const selected = seriesCount === count;
              return (
                <Pressable
                  key={count}
                  accessibilityRole="button"
                  accessibilityLabel={fill(copy.seriesOption, { n: String(count) })}
                  accessibilityState={{ selected, disabled: running }}
                  disabled={running}
                  onPress={() => setSeriesCount(count)}
                  className="mb-2 justify-center border border-line bg-surface px-4"
                  style={{ minHeight: touchTargetMinDp, opacity: running ? 0.5 : 1 }}
                >
                  <AppText>{fill(copy.seriesOption, { n: String(count) })}</AppText>
                </Pressable>
              );
            })}
          </View>
          <View className="mt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fill(copy.run, { n: String(seriesCount) })}
              accessibilityState={{ disabled: running }}
              disabled={running}
              onPress={() => {
                void run();
              }}
              className="items-center justify-center bg-accent"
              style={{ minHeight: touchTargetMinDp, opacity: running ? 0.5 : 1 }}
            >
              <AppText className="text-on-accent">
                {running ? copy.running : fill(copy.run, { n: String(seriesCount) })}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.cancel}
              accessibilityState={{ disabled: !running }}
              disabled={!running}
              onPress={() => {
                cancelRequested.current = true;
              }}
              className="mt-2 items-center justify-center border border-line"
              style={{ minHeight: touchTargetMinDp, opacity: running ? 1 : 0.5 }}
            >
              <AppText>{copy.cancel}</AppText>
            </Pressable>
          </View>
          <AppText className="mt-4">{phase ? fill(copy.phase, { phase }) : copy.phaseIdle}</AppText>
          {runError ? <AppText className="mt-4">{runError}</AppText> : null}
          {dump && dump.failures.length > 0 ? (
            <AppText className="mt-4">
              {fill(copy.failure, {
                phase: dump.failures[0]?.phase ?? '',
                message: dump.failures[0]?.message ?? '',
              })}
            </AppText>
          ) : null}
          {dump?.cancelled ? <AppText className="mt-4">{copy.cancelled}</AppText> : null}
          <AppText className="mt-2 text-muted">{copy.thresholdNote}</AppText>
          <AppText className="mt-6 text-muted">{copy.copyHint}</AppText>
          <AppText className="mt-2 text-muted">{copy.reportLanguage}</AppText>
          {summary ? (
            <AppText className="mt-4" selectable>
              {summary}
            </AppText>
          ) : (
            <AppText className="mt-4 text-muted">{copy.noReport}</AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.share}
            disabled={dump === null}
            accessibilityState={{ disabled: dump === null }}
            onPress={() => {
              if (dump === null) return;
              const body = JSON.stringify(dump, null, 2);
              void sharePlainText(DUMP_FILE, body, copy.share, 'application/json').then(
                (shared) => {
                  if (mounted.current) setShareFailed(shared === 'unavailable');
                },
              );
            }}
            className="mt-6 items-center justify-center border border-line bg-surface"
            style={{ minHeight: touchTargetMinDp, opacity: dump === null ? 0.45 : 1 }}
          >
            <AppText>{copy.share}</AppText>
          </Pressable>
          {shareFailed ? <AppText className="mt-2">{copy.shareFailed}</AppText> : null}
        </View>
      </ScrollView>
    </ThemeFrame>
  );
}
