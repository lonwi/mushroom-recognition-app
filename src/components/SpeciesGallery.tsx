import React, { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLanguage, type TranslationParams } from '../contexts/LanguageContext';
import { galleryFeatureKey, gallerySpeciesName } from '../data/galleryCaptions';
import { galleryLicenseUrl, photosForSpecies, type GalleryPhoto } from '../data/speciesGallery';
import { colors, radius, sizing, spacing, typography } from '../theme/tokens';

type Translate = (key: string, params?: TranslationParams) => string;

function openLink(url: string): void {
  void Linking.openURL(url);
}

const GallerySlide: React.FC<{
  photo: GalleryPhoto;
  speciesId: string;
  speciesName: string;
  index: number;
  total: number;
  pageStyle: StyleProp<ViewStyle>;
  t: Translate;
}> = ({ photo, speciesId, speciesName, index, total, pageStyle, t }) => {
  const position = index + 1;
  const feature = t(galleryFeatureKey(speciesId, photo.feature));
  const sourceLabel = t('gallery.source');
  return (
    <View style={pageStyle} testID={`species-gallery-slide-${index}`}>
      <Image
        source={photo.image}
        style={styles.photo}
        resizeMode="cover"
        testID={`species-gallery-photo-${index}`}
        accessibilityLabel={t('gallery.photoLabel', { species: speciesName, feature })}
      />
      <View style={styles.caption}>
        <Text style={styles.position} testID={`species-gallery-position-${index}`}>
          {t('gallery.position', { index: position, count: total })}
        </Text>
        <Text style={styles.feature} testID={`species-gallery-feature-${index}`}>
          {feature}
        </Text>
        <Text style={styles.author} testID={`species-gallery-author-${index}`}>
          {t('gallery.author', { name: photo.author })}
        </Text>
        <Text style={styles.modified} testID={`species-gallery-modified-${index}`}>
          {t('gallery.modified')}
        </Text>
        <Pressable
          onPress={() => openLink(galleryLicenseUrl(photo.license))}
          accessibilityRole="link"
          accessibilityLabel={photo.license}
          testID={`species-gallery-license-${index}`}
        >
          <Text style={styles.link}>{photo.license}</Text>
        </Pressable>
        <Pressable
          onPress={() => openLink(photo.sourceUrl)}
          accessibilityRole="link"
          accessibilityLabel={sourceLabel}
          testID={`species-gallery-source-${index}`}
        >
          <Text style={styles.link}>{`${sourceLabel}: ${photo.sourceUrl}`}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const SpeciesGallery: React.FC<{ speciesId: string }> = ({ speciesId }) => {
  const { t, language } = useLanguage();
  const speciesName = gallerySpeciesName(speciesId, language);
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const pageWidth = containerWidth > 0 ? containerWidth : width;
  const frame = useMemo(() => StyleSheet.create({ page: { width: pageWidth } }), [pageWidth]);
  const photos = photosForSpecies(speciesId);

  if (photos.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.wrap}
      testID="species-gallery"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        setContainerWidth((current) => (current === next ? current : next));
      }}
    >
      <Text style={styles.note} testID="species-gallery-note">
        {t('gallery.note')}
      </Text>
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        testID="species-gallery-scroller"
      >
        {photos.map((photo, index) => (
          <GallerySlide
            key={`${photo.assetPath}:${photo.feature}:${index}`}
            photo={photo}
            speciesId={speciesId}
            speciesName={speciesName}
            index={index}
            total={photos.length}
            pageStyle={frame.page}
            t={t}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: 'hidden',
  },
  note: {
    color: colors.slate600,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  photo: {
    width: '100%',
    height: sizing.galleryPhotoHeight,
    backgroundColor: colors.slate200,
  },
  caption: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  position: {
    color: colors.slate500,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  feature: {
    color: colors.emerald900,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  author: {
    color: colors.slate700,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  modified: {
    color: colors.slate600,
    fontSize: typography.caption,
    marginTop: spacing.xxs,
  },
  link: {
    color: colors.green800,
    fontSize: typography.small,
    lineHeight: typography.lineHeightSmall,
    marginTop: spacing.xxs,
    textDecorationLine: 'underline',
  },
});
