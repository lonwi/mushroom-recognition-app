import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useLanguage, type TranslationParams } from '../contexts/LanguageContext';
import {
  COMPARISON_SAFETY_SOURCES,
  COMPARISON_SIDES,
  COMPARISON_TRAITS,
  comparisonPhotoById,
  type ComparisonPhoto,
  type ComparisonSideId,
  type ComparisonTrait,
} from '../data/sulphurHoneyComparison';
import { colors, radius, spacing, typography } from '../theme/tokens';

type Translate = (key: string, params?: TranslationParams) => string;
type ComparisonScheme = 'light' | 'dark';

interface Tone {
  card: string;
  text: string;
  muted: string;
  border: string;
  photo: string;
  link: string;
}

const LIGHT: Tone = {
  card: colors.surface,
  text: colors.slate900,
  muted: colors.slate600,
  border: colors.outline,
  photo: colors.slate200,
  link: colors.emerald800,
};

const DARK: Tone = {
  card: colors.slate900,
  text: colors.slate200,
  muted: colors.slate200,
  border: colors.slate600,
  photo: colors.slate800,
  link: colors.emerald300,
};

const SIDE_LABEL: Record<'hypholoma' | 'armillaria', string> = {
  hypholoma: 'comparison.sulphurHoney.hypholoma',
  armillaria: 'comparison.sulphurHoney.armillaria',
};

const SIDE_LATIN: Record<'hypholoma' | 'armillaria', string> = {
  hypholoma: 'comparison.sulphurHoney.hypholomaLatin',
  armillaria: 'comparison.sulphurHoney.armillariaLatin',
};

const GALERINA_LATIN = 'Galerina marginata';

const COLUMN_MIN_WIDTH = 160;

function toneFor(scheme: ComparisonScheme): Tone {
  return scheme === 'dark' ? DARK : LIGHT;
}

function openUrl(url: string): void {
  void Linking.openURL(url);
}

function sourceHost(url: string): string {
  const host = url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
  return host.replace(/^www\./, '');
}

function CreditLine({
  photo,
  traitId,
  tone,
  t,
}: {
  photo: ComparisonPhoto;
  traitId: string;
  tone: Tone;
  t: Translate;
}) {
  const key = `${traitId}-${photo.id}`;
  return (
    <View>
      <Text style={[styles.meta, { color: tone.muted }]} testID={`comparison-author-${key}`}>
        {t('gallery.author', { name: photo.author })}
      </Text>
      <Text style={[styles.meta, { color: tone.muted }]} testID={`comparison-modified-${key}`}>
        {t('gallery.modified')}
      </Text>
      <Pressable
        onPress={() => openUrl(photo.licenseUrl)}
        accessibilityRole="link"
        accessibilityLabel={photo.license}
        testID={`comparison-license-${key}`}
      >
        <Text style={[styles.link, { color: tone.link }]}>{photo.license}</Text>
      </Pressable>
      <Pressable
        onPress={() => openUrl(photo.sourceUrl)}
        accessibilityRole="link"
        accessibilityLabel={t('gallery.source')}
        testID={`comparison-source-${key}`}
      >
        <Text style={[styles.link, { color: tone.link }]}>{photo.sourceUrl}</Text>
      </Pressable>
    </View>
  );
}

function PhotoBlock({
  photo,
  traitId,
  species,
  tone,
  t,
}: {
  photo: ComparisonPhoto;
  traitId: string;
  species: string;
  tone: Tone;
  t: Translate;
}) {
  const caption = t(photo.captionKey);
  return (
    <View style={styles.photoBlock} testID={`comparison-photo-${traitId}-${photo.id}`}>
      <Image
        source={photo.image}
        style={[styles.photo, { backgroundColor: tone.photo }]}
        resizeMode="cover"
        accessibilityLabel={t('gallery.photoLabel', { species, feature: caption })}
      />
      <Text
        style={[styles.caption, { color: tone.text }]}
        testID={`comparison-caption-${traitId}-${photo.id}`}
      >
        {caption}
      </Text>
      <CreditLine photo={photo} traitId={traitId} tone={tone} t={t} />
    </View>
  );
}

function GalerinaHeading({
  traitId,
  tone,
  t,
}: {
  traitId: string;
  tone: Tone;
  t: Translate;
}) {
  const heading = t('comparison.sulphurHoney.galerinaHeading');
  const at = heading.indexOf(GALERINA_LATIN);
  const testID = `comparison-galerina-heading-${traitId}`;
  if (at < 0) {
    return (
      <Text style={[styles.sideName, { color: tone.text }]} testID={testID}>
        {heading}
      </Text>
    );
  }
  return (
    <Text style={[styles.sideName, { color: tone.text }]} testID={testID}>
      {heading.slice(0, at)}
      <Text style={[styles.italic, { color: tone.text }]} testID={`comparison-galerina-latin-${traitId}`}>
        {GALERINA_LATIN}
      </Text>
      {heading.slice(at + GALERINA_LATIN.length)}
    </Text>
  );
}

function SideColumn({
  trait,
  side,
  tone,
  t,
}: {
  trait: ComparisonTrait;
  side: ComparisonSideId;
  tone: Tone;
  t: Translate;
}) {
  const species =
    side === 'galerina' ? t('comparison.sulphurHoney.galerinaHeading') : t(SIDE_LABEL[side]);
  const claimKey = trait.textKey[side];
  const photos = trait.photoIds[side]
    .map((id) => comparisonPhotoById(id))
    .filter((item): item is ComparisonPhoto => item != null);
  return (
    <View
      style={[styles.side, { borderColor: tone.border, backgroundColor: tone.card }]}
      testID={`comparison-side-${side}-${trait.id}`}
    >
      {side === 'galerina' ? (
        <GalerinaHeading traitId={trait.id} tone={tone} t={t} />
      ) : (
        <>
          <Text style={[styles.sideName, { color: tone.text }]}>{species}</Text>
          <Text style={[styles.latin, { color: tone.muted }]}>{t(SIDE_LATIN[side])}</Text>
        </>
      )}
      {claimKey ? (
        <Text style={[styles.body, { color: tone.text }]}>{t(claimKey)}</Text>
      ) : (
        <View testID={`comparison-no-claim-${side}-${trait.id}`} />
      )}
      {photos.length === 0 ? (
        claimKey ? (
          <Text style={[styles.meta, { color: tone.muted }]} testID={`comparison-no-photo-${side}-${trait.id}`}>
            {t('comparison.sulphurHoney.noPhoto')}
          </Text>
        ) : null
      ) : (
        photos.map((item) => (
          <PhotoBlock key={item.id} photo={item} traitId={trait.id} species={species} tone={tone} t={t} />
        ))
      )}
    </View>
  );
}

function SourceList({
  id,
  urls,
  tone,
  t,
}: {
  id: string;
  urls: readonly string[];
  tone: Tone;
  t: Translate;
}) {
  return (
    <View style={styles.sources} testID={`comparison-sources-${id}`}>
      <Text style={[styles.meta, { color: tone.muted }]}>{t('comparison.sulphurHoney.sources')}</Text>
      {urls.map((url, index) => (
        <Pressable
          key={url}
          onPress={() => openUrl(url)}
          accessibilityRole="link"
          accessibilityLabel={sourceHost(url)}
          testID={`comparison-source-link-${id}-${index}`}
        >
          <Text style={[styles.link, { color: tone.link }]}>{url}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TraitSources({ trait, tone, t }: { trait: ComparisonTrait; tone: Tone; t: Translate }) {
  const urls = [...new Set(COMPARISON_SIDES.flatMap((side) => trait.sources[side]))];
  return <SourceList id={trait.id} urls={urls} tone={tone} t={t} />;
}

function TraitBlock({ trait, tone, t }: { trait: ComparisonTrait; tone: Tone; t: Translate }) {
  const columns = COMPARISON_SIDES.map((side) => (
    <SideColumn key={side} trait={trait} side={side} tone={tone} t={t} />
  ));
  return (
    <View style={styles.trait} testID={`comparison-trait-${trait.id}`}>
      <Text style={[styles.traitTitle, { color: tone.text }]}>{t(trait.titleKey)}</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        style={styles.columns}
        contentContainerStyle={styles.pair}
        testID={`comparison-columns-${trait.id}`}
      >
        {columns}
      </ScrollView>
      <TraitSources trait={trait} tone={tone} t={t} />
    </View>
  );
}

export const SulphurHoneyComparison: React.FC<{ colorScheme?: ComparisonScheme }> = ({ colorScheme }) => {
  const { t } = useLanguage();
  const system = useColorScheme();
  const scheme: ComparisonScheme = colorScheme ?? (system === 'dark' ? 'dark' : 'light');
  const tone = toneFor(scheme);
  return (
    <View
      style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}
      testID="sulphur-honey-comparison"
    >
      <Text style={[styles.title, { color: tone.text }]} accessibilityRole="header">
        {t('comparison.sulphurHoney.title')}
      </Text>
      <Text style={[styles.body, { color: tone.text }]} testID="comparison-lead">
        {t('comparison.sulphurHoney.lead')}
      </Text>
      <Text style={[styles.body, { color: tone.text }]} testID="comparison-limit">
        {t('comparison.sulphurHoney.limit')}
      </Text>
      <Text style={[styles.mark, { color: tone.text }]} testID="comparison-warning">
        {t('comparison.sulphurHoney.warning')}
      </Text>
      <SourceList id="safety" urls={COMPARISON_SAFETY_SOURCES} tone={tone} t={t} />
      <Text style={[styles.meta, { color: tone.muted }]} testID="comparison-scope">
        {t('comparison.sulphurHoney.scope')}
      </Text>
      {COMPARISON_TRAITS.map((trait) => (
        <TraitBlock key={trait.id} trait={trait} tone={tone} t={t} />
      ))}
    </View>
  );
};

/** Hint under the atlas “Has a ring” chip. Sulphur tuft stays in “to be verified”. */
export const RingFilterHint: React.FC = () => {
  const { t } = useLanguage();
  return (
    <View testID="filter-ring-hint" style={styles.hint}>
      <Text style={styles.hintText} testID="filter-ring-hint-text">
        {t('comparison.sulphurHoney.chipHint')}
      </Text>
      <SulphurHoneyComparison />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xs,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  trait: {
    marginTop: spacing.md,
  },
  traitTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  columns: {
    alignSelf: 'stretch',
    width: '100%',
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexGrow: 1,
    gap: spacing.sm,
  },
  side: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: COLUMN_MIN_WIDTH,
    minWidth: COLUMN_MIN_WIDTH,
    borderWidth: 1,
    borderRadius: radius.xs,
    padding: spacing.sm,
  },
  mark: {
    fontSize: typography.small,
    fontWeight: '800',
    lineHeight: typography.lineHeightSmall,
    marginBottom: spacing.xs,
  },
  italic: {
    fontStyle: 'italic',
    fontWeight: '800',
  },
  sideName: {
    fontSize: typography.small,
    fontWeight: '800',
  },
  latin: {
    fontSize: typography.caption,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  photoBlock: {
    marginTop: spacing.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.xs,
  },
  caption: {
    fontSize: typography.caption,
    lineHeight: typography.lineHeightSmall,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: typography.caption,
    lineHeight: typography.lineHeightSmall,
  },
  link: {
    fontSize: typography.caption,
    lineHeight: typography.lineHeightSmall,
    textDecorationLine: 'underline',
  },
  sources: {
    marginTop: spacing.sm,
  },
  hint: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  hintText: {
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    color: colors.slate700,
  },
});
