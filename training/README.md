# Training an on-device mushroom model

This directory is not part of the Expo bundle. It downloads openly licensed photos, trains a small MobileNetV3-Small classifier, measures it, and can export TFLite. The app does not currently contain `assets/models/mushrooms_model.tflite`. Until `export_tflite.py` installs a model that passes the ship gates, the scanner stays on “recognition unavailable”.

No weights were trained for release in the change that updated this pipeline. Do not treat a smoke-test checkpoint as a foraging model.

## License rules

Photos are fetched from the GBIF occurrence API (`training/fetch_gbif.py`). A photo is kept only when **its own media license** normalizes to CC0 or CC-BY (any version). The occurrence-level license is not allowed to override the photo.

Rejected on purpose:

- CC-BY-NC, CC-BY-SA, CC-BY-ND, and the NC/SA/ND combinations (this includes most iNaturalist research-grade photos, which are CC-BY-NC, and DF20 / FungiTastic)
- “all rights reserved”, free-text copyright lines, and missing media licenses
- anything that is not an explicit Creative Commons CC0 or CC-BY URL

Every accepted photo is written to `training/data/attributions.jsonl` with the creator, the license URL, the normalized license id, the image URL, and a source page (the publisher URL or the GBIF occurrence). That file is gitignored because the fetch produces it. `export_tflite.py` copies a slim attribution file next to the model (`training/artifacts/attributions.jsonl`, and `assets/models/attributions.jsonl` when a model is installed). See `training/ATTRIBUTION.md`.

## Full run on a CPU machine

TensorFlow’s pip wheel is the CPU build unless you install a CUDA extra yourself. The commands below are the full fetch and train. They download up to about 500 photos per known species and up to 2500 photos for each of `unknown_mushroom` and `not_a_mushroom`, then fine-tune MobileNetV3-Small. That is a long CPU job. This repository does not run it in CI.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r training/requirements.txt

python training/run_pipeline.py fetch
python training/run_pipeline.py prepare
python training/run_pipeline.py train
python training/run_pipeline.py evaluate
python training/run_pipeline.py export
```

`train` fine-tunes MobileNetV3-Small: a frozen head (default 8 epochs), then the last 20 layers (default 20 epochs). Outputs land in `training/artifacts/` (`model.keras`, `metrics.json`, `mushrooms_model.tflite`, `attributions.jsonl`). The Expo app is unchanged until the install command below.

Install into the app only after reading `metrics.json` and only if `shippable` is true:

```bash
python training/run_pipeline.py export -- --install-into-app
```

That copies the TFLite file and the attribution file, writes the calibrated thresholds into `assets/models/labels.json`, and points `src/services/modelPackage.ts` at the asset. A development build is required after that (`react-native-fast-tflite` and `react-native-nitro-modules` are native). Expo Go cannot load the interpreter. Until this step succeeds, `PACKAGED_MODEL_MODULE` stays `null`.

Useful limits while checking the wiring, without a full download:

```bash
python training/fetch_gbif.py --dry-run --only boletus_edulis --max-per-class 2 --max-pages 1
python training/run_pipeline.py train -- --epochs-frozen 1 --epochs-finetune 0 --batch-size 8
```

## Resuming a fetch

`fetch_gbif.py` writes each photo to a temporary file and renames it into place, but only after a full in-memory Pillow decode (`Image.open` on the bytes, then `load()`). `PIL.ImageFile.LOAD_TRUNCATED_IMAGES` is forced off. A body larger than 16 MB, or one that is not an image, is skipped and is not written and not added to `checkpoints/verified.jsonl`. A truncated body is retried once. Timeouts, HTTP 403 and 404, certificate errors, and any other failure that is not retried are also not written. `accepted` in `fetch_report.json` is the number of files actually written and verified. For each class, and for each toxic probe, that number is the number of rows in `attributions.jsonl`. `selected` is the candidates that were tried, and `failed` counts those tries by reason (`timeout`, `http_403`, `too_large`, `undecodable`, and the other buckets). Those three add up: `selected` = `accepted` + the `failed` counts.

The GBIF query walks regional countries, then the global fill, still at most 2 photos per occurrence and still bounded by `--max-pages`. The first batch is twice the download cap. A failed candidate is replaced by the next photo in that same order until the cap is full. Further pages are fetched only when that margin has been used up, on the main thread between download windows, so 1 worker and 16 workers keep the same files. A top-up that still has photos on the page already fetched reuses that page and does not request it again. Every run walks the pool from the first candidate. A file already listed in `verified.jsonl` with the same size and mtime, and any other file that still decodes, counts as accepted and is not downloaded again. A candidate that failed in that prefix is tried again. When the query really ends below the cap — GBIF has no further record, or `--max-pages` was reached — the report sets `shortfall`, `pool_exhausted` on that taxon, and `exhausted_reason` (`end_of_records` or `max_pages`). `gbif_licensed_count` is then the entire licensed pool. It is omitted while unused margin or further pages remain. A class row reports `any_taxon_pool_exhausted` when any of its taxa ended that way. The ship gate uses the 5-photo floor only when `exhausted_reason` is `end_of_records`, that entire count equals the audited count, and `accepted` equals the same count. `--max-pages` does not open the 5-photo floor.

A later run with the same network rewrites the same `fetch_report.json`. A photo that drops out of the selection is moved to `training/data/not_selected/<class>/`, so `images/<class>/` matches the attribution rows for that class. That move runs only for a directory whose every class and probe was fetched in this run. Toxic probes and the `unknown_mushroom` class share `images/unknown_mushroom/`; `--only toxic_probes` does not move those files. `--dry-run` prints the plan and does not download, move, or write. Before downloading a candidate, the script looks in `not_selected/<class>/` for the same filename. The parked bytes go through the same size limit and full Pillow `Image.open().load()` as a new download, with `LOAD_TRUNCATED_IMAGES` left false, and only then is the file moved back and remembered. A file that fails those checks is moved to quarantine and is not accepted. Quarantine is not a source. A file that fails a full decode is moved to `training/data/quarantine/<class>/` and downloaded again. `--no-resume` downloads again anyway. `--download-workers` (default 16) downloads one class or one toxic-probe taxon at a time. At most 4 transfers run against the same image host. `attributions.jsonl` and `fetch_report.json` stay in pool order. Progress is those two files. The script does not write per-class files under `checkpoints/` (nothing read them). The candidate-pool cache version is 3: the key does not include the download cap, and the file stores the rows fetched so far plus a cursor. The filename is the full class or probe identity, the version, and the key. Version 1 stopped at the cap. Version 2 stored an unbounded pool. Fetching that class or probe deletes older files for that exact identity. A class whose name is only a prefix of another class does not delete the longer name's cache.

```bash
python training/fetch_gbif.py --verify-existing
```

That scan does not use the network. It full-decodes every file under `training/data/images` in a spawn process pool, one process per CPU, quarantines the broken ones, rewrites `verified.jsonl`, drops matching rows from `attributions.jsonl` without reordering the rest, and prints ok / quarantined counts per class plus how many attribution rows were dropped. If the process pool cannot start (`PermissionError`, `OSError`, `NotImplementedError`) or a worker dies (`BrokenProcessPool`), the scan prints a warning and uses a thread pool instead.

Transient transfer errors are retried three times: DNS failure, timeout, connection reset, HTTP 5xx, and SSL handshake or a broken connection (EOF, wrong version). Each wait is the backoff plus a short random offset, so the 16 workers do not wake together. HTTP 429 waits for `Retry-After` (capped at 120 seconds) plus that same offset, or uses the jittered backoff when the header is missing. HTTP 403 and 404 are not retried. Certificate errors (`SSLCertVerificationError`, `CERTIFICATE_VERIFY_FAILED`, `certificate verify failed`) are not retried. The per-URL `skip` line is printed once, after the retries are exhausted.

GBIF occurrence search and species match stay one request at a time, with at least 0.2 seconds between calls. After every class and every toxic-probe taxon the script rewrites `training/data/attributions.jsonl` and `training/data/fetch_report.json`. Candidate pools are cached in `training/data/gbif_cache/`. The cache key is the class or probe, the fetch arguments other than the download cap, a pool-format version, and a hash of `licenses.py` and `sampling.py`, so a change to either file misses the old files. The cap stays out of the key so a later run with a different cap continues from the same cursor. Version 3 stores the rows fetched so far and that cursor, including a GBIF page that was only partly consumed. A version 1 or version 2 file misses the key. The next fetch of that class or probe deletes older files whose name is that exact identity and a version, not files for a longer name that starts the same way. Loading a cache still runs every row through `normalize_cc_license` and drops a licence that is no longer CC0 or CC-BY. Delete `training/data/gbif_cache/` when you want every class queried again without waiting for the next fetch: a hand-edited cache, a corrupt file, a fresh page of occurrences, or the old version 1 and version 2 files. A code change to the licence filter or the sampling rules does not need that delete.

Unit tests that do not need TensorFlow:

```bash
python -m unittest discover -s training/tests -v
```

## Geography and volume

Poland, Germany, Czechia, Slovakia, Austria, Hungary, Lithuania, Latvia, and Estonia are collected first (`training/manifest.py`). The same license filter then fills from the rest of the world until the class cap. A class that already has more than 40 regional photos still receives global photos until the cap. The old behaviour stopped the global pass at that regional minimum.

Defaults:

- known species: 500 photos (`--max-per-class` overrides this, including for the aggregate classes)
- `unknown_mushroom` and `not_a_mushroom`: `class_cap` 2500 in `labels.json`, spread across every listed taxon (`per_taxon_cap` 80, reduced so the cap is shared). Poisonous held-out taxa inside `unknown_mushroom` are requested first, up to 80 photos each, before the rest of the cap is shared. 80 is fetch headroom so near-duplicate removal can still leave 50. It is not the ship floor.
- toxic probes: a separate test-only budget, 80 photos per taxon, not taken out of the 2500. See the probe list below.
- at most 2 photos from one GBIF observation

`Cortinarius orellanus`, `Cortinarius rubellus`, and `Amanita virosa` are thin in CC0/CC-BY. The fetch writes `training/data/fetch_report.json` with their counts and does not invent photos. The ship gate still requires 40 training images for a species, so a short class cannot ship.

## Preprocessing

The phone and the trainer share the second resize and the rounding rule:

1. EXIF orientation is applied by the platform image decoder. Pillow uses `ImageOps.exif_transpose` in prepare. On the phone, `readPhotoAsPngBytes` calls `expo-image-manipulator` with a width of 448 and no extra rotation. The camera uses `skipProcessing`, so the JPEG may still carry an orientation tag. ImageManipulator loads through UIImage / BitmapFactory on device, and through HTMLImageElement's default `image-orientation: from-image` on web. Those decoders bake the tag into upright pixels. The app does not rotate a second time.
2. A photo whose width is above 448 is reduced before the 224 model input. The target is the width, keeping aspect ratio. It is not a longest-side cap. The phone does that native resize in steps of at most 2× (halve the width while the next half is still at least 448, then finish at 448) so a 12–50 megapixel JPEG is not pushed through base64 into JavaScript and is not scaled by more than 2× in one Android bitmap step. Training's cached PNG uses an antialiased box filter to a 448 square and then to 224, and only when the model size is 224 and both sides start at or above 448. The native scaler and the box filter are not the same algorithm, so the first step is not bit-identical. A photo that is already 448px on both sides shares the second step with the phone.
3. The 224 box filter rounds each channel with half toward +infinity (`Math.round` in `imagePreprocess.ts`, `floor(x + 0.5)` in `training/preprocess.py`). `numpy.rint` is not used: it rounds half to even, and on a 448-to-224 area resize that disagrees on about 18,649 of 150,528 values. The fixture `training/fixtures/round_half_up_2x2_to_1.json` is a 2×2 image of 10 and 11, which averages to 10.5 and must become 11.
4. Smaller images keep the bilinear half-pixel resize, then the same uint8 half-up rounding before normalization.
5. Normalization is `(pixel / 127.5) - 1`.

Training reads the cached PNG. It does not decode the original JPEG with `tf.io.decode_image`, which ignores EXIF. Corrupt files are skipped.

The sample list is shuffled in full before `from_tensor_slices`. After `dataset.cache()` the trainer shuffles the whole cached set again each epoch (`shuffle(N, reshuffle_each_iteration=True)`). Augmentation, after that shuffle, is a horizontal flip, a random scale from 1.0 to 1.25 using either an area kernel or a bilinear kernel, a crop back to 224, a rotation of about ±15 degrees, brightness, and contrast. Class weights are inverse frequency with mean 1, then capped at 10.

## Split

`training/split.py` keeps one field outing in one split. When the photo has a recorder, a finite latitude and longitude, and a date, the group is `recordedBy` (case-folded) plus a 0.01-degree grid (about 1.1 km north–south) plus the calendar day, and the taxon name so two species from the same person on the same day stay separate. Otherwise the group is the GBIF occurrence. The same file also reports a second grouping, recorder plus the 0.01-degree grid with the day left out, so a person who returns to the same square on another day is visible. That second grouping is not the split key. `prepare_data.py` writes both counts to `training/data/split_groups.json`.

## Backbone

`keras.applications.MobileNetV3Small(weights="imagenet", include_preprocessing=False)`.

What the sources say about those weights, checked against Keras 3.15.1 / TensorFlow 2.21.0:

- The installed loader is `keras/src/applications/mobilenet_v3.py`. With `include_top=False` and `alpha=1.0` it downloads `weights_mobilenet_v3_small_224_1.0_float_no_top_v2.h5` from `https://storage.googleapis.com/tensorflow/keras-applications/mobilenet_v3/`. That file is what `weights="imagenet"` means in this trainer. The loader does not attach a separate license file to the `.h5`.
- The Keras 3.15.1 repository license is the Apache License, Version 2.0: https://github.com/keras-team/keras/blob/v3.15.1/LICENSE . The installed `mobilenet_v3.py` does not repeat that header.
- Kaggle's model `google/mobilenet-v3` (https://www.kaggle.com/models/google/mobilenet-v3 , API `licenseName` on each instance, including `small-100-224-feature-vector`) says **Apache 2.0**. Its model card says the TF Hub checkpoint was trained on the ILSVRC-2012-CLS dataset. That card describes the TensorFlow Hub / TF-Slim checkpoints, not the Keras Applications `.h5` this trainer downloads.
- ImageNet's terms of access at https://www.image-net.org/download.php say the Researcher shall use the Database only for non-commercial research and educational purposes. Those terms are about the ImageNet photographs. This pipeline does not download or redistribute those photographs.

This section records those sources. It does not decide whether commercial use of the pretrained weights is allowed. Mushroom training photos stay CC0 or CC-BY only. `assets/models/labels.json` points `pretrained_weights_license` at this section instead of storing a one-line license name. TensorFlow is pinned in `training/requirements.txt`.

The network reads floats already scaled with `(pixel / 127.5) - 1` and emits **logits**, not softmax.

## Class list

39 outputs (37 species classes, then `unknown_mushroom`, then `not_a_mushroom`). The contract is `assets/models/labels.json` (indexes are the logit order). Edibility is absent from that file. A scan is not allowed to print a verdict.

`unknown_mushroom` is the class immediately before `not_a_mushroom`. It means “this is a fungus, and it is not one of the species this model knows.” It is trained on CC0/CC-BY photos of other fungi that occur in Poland and nearby countries and that are **not** in the known species list (amanitas, boletes, russulas, milk-caps, brackets, and similar names in `labels.json`). Each taxon is capped. A fixed list of those taxa is `held_out_taxon` and is placed only in the test split.

Every species class has `safety_tag` `toxic`, `edible`, or `other`. That tag matches the atlas card when the species has one: `EDIBLE` is `edible`, `INEDIBLE` is `other`, and `POISONOUS` or `DEADLY_POISONOUS` is `toxic`. Every aggregate taxon has `toxic` true or false. Those flags are evaluation labels. The app must not show them as an edibility verdict. Poisonous taxa inside the training unknown class (for example `Amanita regalis`, `Amanita gemmata`, `Scleroderma citrinum`) and poisonous held-out taxa (for example `Amanita verna`, `Amanita porphyria`, `Inosperma erubescens`, `Inocybe geophylla`, `Entoloma sinuatum`, `Clitocybe rivulosa`, `Gyromitra gigas`, `Agaricus moelleri`) are tagged so a test photo of any of them counts when `decide()` would show a confident edible species.

`Neoboletus luridiformis` (GBIF key 8208185) is a thin name on its own: about 28 usable photos. GBIF keeps most records on the separate accepted species `Neoboletus erythropus` (usage key 9723190). Both names are one edible class, `neoboletus_luridiformis`, and neither stays on the unknown list. Holding one out while training on the other would score a fungus the model had already seen. The class is edible in the atlas only as an unfinished card: literature says cook it, and the card does not authorize eating.

GBIF name matching is strict. `matchType` must be `EXACT` and the rank must be species, subspecies, variety, or form. A `HIGHERRANK` hit (a genus, a class, or the kingdom) stops the fetch with `SystemExit` before any download. That is why the bare strings `Helvella crispa` and `Boletus badius` are not in the manifest: GBIF maps them to a higher rank. The held-out name is `Helvella crispa (Scop.) Fr.`. `Imleria badia` keeps the synonym `Xerocomus badius`, which shares one accepted key. Collisions are checked on that accepted key. The same key may repeat only as synonyms of one class.

When the top class is `unknown_mushroom` and the energy gate accepts the photo, the app shows:

> To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.

It also says the mushroom may be deadly poisonous, and it shows the existing line that the mushroom should be checked by a mycologist or a Sanepid inspector. It does not show a species, a confidence, or an edibility verdict. The same three lines are on the journal entry. `not_a_mushroom` stays last.

### Toxic probes

These taxa are fetched only into the test split, labeled `unknown_mushroom`. They are not their own class. The fetch asks for 80 CC0/CC-BY photos each (70–80 is the headroom band) so near-duplicate removal can still leave a full floor. `Galerina sulcipes` and `Galerina sulciceps` are not probes: GBIF had 0 and 39 still images, and those names are not a substitute for the amatoxin look-alikes below.

The flat 50-per-taxon probe floor is gone. The ship gate uses visual-group totals, plus 50 for every poisonous held-out taxon that is not a valid rare-taxon exception:

| Group | Minimum images | Taxa |
| --- | ---: | --- |
| Lepiota look-alikes | 150 | `Lepiota brunneoincarnata`, `Lepiota subincarnata`, `Lepiota cristata`, `Lepiota castanea` |
| Conocybe / Pholiotina | 100 | `Conocybe filaris`, `Conocybe rugosa` |
| Omphalotus | 50 | `Omphalotus olearius` |
| Inocybe muscarine | 80 | `Inosperma erubescens`, `Inocybe geophylla` (about 60 licensed photos) |
| Every other poisonous held-out taxon | 50 each | `Chlorophyllum molybdites`, `Tricholoma pardinum`, `Rubroboletus satanas`, plus the other poisonous names held out inside `unknown_mushroom` |

`Lepiota cristata` has no amatoxins, so the Lepiota group is named look-alikes. The minimum stays 150. The Inocybe minimum is 80: geophylla plus a 5-photo exception (about 65) does not clear it, and geophylla plus the 44 erubescens photos does.

The poisonous held-out total stays at least 300 (rule of three) and the confident-edible count on that set stays 0. Each poisonous taxon also records a Wilson upper bound and a seeded binomial-bootstrap upper bound on its confident-edible rate. A zero count makes the bootstrap upper bound collapse to 0; the Wilson bound is the one to read. Neither bound replaces the hard 0.

`rare_taxon_exceptions` is a closed list of two names: `Lepiota brunneoincarnata` and `Inosperma erubescens`. An extra name fails validation. Every exception must name the visual group that contains it, and that group's taxon list is pinned: moving a taxon to another group, or clearing `deadly` on a poisonous held-out taxon that must stay deadly, fails validation. The 5-photo floor applies only when all of these hold: `exhausted_reason` is `end_of_records` (the query ended because GBIF had no further record; `--max-pages` does not qualify), `gbif_licensed_count` is that entire licensed pool and equals the audited count, and `accepted` equals that same count. Every licensed photo was downloaded and verified. A failed download leaves `accepted` short of `gbif_licensed_count`, the exception does not apply, and the 50-photo floor stays. The count is under 50 and `accepted` is below the cap. The exception still needs 0 confident-edible outcomes, and its group must meet the group minimum. An exception does not lower the 300-image total. `Conocybe filaris` is not on the list. Its licensed count is 78, above 50, so the 50-photo floor stands and a closed-list entry would be dead. An exception needs a new GBIF licensed count when GBIF gains photos. A count recorded on 2026-10-08 does not stay valid after that.

Counts below were measured on 2026-10-08. StillImage is before the license filter. Licensed counts use CC0/CC-BY and at most 2 photos per GBIF occurrence. After-dedup is a perceptual-hash pass on the photos actually downloaded, capped at 80 when the licensed set was larger.

| Taxon | GBIF key | StillImage | Licensed (cap 2) | After dedup | Floor |
| --- | ---: | ---: | ---: | ---: | --- |
| Lepiota brunneoincarnata | 2535390 | 188 | 16 (whole set) | 15 | exception; group must still reach 150 |
| Lepiota subincarnata | 2535445 | 596 | 80 (whole set) | 77 | group member, at least 50 |
| Lepiota cristata | 2535471 | 4232 | 80 of a larger set | 80 | group member, at least 50 |
| Lepiota castanea | 2535310 | 768 | 80 of a larger set | 80 | group member, at least 50 |
| Omphalotus olearius | 2538088 | 1563 | 80 of a larger set | 79 | group of 50 |
| Conocybe filaris | 2529789 | 153 | 78 (whole set) | 33 was a cross-taxon hash bucket, not a licensed shortage | 50. Not an exception: 78 is above 50 |
| Conocybe rugosa | 2529907 | 575 | 80 of a larger set (at least 186 licensed) | 80 | group member, at least 50 |
| Chlorophyllum molybdites | 5243168 | 17255 | 80 of a larger set | 77 | 50, not in a named group |
| Tricholoma pardinum | 7242174 | — | about 137 estimated usable (2026-10-08 candidate scan, not a deduped download) | — | 50, not in a named group |
| Rubroboletus satanas | 7722553 | — | about 221 estimated usable (same scan). Strictly protected. Test only, not a class | — | 50, not in a named group |

`Inosperma erubescens` (accepted name of `Inocybe erubescens`, key 10776858) is not a probe. It is a poisonous held-out taxon inside `unknown_mushroom`. The whole licensed set is 44 photos, all kept after dedup. It shares the Inocybe muscarine group with `Inocybe geophylla`. The 5-photo floor applies only when `accepted` and `gbif_licensed_count` are both 44 and that count still matches the audit.

Near-duplicate removal compares difference hashes (dHash, 8×9) and perceptual hashes (pHash, 8×8 DCT) inside one species class, and inside one taxon for `unknown_mushroom`. A photo is dropped when either Hamming distance is 2 or less. Records with neither hash are kept after the sha256 check. `prepare_data` writes `dropped_per_class` and `hash: dhash_or_phash_threshold_2` on the dedup report. The earlier filaris drop (78 licensed, 33 left) compared hashes across every unknown taxon. That is not evidence the licensed pool is under 50.

On that same day the Lepiota group total from the table is 15+77+80+80 = 252, and the Conocybe group is 33+80 = 113. Both clear their minimums on this sample. One occurrence page took about 0.5–2.7 seconds, and the image downloads for these ten names finished in a few minutes on this machine. The crawl is part of `python training/run_pipeline.py fetch` and is not a full download in CI.

`Cortinarius orellanus`, `Cortinarius rubellus`, `Galerina marginata`, and `Tricholoma equestre` are already model classes. Fetching them again as `unknown_mushroom` would give one fungus two labels, so they are not probes. Yellow knight left the probe list when it became a class. `Tricholoma pardinum` and `Rubroboletus satanas` replace it. Satan’s bolete stays a probe: it is strictly protected, and it is not a model class. Their own test photos of the poisonous classes are poisonous (`safety_tag` `toxic`) and count in `confident_toxic_as_edible`. The Lepiota look-alike group and the Conocybe / Pholiotina group set `strict_top1_edible`. An edible top-1 that is not low-confidence fails the ship even if a dangerous genus appears lower in the list. The same counter includes deadly held-out taxa (for example `Amanita verna`) and test photos of deadly classes, including yellow knight.

`Agaricus xanthodermus` moved from the unknown test set onto its own class. `Agaricus moelleri` (key 5243496, about 268 estimated usable photos) is the held-out replacement. Hard negatives added to unknown training, because the 2026-10-08 scan found hundreds of usable CC0/CC-BY photos: `Hypholoma capnoides`, `Pholiota squarrosa`, `Amanita regalis`, and `Amanita gemmata`. The two Amanitas are tagged toxic. Capnoides and squarrosa are not.

Atlas species already in the app, kept so a future model lines up with the cards:

`Boletus edulis`, `Amanita phalloides`, `Macrolepiota procera`, `Cantharellus cibarius`, `Imleria badia`, `Suillus luteus`, `Leccinum scabrum`, `Tylopilus felleus`, `Amanita muscaria`, `Lactarius deliciosus`, `Gyromitra esculenta`, `Paxillus involutus`, `Russula virescens`, `Agaricus campestris`, `Chlorophyllum rhacodes`, `Hygrophoropsis aurantiaca`, `Lactarius torminosus`, `Morchella esculenta`.

Deadly or seriously poisonous Polish species that were not all in the atlas:

- `Amanita virosa` — destroying angel
- `Amanita pantherina` — panther cap
- `Cortinarius orellanus` and `Cortinarius rubellus` (the latter also fetched under `Cortinarius speciosissimus` and `Cortinarius orellanoides`) — orellanine webcaps
- `Galerina marginata` (also `Galerina autumnalis`) — funeral bell

Look-alikes added so those deadly species have somewhere else to go:

- `Kuehneromyces mutabilis` and `Armillaria mellea` — the wood-growing mushrooms people confuse with `Galerina marginata`. The honey-fungus class is the group opieńki: `Armillaria mellea`, `A. ostoyae`, and `A. gallica`.
- `Amanita rubescens` — the blushing Amanita confused with `A. pantherina`
- `Amanita citrina` — the citron Amanita confused with pale `A. phalloides`

First-batch classes added before the first full training (2026-10-08). Estimated usable photos are from that day’s candidate scan: CC0/CC-BY, at most 2 photos per occurrence. They are not a deduped download. A species class still shares one cap of 500, including every GBIF name on a group class. Thin means the estimate is under that cap. The ship floor of 40 training images after dedup is unchanged. `Tricholoma equestre` is the thin new class.

| Class | Polish name in the app | safety_tag | Estimated usable photos |
| --- | --- | --- | ---: |
| `hypholoma_fasciculare` | Maślanka wiązkowa | toxic | 8723, capped at 500 |
| `tricholoma_equestre` | Gąska zielonka | toxic | about 430, thin |
| `agaricus_xanthodermus` | Pieczarka żółtawa | toxic | 1292, capped at 500 |
| `neoboletus_luridiformis` | Borowik ceglastopory | edible | 28 + 1073 = about 1101, capped at 500 |
| `xerocomellus_chrysenteron` | Podgrzybek złotawy | edible | 1415, capped at 500 |
| `leccinum_aurantiacum` | Koźlarze czerwone | edible | 699 + 1210 = about 1909, capped at 500 |
| `xerocomus_subtomentosus` | Podgrzybek zamszowy | edible | 985, capped at 500 |
| `suillus_grevillei` | Maślak żółty | edible | 2701, capped at 500 |
| `suillus_bovinus` | Maślak sitarz | edible | 1476, capped at 500 |
| `suillus_variegatus` | Maślak pstry | edible | 1116, capped at 500 |
| `lactarius_deliciosus` | Rydze | edible | adds `Lactarius deterrimus`, about 1498, on top of the existing rydz name; cap 500 |
| `armillaria_mellea` | Opieńki | edible | adds `A. ostoyae` about 419 and `A. gallica` about 575; cap 500. Wide `A. mellea` includes non-European look-alikes under the same name |
| `boletus_edulis` | Prawdziwki | edible | adds `B. reticulatus` about 1016 and `B. pinophilus` about 396; cap 500 |
| `suillus_luteus` | Maślak zwyczajny i ziarnisty | edible | adds `S. granulatus` about 1752; cap 500. Some world photos under that name are a North American group |

The earlier species classes were not re-counted in that scan. Their fetch cap stays 500. New edible cards have no photo and are marked incomplete, so the atlas does not lead with a green edible badge. Yellow knight is `POISONOUS` in the app: it is still on the Polish legal sale list (Dz.U. 2026 poz. 258) and the card says so, together with the rhabdomyolysis reports. Morels stay one class. The species card and a scan that names `morchella_esculenta` state the 2014 partial protection in Polish and in English (permit, except gardens, horticultural plantings, forest nurseries, and green areas; Dz.U. 2014 poz. 1408).

`not_a_mushroom` is a real training class, not a softmax leftover. Its GBIF names are animals, plants, and other non-fungi, with a per-taxon cap and a held-out taxon list so the test is not only the taxa the model trained on.

## Out-of-distribution gate

The energy score is `E(x) = -T * logsumexp(logits / T)` (Liu et al., NeurIPS 2020). In-distribution scores are lower.

The threshold is the lowest validation energy that keeps at least 97% of in-distribution validation images (everything except `not_a_mushroom`, including `unknown_mushroom`). That is an order statistic (`ID_KEEP_FIT`). `numpy.quantile` is not used: its linear interpolation can sit between samples so fewer than the requested share of a short validation split fall at or below it. The ship gate is still 95% on the test split. The extra two points are headroom so a 95% fit does not fail that gate on split noise. The 95% floor was not lowered.

`id_keep_rate_val` records that calibration. The ship gate reads `id_keep_rate_test`: the same threshold on the held-out test split. A photo is rejected, and no species is shown, when the background class wins, when energy is above the threshold, or when the top softmax is below 0.40. A confident `unknown_mushroom` (top class, softmax at least 0.40, energy inside the threshold) is also not a species result. If any logit is NaN or infinite, the result is `unavailable` / `output_mismatch`.

Low confidence (top softmax under 0.70 or top-1/top-2 margin under 0.15) still shows the top three species, with a Sanepid / expert warning. `not_a_mushroom` and `unknown_mushroom` are omitted from that list. The same warning is mandatory when a displayed candidate is Amanita, Cortinarius, Galerina, or Gyromitra and that candidate is rank 1, or its probability is at least 0.10. A smaller 2nd or 3rd place in one of those genera does not raise the banner and does not clear a confident edible top class. Deadly probes are also scored without that banner: an edible top-1 that is not low-confidence is a ship failure even when a dangerous genus sits lower in the list.

## Ship gates

`training/ship_gates.py` refuses `--install-into-app` unless every line below is true. None of the previous numeric floors were lowered.

| Gate | What it measures | Floor |
| --- | --- | --- |
| Macro top-1 | Mean top-1 of the **known species** on the test split. `unknown_mushroom` and `not_a_mushroom` are not in the mean. | ≥ 0.80 |
| Macro top-3 | Same, top-3. | ≥ 0.90 |
| High-stakes top-1 | Death cap, destroying angel, panther cap, fly agaric, false morel, both orellanine webcaps, funeral bell, brown roll-rim, yellow knight (rhabdomyolysis). | ≥ 0.85 on ≥ 8 test images |
| Species volume | Training images after dedup, each known species. | ≥ 40 |
| Aggregate volume | Training images for `not_a_mushroom` and for `unknown_mushroom`. | ≥ 100 |
| Pair confusion | A high-stakes photo whose argmax is an edible look-alike, for the listed pairs, both directions. | ≤ 0.05 |
| Confident toxic → edible | Every test photo tagged poisonous (known class, unknown-class taxon, or held-out probe) that `decide()` would show as a confident edible species. Edible means every class with `safety_tag` `edible`. Energy rejects, low confidence, and a dangerous-genus warning are not in this count. A dangerous genus warns only as rank 1 or at probability ≥ 0.10. | 0 |
| Deadly-probe strict top-1 | Lepiota look-alikes, Conocybe / Pholiotina, other strict groups, deadly held-out taxa such as `Amanita verna`, and photos of deadly classes. Top-1 is an edible species and the result is not low-confidence. A dangerous-genus banner does not clear this. | 0 |
| Open-set safe outcome | Held-out fungi (`held_out_taxon`, class `unknown_mushroom`, including probes) whose `decide()` status is rejected, or candidates with low confidence or a dangerous-genus warning. Wilson 95% interval. | rate ≥ 0.90 and lower bound ≥ 0.85 |
| Open-set confident edible | The same held-out photos that `decide()` would show as a confident edible. Wilson 95% interval. | rate ≤ 0.02 and upper bound ≤ 0.05 |
| Poisonous held-out sample | Poisonous held-out photos, including every toxic probe and every toxic held-out unknown taxon, even when the count is 0. Confident edible among them must be 0. Per-taxon Wilson and bootstrap upper bounds are reported. | ≥ 300 images. Visual groups: Lepiota look-alikes ≥ 150, Conocybe / Pholiotina ≥ 100, Omphalotus ≥ 50, Inocybe muscarine ≥ 80. Every other taxon ≥ 50 unless it is one of the two closed `rare_taxon_exceptions` and the fetch report shows the entire licensed GBIF pool: `exhausted_reason` is `end_of_records`, `gbif_licensed_count` under 50 and equal to the audited count, and `accepted` (verified files) equal to that same count and below the cap. `--max-pages` and a failed download keep the 50-photo floor. The group still meets its minimum. The exception then needs ≥ 5 images and 0 confident-edible outcomes. Re-audit the licensed count when GBIF gains photos. |
| Unknown-fungus recall | Diagnostic only. Top-1 equals `unknown_mushroom` on held-out fungi. The ship gate does not use 0.50. It does require enough photos to compute the diagnostic, and it records a per-taxon bootstrap lower bound (target 0.40, not a ship floor) plus a split of unknown genus versus unknown species of a known genus. | ≥ 200 images and ≥ 10 taxa with ≥ 10 each |
| Unknown-fungus steal | Known-species test photos that `decide()` rejects as `unknown_mushroom`. Energy rejects are not steals. | ≤ 0.10 |
| High-stakes steal | The same steal rate for each high-stakes class. | ≤ 0.10 on ≥ 30 images |
| In-distribution keep | Share of test images other than `not_a_mushroom` whose energy is ≤ the validation threshold. The threshold is fit at 97%. | ≥ 0.95 |
| Non-mushroom reject | Test `not_a_mushroom` photos rejected by energy or the background class. | ≥ 0.90 |
| Overconfident non-mushrooms | Test non-mushrooms with softmax > 0.5 that energy or the background class still rejects. | ≥ 30 images and ≥ 0.90 |
| Held-out non-mushroom taxa | `not_a_mushroom` taxa that never appear in train or val. | ≥ 20 images and reject ≥ 0.90 |
| Coverage | Every class in `labels.json` has a measured top-1/top-3 and support above 0 in train and in test. | required |
| TFLite agreement | Top-1 match between the interpreter and the float Keras model on **every** val and test photo. | ≥ 0.99 |
| TFLite high-risk agreement | The same match, only on high-risk class photos, again the full val+test count. | ≥ 0.99 |
| Attribution | `attributions.jsonl` beside the model has one complete row (creator, CC0 or CC-BY, image URL, source page) per train+val+test image. | complete |
| Hashes | sha256 of `model.keras`, `mushrooms_model.tflite`, and `fetch_report.json` match the files on disk. The fetch-report hash covers the file `attach_fetch_evidence` reads, and that step overwrites `accepted`, `gbif_licensed_count`, and `exhausted_reason` from the report. `accepted` in that file is verified files. `gbif_licensed_count` is the entire licensed pool, written only when the GBIF query ended below the cap, and the rare-taxon exception also requires `exhausted_reason` to be `end_of_records` and `accepted` to equal that count. Regenerating the report changes the hash even when every download succeeded, because the report stores `selected`, `failed`, `pool`, `shortfall`, `exhausted_reason`, and `any_taxon_pool_exhausted`. A metrics file that still has the previous hash fails this gate until export records the new file. The numeric floors are unchanged. | exact |

Export builds **fp16** weights with float32 input and output. `react-native-fast-tflite` runs XNNPACK, which executes that graph. A fully integer int8 graph is not the default: XNNPACK rejects MobileNetV3 ops from `TFLITE_BUILTINS_INT8` on device, while fp16 lands near 2 MB and keeps the float preprocess. `--quantization int8` is an experiment and is not what a ship build uses. There is no force flag.

## What is still missing before this is safe to ship

- A trained checkpoint and the measured metrics above.
- Enough CC-BY/CC0 photos of `Cortinarius orellanus`, `Amanita virosa`, and `Cortinarius rubellus`. Global fill is allowed, and it may still be short after dedup.
- The poisonous held-out sample above. The closed exceptions stay `Lepiota brunneoincarnata` (16 licensed) and `Inosperma erubescens` (44 licensed, Inocybe group), both checked 2026-10-08. `Conocybe filaris` (78 licensed) is not an exception and keeps the 50-photo floor. Re-audit an exception when GBIF gains photos; a 2026-10-08 count does not stay valid. A new short taxon is not an exception. The list does not grow.
- On-device measurement of accuracy, latency, and the reject rate on a phone. The exporter scores the interpreter on val/test photos on the training machine.
- `Armillaria mellea` is a species complex. Photos labeled that way on GBIF are often sensu lato.
- `Amanita verna` is not its own class. It is one of the held-out taxa inside `unknown_mushroom`.
