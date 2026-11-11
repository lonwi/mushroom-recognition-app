export const SPECIES_DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE species (
  id TEXT PRIMARY KEY,
  latin_name TEXT NOT NULL,
  genus TEXT NOT NULL,
  edibility TEXT CHECK (
    edibility IS NULL OR edibility IN (
      'EDIBLE',
      'CONDITIONALLY_EDIBLE',
      'INEDIBLE',
      'POISONOUS',
      'DEADLY_POISONOUS'
    )
  ),
  status_disputed INTEGER NOT NULL CHECK (status_disputed IN (0, 1)),
  in_model INTEGER NOT NULL CHECK (in_model IN (0, 1)),
  incomplete_card INTEGER NOT NULL CHECK (incomplete_card IN (0, 1)),
  content_version TEXT NOT NULL,
  hymenophore TEXT,
  months_json TEXT NOT NULL,
  family TEXT,
  high_stakes INTEGER NOT NULL CHECK (high_stakes IN (0, 1)),
  card_origin TEXT NOT NULL,
  incomplete_fields TEXT NOT NULL
);

CREATE TABLE species_texts (
  species_id TEXT NOT NULL REFERENCES species(id),
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  warning TEXT NOT NULL,
  note TEXT NOT NULL,
  cap TEXT NOT NULL,
  hymenophore TEXT NOT NULL,
  stem TEXT NOT NULL,
  flesh TEXT NOT NULL,
  habitat TEXT NOT NULL,
  taste TEXT NOT NULL,
  nicknames TEXT NOT NULL,
  PRIMARY KEY (species_id, locale)
);

CREATE TABLE species_photos (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES species(id),
  file TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  mime TEXT NOT NULL CHECK (mime = 'image/webp'),
  license TEXT NOT NULL CHECK (license IN ('cc0', 'cc-by')),
  license_url TEXT NOT NULL,
  author TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  feature_tag TEXT,
  sort_index INTEGER NOT NULL
);

CREATE TABLE look_alike_pairs (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES species(id),
  lookalike_species_id TEXT NOT NULL REFERENCES species(id),
  fatal INTEGER NOT NULL CHECK (fatal IN (0, 1)),
  review_status TEXT NOT NULL CHECK (review_status IN ('proposed', 'approved', 'rejected')),
  pair_group TEXT NOT NULL,
  sort_index INTEGER NOT NULL
);

CREATE TABLE look_alike_texts (
  pair_id TEXT NOT NULL REFERENCES look_alike_pairs(id),
  locale TEXT NOT NULL,
  traits TEXT NOT NULL,
  PRIMARY KEY (pair_id, locale)
);

CREATE TABLE uncovered_look_alikes (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES species(id),
  lookalike_species_id TEXT NOT NULL REFERENCES species(id),
  warning TEXT NOT NULL,
  fatal INTEGER NOT NULL CHECK (fatal IN (0, 1)),
  review_status TEXT NOT NULL CHECK (review_status IN ('proposed', 'approved', 'rejected'))
);

CREATE TABLE model_class_species (
  class_id TEXT NOT NULL,
  species_id TEXT NOT NULL REFERENCES species(id),
  PRIMARY KEY (class_id, species_id)
);

CREATE TABLE generated_images (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES species(id),
  kind TEXT NOT NULL CHECK (kind IN ('rycina', 'ilustracja_zdjecie', 'zblizenie_cechy')),
  feature TEXT NOT NULL CHECK (
    feature IN ('przekroj', 'hymenofor', 'pierscien', 'pochwa', 'trzon', 'glowny')
  ),
  file TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label = 'ilustracja'),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  model_version TEXT,
  style_id TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  params_json TEXT NOT NULL,
  base_photo_ids TEXT,
  base_photo_licenses TEXT,
  created_at TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (
    review_status IN ('pending', 'approved', 'rejected', 'needs_changes')
  ),
  reviewer TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  provenance_signals TEXT,
  file_present INTEGER NOT NULL CHECK (file_present IN (0, 1)),
  excluded_from_training INTEGER NOT NULL CHECK (excluded_from_training = 1)
);

CREATE TABLE atlas_facet (
  facet TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1))
);

CREATE TABLE atlas_feature (
  species_id TEXT NOT NULL REFERENCES species(id),
  facet TEXT NOT NULL REFERENCES atlas_facet(facet),
  value TEXT NOT NULL,
  PRIMARY KEY (species_id, facet, value)
);

CREATE TABLE content_locale (
  locale TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1))
);

CREATE TABLE content_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE illustration_pilot (
  species_id TEXT PRIMARY KEY REFERENCES species(id)
);

CREATE VIRTUAL TABLE species_fts USING fts5(
  species_id UNINDEXED,
  search_folded,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE VIEW photo_attributions AS
SELECT species_id, author, license, license_url, source, source_url, observation_id
FROM species_photos;
`;
