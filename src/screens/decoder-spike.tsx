import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { launchCameraAsync, launchImageLibraryAsync } from 'expo-image-picker';

import exampleManifest from '../../fixtures/model-manifest.example.json';
import { SPIKE_MIN_SHORT_SIDE } from '@/core/ai/decode-plan';
import { formatDecoderSpikeReport, measurePhotos } from '@/core/ai/decoder-spike';
import { readPreprocessingSpec } from '@/core/ai/image-preprocessing';
import { messagesFor } from '@/core/i18n';
import { sharePlainText } from '@/infra/diagnostics/share-log';
import { decodePhoto, readProcessMemory } from '@/infra/photo-decoder/photo-decoder';
import { platformName } from '@/infra/platform';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { AppText } from '@/ui/text';
import { touchTargetMinDp } from '@/ui/tokens';

type Slots = [string | null, string | null, string | null];

const emptySlots: Slots = [null, null, null];

function fileName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || uri;
}

export default function DecoderSpikeScreen() {
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const copy = messages.decoderSpike;
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const ready = slots.every((slot) => slot !== null);

  function addUri(uri: string) {
    setSlots((current) => {
      const index = current.findIndex((slot) => slot === null);
      if (index < 0) return current;
      const next = [...current] as Slots;
      next[index] = uri;
      return next;
    });
    setReport(null);
    setPickError(null);
  }

  async function pick(source: 'camera' | 'gallery') {
    if (running || ready) return;
    setPickError(null);
    try {
      const result =
        source === 'camera'
          ? await launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 })
          : await launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 1,
            });
      const uri = result.canceled ? null : result.assets[0]?.uri;
      if (uri) addUri(uri);
    } catch {
      setPickError(copy.pickFailed);
    }
  }

  async function decode() {
    if (!ready || running) return;
    const uris = slots.filter((slot): slot is string => slot !== null);
    setRunning(true);
    setShareFailed(false);
    setPickError(null);
    try {
      const spec = readPreprocessingSpec(exampleManifest.preprocessing);
      const measurement = await measurePhotos(uris, {
        minShortSide: spec.decodeMinWidth ?? SPIKE_MIN_SHORT_SIDE,
        spec,
        decode: decodePhoto,
        readMemory: readProcessMemory,
        startedAt: new Date().toISOString(),
      });
      setReport(formatDecoderSpikeReport(measurement));
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.pickFailed;
      setReport(`${copy.failed}\n${message}`);
    } finally {
      setRunning(false);
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
          <AppText className="mt-4">{copy.platform.replace('{name}', platformName())}</AppText>
          <View className="mt-4">
            {slots.map((slot, index) => (
              <AppText key={slot ?? `empty-${index}`} className="mt-2">
                {slot
                  ? copy.filled.replace('{n}', String(index + 1)).replace('{name}', fileName(slot))
                  : copy.empty.replace('{n}', String(index + 1))}
              </AppText>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.camera}
            accessibilityState={{ disabled: running || ready }}
            disabled={running || ready}
            onPress={() => {
              void pick('camera');
            }}
            className="mt-4 items-center justify-center bg-accent"
            style={{ minHeight: touchTargetMinDp, opacity: running || ready ? 0.5 : 1 }}
          >
            <AppText className="text-on-accent">{copy.camera}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.gallery}
            accessibilityState={{ disabled: running || ready }}
            disabled={running || ready}
            onPress={() => {
              void pick('gallery');
            }}
            className="mt-2 items-center justify-center border border-line bg-surface"
            style={{ minHeight: touchTargetMinDp, opacity: running || ready ? 0.5 : 1 }}
          >
            <AppText>{copy.gallery}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.clear}
            accessibilityState={{ disabled: running }}
            disabled={running}
            onPress={() => {
              setSlots(emptySlots);
              setReport(null);
              setPickError(null);
            }}
            className="mt-2 items-center justify-center border border-line bg-surface"
            style={{ minHeight: touchTargetMinDp }}
          >
            <AppText>{copy.clear}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.decode}
            accessibilityState={{ disabled: running || !ready }}
            disabled={running || !ready}
            onPress={() => {
              void decode();
            }}
            className="mt-4 items-center justify-center bg-accent"
            style={{ minHeight: touchTargetMinDp, opacity: running || !ready ? 0.5 : 1 }}
          >
            <AppText className="text-on-accent">{running ? copy.running : copy.decode}</AppText>
          </Pressable>
          {pickError ? <AppText className="mt-4">{pickError}</AppText> : null}
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
              void sharePlainText('spike-b-dekoder.txt', report, copy.share).then((result) => {
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
