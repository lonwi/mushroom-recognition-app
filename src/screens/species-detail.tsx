import { router } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { getSpeciesDetail } from '@/core/db/species-search';
import { messagesFor } from '@/core/i18n';
import { getSpeciesDb } from '@/infra/db/species-db';
import { useSettings } from '@/infra/settings/use-settings-store';
import { ThemeFrame } from '@/screens/theme-frame';
import { DeadlyBadge, EdibilityBadge, IllustrationBadge } from '@/ui/badge';
import { LatinBinomial } from '@/ui/latin-binomial';
import { PileusButton } from '@/ui/pileus-button';
import { Surface } from '@/ui/surface';
import { AppText } from '@/ui/text';
import { themes, touchTargetMinDp } from '@/ui/tokens';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatMonths(months: number[]): string {
  if (!months || months.length === 0) return '';
  const sorted = [...months].sort((a, b) => a - b);
  return sorted.map((m) => ROMAN_MONTHS[m - 1] ?? String(m)).join(', ');
}

function TraitRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View className="mb-3">
      <AppText className="text-xs font-semibold text-muted">{label}</AppText>
      <AppText className="text-sm text-ink">{value}</AppText>
    </View>
  );
}

export interface SpeciesDetailScreenProps {
  id: string;
}

export function SpeciesDetailScreen({ id }: SpeciesDetailScreenProps) {
  const db = getSpeciesDb();
  const theme = useSettings((state) => state.theme);
  const englishEnabled = useSettings((state) => state.englishEnabled);
  const messages = messagesFor(englishEnabled);
  const locale = englishEnabled ? 'en' : 'pl';
  const colors = themes[theme];

  const detail = useMemo(() => {
    try {
      return getSpeciesDetail(db, id, locale);
    } catch {
      return null;
    }
  }, [db, id, locale]);

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

  if (!detail) {
    return (
      <ThemeFrame>
        <View className="flex-1 items-center justify-center p-6">
          <AppText emphasis className="text-xl text-ink">
            {messages.speciesDetail.notFoundTitle}
          </AppText>
          <AppText className="mt-2 text-center text-sm text-muted">
            {messages.speciesDetail.notFoundMessage}
          </AppText>
          <View className="mt-6">
            <PileusButton
              variant="primary"
              theme={theme}
              label={messages.speciesDetail.backToAtlas}
              accessibilityLabel={messages.speciesDetail.backToAtlas}
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ThemeFrame>
    );
  }

  const formattedSeason = formatMonths(detail.months);

  return (
    <ThemeFrame>
      {/* Pasek nawigacyjny Stitch: Powrót do Atlasu */}
      <View
        className="flex-row items-center border-b border-borderSubtle px-4"
        style={{
          backgroundColor: colors.surface,
          minHeight: touchTargetMinDp,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.speciesDetail.backToAtlas}
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
            {messages.tabs.atlas}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="mb-4">
          <AppText emphasis className="text-2xl text-ink">
            {detail.name}
          </AppText>
          <LatinBinomial name={detail.latinName} className="mt-1 text-base" />

          {/* Badges row */}
          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <EdibilityBadge
              status={detail.edibility}
              statusDisputed={detail.statusDisputed}
              incompleteCard={detail.incompleteCard}
              label={getEdibilityLabel(detail.edibility, detail.statusDisputed)}
              theme={theme}
            />
            {!detail.inModel ? (
              <View
                className="rounded border border-border bg-surface px-2 py-1"
                accessibilityRole="text"
              >
                <AppText className="text-xs text-muted">
                  {messages.speciesDetail.notInModel}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Meta: Rodzina, Rodzaj, Inne nazwy */}
          {detail.family || detail.genus ? (
            <View className="mt-3 flex-row flex-wrap gap-x-4">
              {detail.genus ? (
                <AppText className="text-xs text-muted">
                  {messages.speciesDetail.genusLabel}: {detail.genus}
                </AppText>
              ) : null}
              {detail.family ? (
                <AppText className="text-xs text-muted">
                  {messages.speciesDetail.familyLabel}: {detail.family}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {detail.nicknames.length > 0 ? (
            <View className="mt-1">
              <AppText className="text-xs text-muted">
                {messages.speciesDetail.nicknamesLabel}: {detail.nicknames.join(', ')}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Ostrzeżenie o toksyczności / wysokiej stawce */}
        {detail.warning ? (
          <Surface
            level={2}
            theme={theme}
            className="mb-4 border-2 p-4"
            style={{
              borderColor: colors.danger,
              backgroundColor: theme === 'highContrast' ? colors.surface : colors.danger + '1A',
            }}
          >
            {detail.edibility === 'DEADLY_POISONOUS' ? (
              <View className="mb-2 self-start">
                <DeadlyBadge theme={theme} />
              </View>
            ) : null}
            <AppText
              emphasis
              className="text-sm"
              style={{ color: theme === 'highContrast' ? colors.ink : colors.danger }}
            >
              {detail.warning}
            </AppText>
          </Surface>
        ) : null}

        {/* Niekompletna karta — ostrzeżenie */}
        {detail.incompleteCard ? (
          <Surface
            level={1}
            theme={theme}
            className="mb-4 border p-4"
            style={{
              borderColor: colors.warning,
              backgroundColor: theme === 'highContrast' ? colors.surface : colors.warning + '1A',
            }}
          >
            <AppText
              emphasis
              className="text-sm"
              style={{ color: theme === 'highContrast' ? colors.ink : colors.warning }}
            >
              {messages.speciesDetail.incompleteCard}
            </AppText>
            <AppText className="mt-1 text-xs text-muted">
              {messages.speciesDetail.incompleteDescription}
            </AppText>
          </Surface>
        ) : null}

        {/* Ostrzeżenie gdy grzyb nie jest w modelu */}
        {!detail.inModel ? (
          <Surface level={1} theme={theme} className="mb-4 border border-border p-4">
            <AppText emphasis className="text-sm text-ink">
              {messages.speciesDetail.notInModel}
            </AppText>
            <AppText className="mt-1 text-xs text-muted">
              {messages.speciesDetail.notInModelDescription}
            </AppText>
          </Surface>
        ) : null}

        {/* Morfologia i cechy rozpoznawcze */}
        <Surface level={1} theme={theme} className="mb-6 p-4">
          <AppText emphasis className="mb-3 text-lg text-ink">
            {messages.speciesDetail.morphologyTitle}
          </AppText>

          <TraitRow label={messages.speciesDetail.cap} value={detail.cap} />
          <TraitRow
            label={messages.speciesDetail.hymenophore}
            value={detail.hymenophoreDescription || detail.hymenophore || ''}
          />
          <TraitRow label={messages.speciesDetail.stem} value={detail.stem} />
          <TraitRow label={messages.speciesDetail.flesh} value={detail.flesh} />
          <TraitRow label={messages.speciesDetail.habitat} value={detail.habitat} />
          {formattedSeason ? (
            <TraitRow label={messages.speciesDetail.season} value={formattedSeason} />
          ) : null}
          <TraitRow label={messages.speciesDetail.taste} value={detail.taste} />
          <TraitRow label={messages.speciesDetail.note} value={detail.note} />
        </Surface>

        {/* Galeria fotografii terenowych (tylko CC0/CC BY z atrybucją) */}
        <View className="mb-6">
          <AppText emphasis className="mb-3 text-lg text-ink">
            {messages.speciesDetail.photosTitle}
          </AppText>
          {detail.photos.length === 0 ? (
            <Surface level={1} theme={theme} className="p-4">
              <AppText className="text-xs text-muted">{messages.speciesDetail.noPhotos}</AppText>
            </Surface>
          ) : (
            detail.photos.map((photo) => (
              <Surface
                key={photo.id}
                testID="photo-card"
                level={1}
                theme={theme}
                className="mb-4 overflow-hidden p-3"
              >
                <Image
                  source={{ uri: photo.file }}
                  className="h-48 w-full rounded-lg bg-surface"
                  resizeMode="cover"
                  accessibilityLabel={photo.featureTag ?? detail.name}
                />
                <View className="mt-2">
                  <AppText className="text-xs text-muted">
                    {messages.speciesDetail.photoAuthor.replace('{author}', photo.author)}
                  </AppText>
                  <AppText className="text-xs text-muted">
                    {messages.speciesDetail.photoLicense.replace('{license}', photo.license)}
                  </AppText>
                </View>
              </Surface>
            ))
          )}
        </View>

        {/* Ryciny i diagramy budowy anatomicznej (D-17) */}
        {detail.illustrations.length > 0 ? (
          <View className="mb-6">
            <AppText emphasis className="mb-3 text-lg text-ink">
              {messages.speciesDetail.illustrationsTitle}
            </AppText>
            {detail.illustrations.map((image) => (
              <Surface
                key={image.id}
                testID="illustration-card"
                level={1}
                theme={theme}
                className="mb-4 overflow-hidden p-3"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <AppText emphasis className="text-xs uppercase tracking-wider text-muted">
                    {image.feature}
                  </AppText>
                  <IllustrationBadge label={messages.speciesDetail.illustrationBadge} />
                </View>
                <Image
                  source={{ uri: image.file }}
                  className="h-48 w-full rounded-lg bg-surface"
                  resizeMode="contain"
                  accessibilityLabel={image.label}
                />
                <AppText emphasis className="mt-2 text-sm text-ink">
                  {image.label}
                </AppText>
                {image.reviewStatus !== 'accepted' ? (
                  <AppText className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    {messages.speciesDetail.illustrationPending}
                  </AppText>
                ) : null}
                <AppText className="mt-1 text-xs text-muted">
                  {messages.speciesDetail.illustrationAttribution.replace('{tool}', 'FLUX.1')}
                </AppText>
              </Surface>
            ))}
          </View>
        ) : null}

        {/* Podobne gatunki (sobowtóry) */}
        {detail.lookAlikes.length > 0 ? (
          <View className="mb-6">
            <AppText emphasis className="mb-3 text-lg text-ink">
              {messages.speciesDetail.lookAlikesTitle}
            </AppText>
            <View className="gap-3">
              {detail.lookAlikes.map((pair) => (
                <Surface
                  key={pair.id}
                  testID="lookalike-card"
                  level={1}
                  theme={theme}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="mr-2 flex-1">
                      <AppText emphasis className="text-base text-ink">
                        {pair.lookalikeName}
                      </AppText>
                      <LatinBinomial name={pair.lookalikeLatin} className="text-xs" />
                    </View>
                    <EdibilityBadge
                      status={pair.lookalikeEdibility}
                      label={getEdibilityLabel(pair.lookalikeEdibility, false)}
                      theme={theme}
                    />
                  </View>
                  {pair.fatal ? (
                    <View
                      className="mt-2 flex-row items-center rounded border p-2"
                      style={{
                        borderColor: colors.danger,
                        backgroundColor:
                          theme === 'highContrast' ? colors.surface : colors.danger + '1A',
                      }}
                    >
                      <AppText
                        emphasis
                        className="text-xs"
                        style={{ color: theme === 'highContrast' ? colors.ink : colors.danger }}
                      >
                        {messages.speciesDetail.lookAlikesFatal}
                      </AppText>
                    </View>
                  ) : null}
                  {pair.traits ? (
                    <View className="mt-2">
                      <AppText className="text-xs font-semibold text-muted">
                        {messages.speciesDetail.traitsLabel}:
                      </AppText>
                      <AppText className="text-xs text-ink">{pair.traits}</AppText>
                    </View>
                  ) : null}
                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1">
                      <PileusButton
                        variant="outline"
                        theme={theme}
                        label={messages.speciesDetail.compare5050}
                        accessibilityLabel={`${messages.speciesDetail.compare5050}: ${pair.lookalikeName}`}
                        onPress={() => router.push(`/look-alikes/${pair.id}`)}
                      />
                    </View>
                    <View className="flex-1">
                      <PileusButton
                        variant="secondary"
                        theme={theme}
                        label={pair.lookalikeName}
                        accessibilityLabel={pair.lookalikeName}
                        onPress={() => router.push(`/species/${pair.lookalikeId}`)}
                      />
                    </View>
                  </View>
                </Surface>
              ))}
            </View>
          </View>
        ) : null}

        {/* Niepokryte groźne sobowtóry (uncoveredLookAlikes) */}
        {detail.uncoveredLookAlikes.length > 0 ? (
          <Surface
            level={2}
            theme={theme}
            className="mt-2 border-2 p-4"
            style={{
              borderColor: colors.danger,
              backgroundColor: theme === 'highContrast' ? colors.surface : colors.danger + '1A',
            }}
          >
            <AppText
              emphasis
              className="mb-1 text-base"
              style={{ color: theme === 'highContrast' ? colors.ink : colors.danger }}
            >
              {messages.speciesDetail.uncoveredTitle}
            </AppText>
            <AppText
              className="mb-3 text-xs"
              style={{
                color: theme === 'highContrast' ? colors.muted : colors.danger,
                opacity: theme === 'highContrast' ? 1 : 0.85,
              }}
            >
              {messages.speciesDetail.uncoveredWarning}
            </AppText>
            <View className="gap-3">
              {detail.uncoveredLookAlikes.map((uncovered) => (
                <Surface
                  key={uncovered.id}
                  testID="uncovered-lookalike-card"
                  level={1}
                  theme={theme}
                  className="p-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="mr-2 flex-1">
                      <AppText emphasis className="text-sm text-ink">
                        {uncovered.lookalikeName}
                      </AppText>
                      <LatinBinomial name={uncovered.lookalikeLatin} className="text-xs" />
                    </View>
                    <EdibilityBadge
                      status={uncovered.lookalikeEdibility}
                      label={getEdibilityLabel(uncovered.lookalikeEdibility, false)}
                      theme={theme}
                    />
                  </View>
                  {uncovered.fatal ? (
                    <View className="mt-1">
                      <AppText
                        emphasis
                        className="text-xs"
                        style={{ color: theme === 'highContrast' ? colors.ink : colors.danger }}
                      >
                        {messages.speciesDetail.lookAlikesFatal}
                      </AppText>
                    </View>
                  ) : null}
                  {uncovered.warning ? (
                    <AppText className="mt-2 text-xs text-ink">{uncovered.warning}</AppText>
                  ) : null}
                </Surface>
              ))}
            </View>
          </Surface>
        ) : null}
      </ScrollView>
    </ThemeFrame>
  );
}
