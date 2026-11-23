import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  defaultFtsSeriesCount,
  formatFtsSpikeReport,
  ftsSeriesCounts,
  ftsSpikeQueries,
  ftsSpikeSearchFilter,
  measureFtsSeries,
  type FtsSeriesMeasurement,
} from '@/core/db/fts-spike';
import { searchSpecies } from '@/core/db/species-search';
import { messagesFor } from '@/core/i18n';
import { sharePlainText } from '@/infra/diagnostics/share-log';
import {
  getSpeciesDb,
  getSpeciesDbOpenInfo,
  initSpeciesDbAsync,
  type SpeciesDbOpenInfo,
} from '@/infra/db/species-db';
import { platformName } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

export default function FtsSpikeScreen() {
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const copy = messages.ftsSpike;
  const [seriesCount, setSeriesCount] = useState<number>(defaultFtsSeriesCount);
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState<SpeciesDbOpenInfo | null>(null);
  const [series, setSeries] = useState<FtsSeriesMeasurement | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const cancelRequested = useRef(false);
  const alive = useRef(true);
  const stopSeries = useCallback(() => {
    alive.current = false;
    cancelRequested.current = true;
  }, []);
  useEffect(() => stopSeries, [stopSeries]);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      return stopSeries;
    }, [stopSeries]),
  );

  useEffect(() => {
    let active = true;
    void initSpeciesDbAsync().finally(() => {
      if (!active) return;
      setInfo(getSpeciesDbOpenInfo());
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceLabel =
    info === null
      ? copy.sourceUnknown
      : info.source === 'asset'
        ? copy.sourceAsset
        : copy.sourceFallback;
  const versions =
    info === null || info.contentVersions.length === 0
      ? copy.versionUnknown
      : info.contentVersions.join(', ');
  const report =
    series === null || startedAt === null
      ? null
      : formatFtsSpikeReport({
          startedAt,
          source: info?.source ?? 'fallback',
          speciesCount: info?.speciesCount ?? null,
          ftsCount: info?.ftsCount ?? null,
          contentVersions: info?.contentVersions ?? [],
          openMilliseconds: info?.openMilliseconds ?? null,
          importedAsset: info?.importedAsset ?? false,
          series,
        });

  async function run() {
    if (running) return;
    cancelRequested.current = false;
    const stamp = new Date().toISOString();
    setRunning(true);
    setShareFailed(false);
    setRunError(null);
    try {
      const measured = await measureFtsSeries({
        runs: seriesCount,
        now: () => performance.now(),
        shouldCancel: () => !alive.current || cancelRequested.current,
        afterEach: () =>
          new Promise((resolve) => {
            setTimeout(resolve, 0);
          }),
        search: (query) => searchSpecies(getSpeciesDb(), ftsSpikeSearchFilter(query)).length,
      });
      if (!alive.current) return;
      setInfo(getSpeciesDbOpenInfo());
      setStartedAt(stamp);
      setSeries(measured);
    } catch (error) {
      if (alive.current) {
        setRunError(error instanceof Error ? error.message : copy.failed);
      }
    } finally {
      if (alive.current) {
        cancelRequested.current = false;
        setRunning(false);
      }
    }
  }

  const stats = series?.warmStats ?? null;

  return (
    <ThemeFrame>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-6">
          <AppText emphasis className="text-2xl">
            {copy.title}
          </AppText>
          <AppText className="mt-4 text-muted">{copy.intro}</AppText>
          <AppText className="mt-4">{copy.criteria}</AppText>
          <AppText className="mt-4">{fill(copy.platform, { name: platformName() })}</AppText>
          <AppText className="mt-4">{fill(copy.source, { source: sourceLabel })}</AppText>
          <AppText className="mt-2">
            {fill(copy.speciesCount, {
              n:
                info?.speciesCount === null || info === null
                  ? copy.missing
                  : String(info.speciesCount),
            })}
          </AppText>
          <AppText className="mt-2">
            {fill(copy.ftsCount, {
              n: info?.ftsCount === null || info === null ? copy.missing : String(info.ftsCount),
            })}
          </AppText>
          <AppText className="mt-2">{fill(copy.version, { version: versions })}</AppText>
          <AppText className="mt-2">
            {info === null
              ? copy.openUnknown
              : fill(copy.open, { ms: oneDecimal(info.openMilliseconds) })}
          </AppText>
          {info ? (
            <AppText className="mt-2">
              {info.importedAsset ? copy.importedYes : copy.importedNo}
            </AppText>
          ) : null}
          {info?.error ? <AppText className="mt-2">{info.error}</AppText> : null}
          <AppText className="mt-4 text-muted">{ftsSpikeQueries.join(', ')}</AppText>
          <AppText className="mt-4">{copy.series}</AppText>
          <View className="mt-2 flex-row flex-wrap">
            {ftsSeriesCounts.map((count) => (
              <Pressable
                key={count}
                accessibilityRole="button"
                accessibilityLabel={fill(copy.seriesOption, { n: String(count) })}
                accessibilityState={{ selected: seriesCount === count, disabled: running }}
                disabled={running}
                onPress={() => {
                  setSeriesCount(count);
                }}
                className="mb-2 mr-2 items-center justify-center border border-line bg-surface px-4"
                style={{ minHeight: touchTargetMinDp, opacity: running ? 0.5 : 1 }}
              >
                <AppText>{String(count)}</AppText>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fill(copy.run, { n: String(seriesCount) })}
            accessibilityState={{ disabled: running }}
            disabled={running}
            onPress={() => {
              void run();
            }}
            className="mt-4 items-center justify-center bg-accent"
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
            className="mt-2 items-center justify-center border border-line bg-surface"
            style={{ minHeight: touchTargetMinDp, opacity: running ? 1 : 0.5 }}
          >
            <AppText>{copy.cancel}</AppText>
          </Pressable>
          {runError ? <AppText className="mt-4">{runError}</AppText> : null}
          {series?.cancelled ? <AppText className="mt-4">{copy.cancelled}</AppText> : null}
          <AppText className="mt-4">
            {series?.cold
              ? fill(copy.cold, {
                  query: series.cold.query,
                  ms: oneDecimal(series.cold.milliseconds),
                  hits: String(series.cold.hitCount),
                })
              : copy.coldNone}
          </AppText>
          {stats === null ? (
            <AppText className="mt-2">{copy.warmEmpty}</AppText>
          ) : (
            <View className="mt-2">
              <AppText>{fill(copy.count, { n: String(stats.count) })}</AppText>
              <AppText>{fill(copy.mean, { ms: oneDecimal(stats.mean) })}</AppText>
              <AppText>{fill(copy.median, { ms: oneDecimal(stats.median) })}</AppText>
              <AppText>{fill(copy.min, { ms: oneDecimal(stats.min) })}</AppText>
              <AppText>{fill(copy.max, { ms: oneDecimal(stats.max) })}</AppText>
              <AppText>{fill(copy.p95, { ms: oneDecimal(stats.p95) })}</AppText>
            </View>
          )}
          <AppText className="mt-2">
            {series?.slowest
              ? fill(copy.slowest, {
                  query: series.slowest.query,
                  ms: oneDecimal(series.slowest.milliseconds),
                })
              : copy.slowestNone}
          </AppText>
          <AppText className="mt-2">
            {fill(copy.failures, { n: String(series?.failures.length ?? 0) })}
          </AppText>
          <AppText className="mt-4">
            {series?.threshold === 'pass'
              ? copy.thresholdPass
              : series?.threshold === 'fail'
                ? copy.thresholdFail
                : copy.thresholdNone}
          </AppText>
          <AppText className="mt-2 text-muted">{copy.thresholdNote}</AppText>
          <AppText className="mt-6 text-muted">{copy.copyHint}</AppText>
          <AppText className="mt-2 text-muted">{copy.reportLanguage}</AppText>
          {report ? (
            <AppText className="mt-4" selectable>
              {report}
            </AppText>
          ) : (
            <AppText className="mt-4 text-muted">{copy.noReport}</AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.share}
            accessibilityState={{ disabled: report === null }}
            disabled={report === null}
            onPress={() => {
              if (!report) return;
              void sharePlainText('spike-c-fts.txt', report, copy.share).then((result) => {
                setShareFailed(result === 'unavailable');
              });
            }}
            className="mt-4 items-center justify-center bg-accent"
            style={{ minHeight: touchTargetMinDp, opacity: report === null ? 0.5 : 1 }}
          >
            <AppText className="text-on-accent">{copy.share}</AppText>
          </Pressable>
          {shareFailed ? <AppText className="mt-2">{copy.shareFailed}</AppText> : null}
        </View>
      </ScrollView>
    </ThemeFrame>
  );
}
