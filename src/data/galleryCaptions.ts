import type { GalleryFeature } from './speciesGallery';
import { MUSHROOMS_DATABASE } from './mushrooms';

const AMANITA_GENUS = 'amanita_';
const RING_GENERA = ['galerina_', 'agaricus_', 'chlorophyllum_'] as const;
const CORTINA_GENERA = ['cortinarius_'] as const;
/** Young Hypholoma fasciculare has a cortina; it later leaves a dark ring zone, not a true ring. */
const CORTINA_SPECIES = new Set(['hypholoma_fasciculare']);
const GYROMITRA = 'gyromitra_esculenta';
const CHLOROPHYLLUM = 'chlorophyllum_rhacodes';
/** Thickened stem base that must not be read as an Amanita volva or bulb. */
const SWOLLEN_BASE_NOT_VOLVA = new Set(['inocybe_erubescens', 'agaricus_xanthodermus']);

function wholeFeatureKey(speciesId: string): string {
  if (speciesId.startsWith(AMANITA_GENUS)) {
    return 'gallery.feature.amanitaWhole';
  }
  if (speciesId === CHLOROPHYLLUM) {
    return 'gallery.feature.chlorophyllumWhole';
  }
  if (SWOLLEN_BASE_NOT_VOLVA.has(speciesId)) {
    return 'gallery.feature.swollenBaseNotVolva';
  }
  return 'gallery.feature.wholeStemBase';
}

function startsWithGenus(speciesId: string, genera: readonly string[]): boolean {
  return genera.some((genus) => speciesId.startsWith(genus));
}

/** Feature caption for this species. Bulb, volva, and egg are Amanita only. */
export function galleryFeatureKey(speciesId: string, feature: GalleryFeature): string {
  if (feature === 'C') {
    return 'gallery.feature.cap';
  }
  if (feature === 'W') {
    return wholeFeatureKey(speciesId);
  }
  if (feature === 'Y') {
    return speciesId.startsWith(AMANITA_GENUS) ? 'gallery.feature.amanitaYoung' : 'gallery.feature.young';
  }
  if (speciesId === GYROMITRA) {
    return 'gallery.feature.undersideStem';
  }
  if (CORTINA_SPECIES.has(speciesId) || startsWithGenus(speciesId, CORTINA_GENERA)) {
    return 'gallery.feature.gillsCortina';
  }
  if (speciesId.startsWith(AMANITA_GENUS) || startsWithGenus(speciesId, RING_GENERA)) {
    return 'gallery.feature.gillsRing';
  }
  return 'gallery.feature.gills';
}

export function gallerySpeciesName(speciesId: string, language: 'pl' | 'en'): string {
  const species = MUSHROOMS_DATABASE.find((item) => item.id === speciesId);
  if (!species) {
    return speciesId;
  }
  if (language === 'en') {
    return species.nameEn || species.nameLatin;
  }
  return species.namePl;
}
