import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { getLookAlikePairDetail, type LookAlikeSpeciesInfo } from '@/core/db/species-search';
import { messagesFor } from '@/core/i18n';
import type { ThemeName } from '@/core/theme';
import { getSpeciesDb } from '@/infra/db/species-db';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { DeadlyBadge, EdibilityBadge } from '@/ui/badge';
import { LatinBinomial } from '@/ui/latin-binomial';
import { PileusButton } from '@/ui/pileus-button';
import { Surface } from '@/ui/surface';
import { AppText } from '@/ui/text';
import { themes, touchTargetMinDp } from '@/ui/tokens';

export interface LookAlikeComparisonScreenProps {
  pairId: string;
}

interface FeatureRowProps {
  label: string;
  sourceValue: string;
  lookalikeValue: string;
  theme: ThemeName;
}

function FeatureRow({ label, sourceValue, lookalikeValue, theme }: FeatureRowProps) {
  if (!sourceValue && !lookalikeValue) return null;

  return (
    <View className="mb-4">
      <View className="mb-1.5 items-center">
        <View className="rounded border border-border bg-surface px-2.5 py-0.5">
          <AppText emphasis className="text-xs uppercase tracking-wider text-muted">
            {label}
          </AppText>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Surface
          level={1}
          theme={theme}
          testID="feature-cell-source"
          className="flex-1 p-3"
          style={{ minHeight: 64 }}
        >
          <AppText className="text-xs text-ink">{sourceValue || '—'}</AppText>
        </Surface>
        <Surface
          level={1}
          theme={theme}
          testID="feature-cell-lookalike"
          className="flex-1 p-3"
          style={{ minHeight: 64 }}
        >
          <AppText className="text-xs text-ink">{lookalikeValue || '—'}</AppText>
        </Surface>
      </View>
    </View>
  );
}

interface SpeciesColumnCardProps {
  species: LookAlikeSpeciesInfo;
  theme: ThemeName;
  edibilityLabel: string;
  testID: string;
  buttonLabel: string;
}

function SpeciesColumnCard({
  species,
  theme,
  edibilityLabel,
  testID,
  buttonLabel,
}: SpeciesColumnCardProps) {
  return (
    <Surface level={1} theme={theme} testID={testID} className="flex-1 overflow-hidden p-3">
      {species.photo ? (
        <Image
          source={{ uri: species.photo.file }}
          className="mb-2 h-32 w-full rounded-lg bg-surface"
          resizeMode="cover"
          accessibilityLabel={species.name}
        />
      ) : null}
      <AppText emphasis numberOfLines={2} className="text-sm text-ink">
        {species.name}
      </AppText>
      <LatinBinomial name={species.latinName} className="mt-0.5 text-xs" />
      <View className="mt-2 self-start">
        <EdibilityBadge
          status={species.edibility}
          statusDisputed={species.statusDisputed}
          label={edibilityLabel}
          theme={theme}
        />
      </View>
      <View className="mt-3">
        <PileusButton
          variant="outline"
          theme={theme}
          label={buttonLabel}
          accessibilityLabel={`${buttonLabel}: ${species.name}`}
          onPress={() => router.push(`/species/${species.id}`)}
        />
      </View>
    </Surface>
  );
}

export function LookAlikeComparisonScreen({ pairId }: LookAlikeComparisonScreenProps) {
  const db = getSpeciesDb();
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const locale = englishEnabled ? 'en' : 'pl';
  const colors = themes[theme];

  const pair = useMemo(() => {
    try {
      return getLookAlikePairDetail(db, pairId, locale);
    } catch {
      return null;
    }
  }, [db, pairId, locale]);

  const getEdibilityLabel = (edibility: string | null, statusDisputed: boolean) => {
    if (statusDisputed) return messages.atlas.edibilityDisputed;
    if (!edibility) return '';
    const map: Record<string, string> = {
      EDIBLE: messages.atlas.edibilityEdible,
      CONDITIONALLY_EDIBLE: messages.atlas.edibilityConditionally,
      INEDIBLE: messages.atlas.edibilityInedible,
      POISONOUS: messages.atlas.edibilityPoisonous,
      DEADLY_POISONOUS: messages.atlas.edibilityDeadly,
    };
    return map[edibility] ?? edibility;
  };

  if (!pair) {
    return (
      <ThemeFrame>
        <View className="flex-1 items-center justify-center p-6">
          <AppText emphasis className="text-xl text-ink">
            {messages.lookAlikesComparison.notFoundTitle}
          </AppText>
          <AppText className="mt-2 text-center text-sm text-muted">
            {messages.lookAlikesComparison.notFoundMessage}
          </AppText>
          <View className="mt-6">
            <PileusButton
              variant="primary"
              theme={theme}
              label={messages.lookAlikesComparison.backButton}
              accessibilityLabel={messages.lookAlikesComparison.backButton}
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ThemeFrame>
    );
  }

  const { sourceSpecies, lookalikeSpecies } = pair;

  return (
    <ThemeFrame>
      {/* Pasek nawigacyjny Stitch: Powrót */}
      <View
        className="flex-row items-center border-b border-borderSubtle px-4"
        style={{
          backgroundColor: colors.surface,
          minHeight: touchTargetMinDp,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.lookAlikesComparison.backButton}
          onPress={() => router.back()}
          className="flex-row items-center py-2"
          style={{
            minHeight: touchTargetMinDp,
            minWidth: touchTargetMinDp,
            justifyContent: 'center',
          }}
        >
          <AppText className="mr-1.5 text-base text-ink">←</AppText>
          <AppText emphasis className="text-sm font-bold text-ink">
            {messages.lookAlikesComparison.backButton}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      >
        {/* Title */}
        <View className="mb-4">
          <AppText emphasis className="text-2xl text-ink">
            {messages.lookAlikesComparison.title}
          </AppText>
        </View>

        {/* Fatal danger warning banner */}
        {pair.fatal ? (
          <Surface
            level={2}
            theme={theme}
            testID="fatal-warning-banner"
            className="mb-4 border-2 p-4"
            style={{
              borderColor: colors.danger,
              backgroundColor: theme === 'highContrast' ? colors.surface : colors.danger + '1A',
            }}
          >
            <View className="mb-2 self-start">
              <DeadlyBadge theme={theme} />
            </View>
            <AppText
              emphasis
              className="text-sm"
              style={{ color: theme === 'highContrast' ? colors.ink : colors.danger }}
            >
              {messages.lookAlikesComparison.fatalWarning}
            </AppText>
            <AppText
              className="mt-1 text-xs"
              style={{
                color: theme === 'highContrast' ? colors.muted : colors.danger,
                opacity: theme === 'highContrast' ? 1 : 0.85,
              }}
            >
              {messages.lookAlikesComparison.fatalDescription}
            </AppText>
          </Surface>
        ) : null}

        {/* Key differentiating traits */}
        {pair.traits ? (
          <Surface level={1} theme={theme} className="mb-4 p-4">
            <AppText emphasis className="mb-2 text-sm text-ink">
              {messages.lookAlikesComparison.keyDifferencesTitle}
            </AppText>
            <AppText className="text-xs leading-relaxed text-ink">{pair.traits}</AppText>
          </Surface>
        ) : null}

        {/* 50/50 Header cards */}
        <View className="mb-4 flex-row gap-2">
          <SpeciesColumnCard
            species={sourceSpecies}
            theme={theme}
            edibilityLabel={getEdibilityLabel(
              sourceSpecies.edibility,
              sourceSpecies.statusDisputed,
            )}
            testID="source-species-card"
            buttonLabel={messages.lookAlikesComparison.viewSpeciesCard}
          />
          <SpeciesColumnCard
            species={lookalikeSpecies}
            theme={theme}
            edibilityLabel={getEdibilityLabel(
              lookalikeSpecies.edibility,
              lookalikeSpecies.statusDisputed,
            )}
            testID="lookalike-species-card"
            buttonLabel={messages.lookAlikesComparison.viewSpeciesCard}
          />
        </View>

        {/* 50/50 Comparative Feature Rows */}
        <FeatureRow
          label={messages.lookAlikesComparison.featureCap}
          sourceValue={sourceSpecies.cap}
          lookalikeValue={lookalikeSpecies.cap}
          theme={theme}
        />
        <FeatureRow
          label={messages.lookAlikesComparison.featureHymenophore}
          sourceValue={sourceSpecies.hymenophoreDescription || sourceSpecies.hymenophore || ''}
          lookalikeValue={
            lookalikeSpecies.hymenophoreDescription || lookalikeSpecies.hymenophore || ''
          }
          theme={theme}
        />
        <FeatureRow
          label={messages.lookAlikesComparison.featureStem}
          sourceValue={sourceSpecies.stem}
          lookalikeValue={lookalikeSpecies.stem}
          theme={theme}
        />
        <FeatureRow
          label={messages.lookAlikesComparison.featureFlesh}
          sourceValue={sourceSpecies.flesh}
          lookalikeValue={lookalikeSpecies.flesh}
          theme={theme}
        />
        <FeatureRow
          label={messages.lookAlikesComparison.featureHabitat}
          sourceValue={sourceSpecies.habitat}
          lookalikeValue={lookalikeSpecies.habitat}
          theme={theme}
        />
        <FeatureRow
          label={messages.lookAlikesComparison.featureTaste}
          sourceValue={sourceSpecies.taste}
          lookalikeValue={lookalikeSpecies.taste}
          theme={theme}
        />
      </ScrollView>
    </ThemeFrame>
  );
}
