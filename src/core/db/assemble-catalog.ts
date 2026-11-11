import { foldForSearch } from '@/core/db/fold-search';
import { cleanCardText } from '@/core/db/preparation-text';
import type { SqlValue } from '@/core/db/sql-db';

export type Edibility =
  'EDIBLE' | 'CONDITIONALLY_EDIBLE' | 'INEDIBLE' | 'POISONOUS' | 'DEADLY_POISONOUS';

const DONOR_STATUSES = new Set<Edibility>(['EDIBLE', 'INEDIBLE', 'POISONOUS', 'DEADLY_POISONOUS']);

const GROUP_EPITHETS = new Set(['inne', 'czerwone']);

const HYMENOPHORE_TOKEN: Record<string, string> = {
  TUBES: 'rurki',
  GILLS: 'blaszki',
  FOLDS: 'listewki',
  SPINES: 'kolce',
  OTHER: 'inny',
};

const PROCESS_NOTE =
  'Status w materiałach projektu jest sporny albo warunkowy. Rozstrzyga recenzent.';

const UNCOVERED_WITHOUT_TRAITS =
  'Propozycja sobowtóra spoza modelu. Opis cech nie jest uzupełniony.';

const PROMPT_REDACTED = 'Prompt pominięty przez słownik obróbki.';

interface DonorCard {
  id: string;
  namePl: string;
  nameEn?: string;
  nameLatin: string;
  commonNicknames: string[];
  family: string;
  status: Edibility;
  incompleteCard?: boolean;
  hymenophore: string;
  months: number[];
  habitat: string;
  capDescription: string;
  hymenophoreDescription: string;
  stemDescription: string;
  fleshDescription: string;
  tasteAndSmell: string;
  confusionRisks: {
    confusedWithId: string;
    confusedWithName: string;
    confusedWithStatus: string;
    keyDifferences: string[];
    fatal: boolean;
  }[];
  warningNotes?: string;
}

interface CoverageClass {
  classId: string;
  latin: string;
  polish: string;
  highStakes: boolean;
  notes: string;
}

interface Twin {
  slug: string;
  nazwa: string;
  status_jadalnosci: string;
  poziom_ryzyka: string;
  poza_modelem: boolean;
  cechy_odrozniajace: string | null;
  review_status?: string;
}

interface Karta {
  slug: string;
  nazwa_lacinska: string;
  nazwa_pl: string;
  status_jadalnosci: string;
  flagi?: string;
  sobowtory: Twin[];
}

export interface LookalikeFile {
  _meta: { nie_zatwierdzone: boolean };
  karty: Karta[];
  proponowane_DANGEROUS_PAIRS: { klasy: [string, string]; grupa: string }[];
  dodatkowe_pary_do_rozważenia: { para: [string, string]; powod: string }[];
  pary_usuwane_wzgledem_starego_recognition_math: { para: string[]; powod: string }[];
}

interface ProvenanceImage {
  species: string;
  view: string;
  file: string;
  sha256: string;
  label: string;
  kind: string;
  tool?: string;
  model?: string;
  date?: string;
  timezone?: string;
  width?: number;
  height?: number;
  bytes?: number;
  iteration_count?: number;
  final_prompt?: string;
  notes?: string;
  reviewed_by?: string;
  review_pass?: string;
  review_status?: string;
  base_photo_ids?: string[] | null;
  photos_sent_to_generator?: unknown[];
  reference_images?: {
    path?: string;
    license?: string;
    author?: string;
    commons_url?: string;
  }[];
}

export interface CatalogInput {
  contentVersion: string;
  classes: CoverageClass[];
  donorCards: DonorCard[];
  filterFacets: Record<string, { hymenophore: string | null; substrate: string[] }>;
  lookalikes: LookalikeFile;
  provenanceImages: ProvenanceImage[];
  featuresByFile: Record<string, string>;
  presentIllustrationFiles: ReadonlySet<string>;
  phrases: readonly string[];
  facets: { facet: string; enabled: boolean }[];
  locales: { locale: string; enabled: boolean }[];
}

interface Redaction {
  id: string;
  field: string;
  phrases: string[];
}

interface StatusReview {
  id: string;
  latin: string;
  polish: string;
  edibility: string | null;
  statusDisputed: boolean;
  incompleteCard: boolean;
  inModel: boolean;
  cardOrigin: string;
  sourceFlag: string;
}

export interface Catalog {
  species: Record<string, SqlValue>[];
  texts: Record<string, SqlValue>[];
  features: Record<string, SqlValue>[];
  facets: Record<string, SqlValue>[];
  locales: Record<string, SqlValue>[];
  classLinks: Record<string, SqlValue>[];
  pairs: Record<string, SqlValue>[];
  pairTexts: Record<string, SqlValue>[];
  uncovered: Record<string, SqlValue>[];
  images: Record<string, SqlValue>[];
  pilots: Record<string, SqlValue>[];
  fts: { species_id: string; search_folded: string }[];
  redactions: Redaction[];
  statusReview: StatusReview[];
  excludedPairs: { para: string[]; powod: string }[];
  pairReviewStatus: 'proposed' | 'approved';
}

interface Draft {
  id: string;
  latin: string;
  polish: string;
  genus: string;
  edibility: Edibility | null;
  disputed: boolean;
  inModel: boolean;
  hymenophore: string | null;
  months: number[];
  family: string | null;
  highStakes: boolean;
  origin: string;
  nicknames: string[];
  donor: DonorCard | null;
  sourceFlag: string;
  forcedMissing: string[];
}

function hasWord(text: string, word: string): boolean {
  const folded = foldForSearch(text);
  return new RegExp(`(?:^|[^a-z])${foldForSearch(word)}(?:[^a-z]|$)`).test(folded);
}

export function mapStatusWord(raw: string | undefined): Edibility | null {
  if (!raw) return null;
  const folded = foldForSearch(raw);
  if (folded.includes('smiertel')) return 'DEADLY_POISONOUS';
  if (folded.includes('truj')) return 'POISONOUS';
  if (folded.includes('niejadal')) return 'INEDIBLE';
  if (folded.includes('jadal')) return 'EDIBLE';
  return null;
}

function capitalize(word: string): string {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
}

function binomialFromSlug(slug: string): string | null {
  const parts = slug.split('_');
  if (parts.length === 0 || parts.some((part) => !/^[a-z]+$/.test(part))) return null;
  const genus = capitalize(parts[0] ?? slug);
  if (parts.length === 1) return genus;
  if (GROUP_EPITHETS.has(parts[1] ?? '')) return genus;
  return `${genus} ${parts.slice(1).join(' ')}`;
}

function genusOf(latin: string): string {
  const word = latin.split(/[\s,]+/).find((part) => part.length > 0);
  return word ?? latin;
}

function speciesIdFromTwin(slug: string): string {
  return slug.startsWith('poza:') ? slug.slice('poza:'.length) : slug;
}

function warningFallback(edibility: Edibility): string {
  const label = edibility === 'DEADLY_POISONOUS' ? 'śmiertelnie trujący' : 'trujący';
  return `Ostrzeżenie: kartoteka oznacza ten gatunek jako ${label}. Aplikacja nie ocenia jadalności.`;
}

function pairReview(value: string | undefined, fallback: 'proposed' | 'approved'): string {
  if (value === 'proposed' || value === 'approved' || value === 'rejected') return value;
  return fallback;
}

function isFatal(twin: Twin): boolean {
  return hasWord(`${twin.poziom_ryzyka} ${twin.status_jadalnosci}`, 'smiertelny');
}

export function assembleCatalog(input: CatalogInput): Catalog {
  if (typeof input.lookalikes._meta.nie_zatwierdzone !== 'boolean') {
    throw new Error('karty-sobowtory: brak flagi nie_zatwierdzone');
  }
  const pairReviewStatus = input.lookalikes._meta.nie_zatwierdzone ? 'proposed' : 'approved';
  const classIds = input.classes.map((row) => row.classId);
  const kartyIds = input.lookalikes.karty.map((card) => card.slug);
  if (classIds.length !== new Set(classIds).size) throw new Error('Powtórzona klasa w pokryciu');
  if (
    classIds.length !== kartyIds.length ||
    classIds.some((classId) => !kartyIds.includes(classId))
  ) {
    throw new Error('Lista klas i karty sobowtórów mają różne slugi');
  }

  const donors = new Map(input.donorCards.map((card) => [card.id, card]));
  const karty = new Map(input.lookalikes.karty.map((card) => [card.slug, card]));
  for (const donor of donors.values()) {
    if (!DONOR_STATUSES.has(donor.status)) {
      throw new Error(`${donor.id}: status dawcy spoza czterech wartości karty`);
    }
  }

  const redactions: Redaction[] = [];
  const clean = (id: string, field: string, text: string | null | undefined): string => {
    const result = cleanCardText(text, input.phrases);
    if (result.hits.length > 0) {
      redactions.push({ id, field, phrases: [...new Set(result.hits)] });
    }
    return result.text;
  };

  const drafts = new Map<string, Draft>();
  const addDraft = (draft: Draft) => {
    if (drafts.has(draft.id)) throw new Error(`Powtórzona karta: ${draft.id}`);
    drafts.set(draft.id, draft);
  };

  for (const coverage of input.classes) {
    const donor = donors.get(coverage.classId) ?? null;
    const card = karty.get(coverage.classId);
    const mapped = mapStatusWord(card?.status_jadalnosci);
    const mismatch = donor && mapped && donor.status !== mapped;
    const sourceFlag = uniqueText([coverage.notes, card?.flagi ?? '']);
    const disputed =
      hasWord(sourceFlag, 'sporny') || hasWord(sourceFlag, 'warunkowy') || Boolean(mismatch);
    const edibility = donor?.status ?? mapped;
    addDraft({
      id: coverage.classId,
      latin: donor?.nameLatin || coverage.latin,
      polish: donor?.namePl || coverage.polish,
      genus: genusOf(donor?.nameLatin || coverage.latin),
      edibility,
      disputed,
      inModel: true,
      hymenophore: donor?.hymenophore ?? null,
      months: donor?.months ?? [],
      family: donor?.family ?? null,
      highStakes: coverage.highStakes,
      origin: donor ? 'donor' : 'class_list',
      nicknames: donor?.commonNicknames ?? [],
      donor,
      sourceFlag: mismatch
        ? `${sourceFlag} Karta dawcy: ${donor?.status}. Propozycja: ${card?.status_jadalnosci}.`.trim()
        : sourceFlag,
      forcedMissing: donor?.incompleteCard ? ['donor_incomplete'] : [],
    });
  }

  const rubellus = donors.get('cortinarius_rubellus');
  if (rubellus && !drafts.has(rubellus.id)) {
    addDraft(donorOnlyDraft(rubellus, true, 'merged_class_member'));
  }
  if (!drafts.has('neoboletus_erythropus')) {
    addDraft({
      id: 'neoboletus_erythropus',
      latin: 'Neoboletus erythropus',
      polish: '',
      genus: 'Neoboletus',
      edibility: null,
      disputed: false,
      inModel: true,
      hymenophore: null,
      months: [],
      family: null,
      highStakes: false,
      origin: 'merged_class_member',
      nicknames: [],
      donor: null,
      sourceFlag:
        'Klasa neoboletus_luridiformis obejmuje ten gatunek (pokrycie-67). Brak osobnej karty dawcy.',
      forcedMissing: ['donor_card', 'polish_name'],
    });
  }

  const outside = new Map<string, Twin[]>();
  for (const card of input.lookalikes.karty) {
    for (const twin of card.sobowtory) {
      if (!twin.poza_modelem) continue;
      const id = speciesIdFromTwin(twin.slug);
      if (drafts.has(id)) throw new Error(`Sobowtór spoza modelu zderza się z klasą: ${id}`);
      const list = outside.get(id) ?? [];
      list.push(twin);
      outside.set(id, list);
    }
  }
  for (const [id, twins] of outside) {
    const first = twins[0];
    if (!first) continue;
    let edibility = mapStatusWord(first.status_jadalnosci);
    let disputed = false;
    for (const twin of twins) {
      const mapped = mapStatusWord(twin.status_jadalnosci);
      if (mapped && edibility && mapped !== edibility) disputed = true;
      else if (mapped && !edibility) edibility = mapped;
      const blob = `${twin.status_jadalnosci} ${twin.poziom_ryzyka}`;
      if (hasWord(blob, 'sporny')) disputed = true;
    }
    const latin = binomialFromSlug(id) ?? first.nazwa;
    addDraft({
      id,
      latin,
      polish: first.nazwa,
      genus: genusOf(latin),
      edibility,
      disputed,
      inModel: false,
      hymenophore: null,
      months: [],
      family: null,
      highStakes: edibility === 'POISONOUS' || edibility === 'DEADLY_POISONOUS',
      origin: 'out_of_model',
      nicknames: [],
      donor: null,
      sourceFlag: twins
        .map((twin) => `${twin.status_jadalnosci} / ${twin.poziom_ryzyka}`)
        .join(' | '),
      forcedMissing: ['donor_card'],
    });
  }

  const speciesRows: Record<string, SqlValue>[] = [];
  const texts: Record<string, SqlValue>[] = [];
  const features: Record<string, SqlValue>[] = [];
  const fts: Catalog['fts'] = [];
  const statusReview: StatusReview[] = [];

  for (const draft of drafts.values()) {
    const missing = new Set(draft.forcedMissing);
    if (!draft.donor && draft.origin !== 'merged_class_member') missing.add('donor_card');
    if (!draft.polish) missing.add('polish_name');
    if (!draft.edibility) missing.add('edibility');
    const morphology = morphologyFields(draft, clean, missing);
    let warning = draft.donor ? clean(draft.id, 'warning', draft.donor.warningNotes) : '';
    if (
      (draft.edibility === 'POISONOUS' || draft.edibility === 'DEADLY_POISONOUS') &&
      warning.length === 0
    ) {
      warning = warningFallback(draft.edibility);
      missing.add('warning_fallback');
    }
    const note = draft.disputed ? clean(draft.id, 'note', draft.sourceFlag) || PROCESS_NOTE : '';
    const incomplete = missing.size > 0;
    const polishName = draft.polish || draft.latin;
    speciesRows.push({
      id: draft.id,
      latin_name: draft.latin,
      genus: draft.genus,
      edibility: draft.edibility,
      status_disputed: draft.disputed ? 1 : 0,
      in_model: draft.inModel ? 1 : 0,
      incomplete_card: incomplete ? 1 : 0,
      content_version: input.contentVersion,
      hymenophore: draft.hymenophore,
      months_json: JSON.stringify(draft.months),
      family: draft.family,
      high_stakes: draft.highStakes ? 1 : 0,
      card_origin: draft.origin,
      incomplete_fields: JSON.stringify([...missing].sort()),
    });
    texts.push({
      species_id: draft.id,
      locale: 'pl',
      name: polishName,
      warning,
      note,
      cap: morphology.cap,
      hymenophore: morphology.hymenophore,
      stem: morphology.stem,
      flesh: morphology.flesh,
      habitat: morphology.habitat,
      taste: morphology.taste,
      nicknames: JSON.stringify(draft.nicknames),
    });
    const search = [
      polishName,
      draft.latin,
      draft.nicknames.join(' '),
      draft.id.replaceAll('_', ' '),
    ]
      .filter((part) => part.length > 0)
      .join(' ');
    fts.push({ species_id: draft.id, search_folded: foldForSearch(search) });
    pushFeatures(features, draft, input.filterFacets[draft.id]);
    statusReview.push({
      id: draft.id,
      latin: draft.latin,
      polish: polishName,
      edibility: draft.edibility,
      statusDisputed: draft.disputed,
      incompleteCard: incomplete,
      inModel: draft.inModel,
      cardOrigin: draft.origin,
      sourceFlag: draft.sourceFlag,
    });
  }

  const classLinks: Record<string, SqlValue>[] = input.classes.map((row) => ({
    class_id: row.classId,
    species_id: row.classId,
  }));
  if (drafts.has('cortinarius_rubellus')) {
    classLinks.push({ class_id: 'cortinarius_orellanus', species_id: 'cortinarius_rubellus' });
  }
  if (drafts.has('neoboletus_erythropus')) {
    classLinks.push({
      class_id: 'neoboletus_luridiformis',
      species_id: 'neoboletus_erythropus',
    });
  }

  const pairs: Record<string, SqlValue>[] = [];
  const pairTexts: Record<string, SqlValue>[] = [];
  const uncovered: Record<string, SqlValue>[] = [];
  const seenDirected = new Set<string>();
  for (const card of input.lookalikes.karty) {
    card.sobowtory.forEach((twin, index) => {
      const otherId = speciesIdFromTwin(twin.slug);
      if (!drafts.has(otherId)) throw new Error(`Sobowtór ${twin.slug} nie ma karty`);
      const pairId = `${card.slug}__${otherId}__${index}`;
      seenDirected.add(`${card.slug}__${otherId}`);
      const donorTraits = traitsFromDonor(drafts.get(card.slug)?.donor ?? null, otherId);
      const rawTraits = twin.cechy_odrozniajace?.trim() ? twin.cechy_odrozniajace : donorTraits;
      const traits = clean(pairId, 'traits', rawTraits);
      pairs.push({
        id: pairId,
        species_id: card.slug,
        lookalike_species_id: otherId,
        fatal: isFatal(twin) ? 1 : 0,
        review_status: pairReview(twin.review_status, pairReviewStatus),
        pair_group: 'karta',
        sort_index: index,
      });
      if (traits) pairTexts.push({ pair_id: pairId, locale: 'pl', traits });
      if (twin.poza_modelem) {
        uncovered.push({
          id: pairId,
          species_id: card.slug,
          lookalike_species_id: otherId,
          warning: traits || UNCOVERED_WITHOUT_TRAITS,
          fatal: isFatal(twin) ? 1 : 0,
          review_status: pairReview(twin.review_status, pairReviewStatus),
        });
      }
    });
  }

  addListedPairs(
    pairs,
    seenDirected,
    drafts,
    input.lookalikes.proponowane_DANGEROUS_PAIRS.map((pair) => ({
      classes: pair.klasy,
      group: pair.grupa,
    })),
    pairReviewStatus,
  );
  addListedPairs(
    pairs,
    seenDirected,
    drafts,
    input.lookalikes.dodatkowe_pary_do_rozważenia.map((pair) => ({
      classes: pair.para,
      group: 'do_rozważenia',
    })),
    pairReviewStatus,
  );

  const images: Record<string, SqlValue>[] = [];
  const pilots = new Set<string>();
  for (const image of input.provenanceImages) {
    if (!drafts.has(image.species)) throw new Error(`Rycina bez karty: ${image.species}`);
    if (image.label !== 'ilustracja')
      throw new Error(`${image.file}: etykieta nie jest ilustracja`);
    if (!['rycina', 'ilustracja_zdjecie', 'zblizenie_cechy'].includes(image.kind)) {
      throw new Error(`${image.file}: nieznany kind`);
    }
    const feature = input.featuresByFile[image.file];
    if (!feature) throw new Error(`Brak feature dla ${image.file}`);
    const present = input.presentIllustrationFiles.has(image.file);
    const reviewStatus =
      present &&
      (image.review_status === 'approved' ||
        image.review_status === 'rejected' ||
        image.review_status === 'needs_changes')
        ? image.review_status
        : 'pending';
    const prompt = clean(image.file, 'prompt', image.final_prompt ?? '') || PROMPT_REDACTED;
    const sent = (image.photos_sent_to_generator ?? []).map((item) => String(item));
    const bases = sent.map((sentPath) => {
      const reference = (image.reference_images ?? []).find((item) => item.path === sentPath);
      return {
        id: sentPath,
        license: reference?.license ?? '',
        author: reference?.author ?? '',
        source_url: reference?.commons_url ?? '',
      };
    });
    pilots.add(image.species);
    images.push({
      id: image.file.replaceAll('/', '__').replace(/\.png$/, ''),
      species_id: image.species,
      kind: image.kind,
      feature,
      file: image.file,
      sha256: image.sha256,
      label: 'ilustracja',
      provider: image.tool ?? 'nieznane',
      model: image.model ?? 'nieznany',
      model_version: null,
      style_id: null,
      prompt,
      negative_prompt: null,
      params_json: JSON.stringify({
        width: image.width ?? null,
        height: image.height ?? null,
        bytes: image.bytes ?? null,
        iteration_count: image.iteration_count ?? null,
        timezone: image.timezone ?? null,
        tool: image.tool ?? null,
        photos_sent_to_generator: image.photos_sent_to_generator ?? [],
      }),
      base_photo_ids: sent.length > 0 ? JSON.stringify(sent) : null,
      base_photo_licenses: bases.length > 0 ? JSON.stringify(bases) : null,
      created_at: image.date ?? '',
      review_status: reviewStatus,
      reviewer: image.reviewed_by ?? null,
      reviewed_at: null,
      review_notes: clean(
        image.file,
        'review_notes',
        [image.notes, image.review_pass].filter(Boolean).join('\n'),
      ),
      provenance_signals: null,
      file_present: present ? 1 : 0,
      excluded_from_training: 1,
    });
  }

  return {
    species: speciesRows,
    texts,
    features,
    facets: input.facets.map((facet) => ({
      facet: facet.facet,
      enabled: facet.enabled ? 1 : 0,
    })),
    locales: input.locales.map((locale) => ({
      locale: locale.locale,
      enabled: locale.enabled ? 1 : 0,
    })),
    classLinks,
    pairs,
    pairTexts,
    uncovered,
    images,
    pilots: [...pilots].sort().map((speciesId) => ({ species_id: speciesId })),
    fts,
    redactions,
    statusReview,
    excludedPairs: input.lookalikes.pary_usuwane_wzgledem_starego_recognition_math,
    pairReviewStatus,
  };
}

function donorOnlyDraft(donor: DonorCard, inModel: boolean, origin: string): Draft {
  return {
    id: donor.id,
    latin: donor.nameLatin,
    polish: donor.namePl,
    genus: genusOf(donor.nameLatin),
    edibility: donor.status,
    disputed: false,
    inModel,
    hymenophore: donor.hymenophore,
    months: donor.months,
    family: donor.family,
    highStakes: donor.status === 'POISONOUS' || donor.status === 'DEADLY_POISONOUS',
    origin,
    nicknames: donor.commonNicknames,
    donor,
    sourceFlag: '',
    forcedMissing: donor.incompleteCard ? ['donor_incomplete'] : [],
  };
}

function uniqueText(parts: string[]): string {
  return [...new Set(parts.map((part) => part.trim()).filter((part) => part.length > 0))].join(' ');
}

function morphologyFields(
  draft: Draft,
  clean: (id: string, field: string, text: string | null | undefined) => string,
  missing: Set<string>,
): Record<'cap' | 'hymenophore' | 'stem' | 'flesh' | 'habitat' | 'taste', string> {
  const donor = draft.donor;
  const read = (
    field: 'cap' | 'hymenophore' | 'stem' | 'flesh' | 'habitat' | 'taste',
    raw: string | undefined,
  ) => {
    const text = donor ? clean(draft.id, field, raw) : '';
    if (!text) missing.add(field);
    return text;
  };
  return {
    cap: read('cap', donor?.capDescription),
    hymenophore: read('hymenophore', donor?.hymenophoreDescription),
    stem: read('stem', donor?.stemDescription),
    flesh: read('flesh', donor?.fleshDescription),
    habitat: read('habitat', donor?.habitat),
    taste: read('taste', donor?.tasteAndSmell),
  };
}

function traitsFromDonor(donor: DonorCard | null, otherId: string): string {
  const risk = donor?.confusionRisks.find(
    (item) => item.confusedWithId === otherId || item.confusedWithId === `poza:${otherId}`,
  );
  return risk ? risk.keyDifferences.join('\n') : '';
}

function pushFeatures(
  features: Record<string, SqlValue>[],
  draft: Draft,
  facts: { hymenophore: string | null; substrate: string[] } | undefined,
): void {
  const values = new Map<string, Set<string>>();
  const add = (facet: string, value: string | null | undefined) => {
    if (!value) return;
    const bucket = values.get(facet) ?? new Set<string>();
    bucket.add(value);
    values.set(facet, bucket);
  };
  if (draft.edibility) add('edibility', draft.edibility);
  add('hymenophore', draft.hymenophore ? HYMENOPHORE_TOKEN[draft.hymenophore] : facts?.hymenophore);
  for (const month of draft.months) add('season', String(month));
  for (const substrate of facts?.substrate ?? []) add('habitat', substrate);
  add('genus', draft.genus);
  for (const [facet, bucket] of values) {
    for (const value of bucket) {
      features.push({ species_id: draft.id, facet, value });
    }
  }
}

function addListedPairs(
  pairs: Record<string, SqlValue>[],
  seenDirected: Set<string>,
  drafts: Map<string, Draft>,
  listed: { classes: [string, string]; group: string }[],
  reviewStatus: 'proposed' | 'approved',
): void {
  for (const pair of listed) {
    const [left, right] = pair.classes;
    if (!drafts.has(left) || !drafts.has(right)) {
      throw new Error(`Para ${left} / ${right} wskazuje nieznaną kartę`);
    }
    if (seenDirected.has(`${left}__${right}`) || seenDirected.has(`${right}__${left}`)) continue;
    const id = `${pair.group}__${left}__${right}`;
    seenDirected.add(`${left}__${right}`);
    pairs.push({
      id,
      species_id: left,
      lookalike_species_id: right,
      fatal: 0,
      review_status: reviewStatus,
      pair_group: pair.group,
      sort_index: 0,
    });
  }
}
