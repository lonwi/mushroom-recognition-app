import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Lustro SQL z `species-ddl.ts`. Baza jest budowana przez node:sqlite, nie przez migracje Drizzle.
 * Pięć statusów jadalności jest w CHECK SQL. Nie ma kolumny na instrukcję obróbki.
 */

const species = sqliteTable('species', {
  id: text('id').primaryKey(),
  latinName: text('latin_name').notNull(),
  genus: text('genus').notNull(),
  edibility: text('edibility'),
  statusDisputed: integer('status_disputed', { mode: 'boolean' }).notNull(),
  inModel: integer('in_model', { mode: 'boolean' }).notNull(),
  incompleteCard: integer('incomplete_card', { mode: 'boolean' }).notNull(),
  contentVersion: text('content_version').notNull(),
  hymenophore: text('hymenophore'),
  monthsJson: text('months_json').notNull(),
  family: text('family'),
  highStakes: integer('high_stakes', { mode: 'boolean' }).notNull(),
  cardOrigin: text('card_origin').notNull(),
  incompleteFields: text('incomplete_fields').notNull(),
});

const speciesTexts = sqliteTable(
  'species_texts',
  {
    speciesId: text('species_id').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    warning: text('warning').notNull(),
    note: text('note').notNull(),
    cap: text('cap').notNull(),
    hymenophore: text('hymenophore').notNull(),
    stem: text('stem').notNull(),
    flesh: text('flesh').notNull(),
    habitat: text('habitat').notNull(),
    taste: text('taste').notNull(),
    nicknames: text('nicknames').notNull(),
  },
  (table) => [primaryKey({ columns: [table.speciesId, table.locale] })],
);

const speciesPhotos = sqliteTable('species_photos', {
  id: text('id').primaryKey(),
  speciesId: text('species_id').notNull(),
  file: text('file').notNull(),
  sha256: text('sha256').notNull(),
  byteSize: integer('byte_size').notNull(),
  mime: text('mime').notNull(),
  license: text('license').notNull(),
  licenseUrl: text('license_url').notNull(),
  author: text('author').notNull(),
  source: text('source').notNull(),
  sourceUrl: text('source_url').notNull(),
  observationId: text('observation_id').notNull(),
  imageUrl: text('image_url').notNull(),
  featureTag: text('feature_tag'),
  sortIndex: integer('sort_index').notNull(),
});

const lookAlikePairs = sqliteTable('look_alike_pairs', {
  id: text('id').primaryKey(),
  speciesId: text('species_id').notNull(),
  lookalikeSpeciesId: text('lookalike_species_id').notNull(),
  fatal: integer('fatal', { mode: 'boolean' }).notNull(),
  reviewStatus: text('review_status').notNull(),
  pairGroup: text('pair_group').notNull(),
  sortIndex: integer('sort_index').notNull(),
});

const lookAlikeTexts = sqliteTable(
  'look_alike_texts',
  {
    pairId: text('pair_id').notNull(),
    locale: text('locale').notNull(),
    traits: text('traits').notNull(),
  },
  (table) => [primaryKey({ columns: [table.pairId, table.locale] })],
);

const uncoveredLookAlikes = sqliteTable('uncovered_look_alikes', {
  id: text('id').primaryKey(),
  speciesId: text('species_id').notNull(),
  lookalikeSpeciesId: text('lookalike_species_id').notNull(),
  warning: text('warning').notNull(),
  fatal: integer('fatal', { mode: 'boolean' }).notNull(),
  reviewStatus: text('review_status').notNull(),
});

const modelClassSpecies = sqliteTable(
  'model_class_species',
  {
    classId: text('class_id').notNull(),
    speciesId: text('species_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.classId, table.speciesId] })],
);

const generatedImages = sqliteTable('generated_images', {
  id: text('id').primaryKey(),
  speciesId: text('species_id').notNull(),
  kind: text('kind').notNull(),
  feature: text('feature').notNull(),
  file: text('file').notNull(),
  sha256: text('sha256').notNull(),
  label: text('label').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  modelVersion: text('model_version'),
  styleId: text('style_id'),
  prompt: text('prompt').notNull(),
  negativePrompt: text('negative_prompt'),
  paramsJson: text('params_json').notNull(),
  basePhotoIds: text('base_photo_ids'),
  basePhotoLicenses: text('base_photo_licenses'),
  createdAt: text('created_at').notNull(),
  reviewStatus: text('review_status').notNull(),
  reviewer: text('reviewer'),
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),
  provenanceSignals: text('provenance_signals'),
  filePresent: integer('file_present', { mode: 'boolean' }).notNull(),
  excludedFromTraining: integer('excluded_from_training', { mode: 'boolean' }).notNull(),
});

const atlasFacet = sqliteTable('atlas_facet', {
  facet: text('facet').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
});

const atlasFeature = sqliteTable(
  'atlas_feature',
  {
    speciesId: text('species_id').notNull(),
    facet: text('facet').notNull(),
    value: text('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.speciesId, table.facet, table.value] })],
);

const contentLocale = sqliteTable('content_locale', {
  locale: text('locale').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
});

const contentMeta = sqliteTable('content_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

const illustrationPilot = sqliteTable('illustration_pilot', {
  speciesId: text('species_id').primaryKey(),
});

export const speciesTables = [
  species,
  speciesTexts,
  speciesPhotos,
  lookAlikePairs,
  lookAlikeTexts,
  uncoveredLookAlikes,
  modelClassSpecies,
  generatedImages,
  atlasFacet,
  atlasFeature,
  contentLocale,
  contentMeta,
  illustrationPilot,
];
