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

Unit tests that do not need TensorFlow:

```bash
python -m unittest discover -s training/tests -v
```

## Geography and volume

Poland, Germany, Czechia, Slovakia, Austria, Hungary, Lithuania, Latvia, and Estonia are collected first (`training/manifest.py`). The same license filter then fills from the rest of the world until the class cap. A class that already has more than 40 regional photos still receives global photos until the cap. The old behaviour stopped the global pass at that regional minimum.

Defaults:

- known species: 500 photos (`--max-per-class` overrides this, including for the aggregate classes)
- `unknown_mushroom` and `not_a_mushroom`: `class_cap` 2500 in `labels.json`, spread across every listed taxon (`per_taxon_cap` 80, reduced so the cap is shared). Poisonous held-out taxa inside `unknown_mushroom` are requested first, up to 50 photos each, before the rest of the cap is shared.
- toxic probes: a separate test-only budget, 50 photos per taxon, not taken out of the 2500. See the probe list below.
- at most 2 photos from one GBIF observation

`Cortinarius orellanus`, `Cortinarius rubellus`, and `Amanita virosa` are thin in CC0/CC-BY. The fetch writes `training/data/fetch_report.json` with their counts and does not invent photos. The ship gate still requires 40 training images for a species, so a short class cannot ship.

## Preprocessing

The phone and the trainer share the second resize and the rounding rule:

1. EXIF orientation is applied by the platform image decoder. Pillow uses `ImageOps.exif_transpose` in prepare. On the phone, `readPhotoAsPngBytes` calls `expo-image-manipulator` with a width of 448 and no extra rotation. The camera uses `skipProcessing`, so the JPEG may still carry an orientation tag. ImageManipulator loads through UIImage / BitmapFactory on device, and through HTMLImageElement's default `image-orientation: from-image` on web. Those decoders bake the tag into upright pixels. The app does not rotate a second time.
2. A photo whose both sides are at least 448 is reduced before the 224 model input. The phone's first step is that native resize to width 448, keeping aspect ratio, so a 12–50 megapixel JPEG is not pushed through base64 into JavaScript. Training's cached PNG uses an antialiased box filter to a 448 square and then to 224, and only when the model size is 224 and both sides start at or above 448. The native scaler and the box filter are not the same algorithm, so the first step is not bit-identical. A photo that is already 448px on both sides shares the second step with the phone.
3. The 224 box filter rounds each channel with half toward +infinity (`Math.round` in `imagePreprocess.ts`, `floor(x + 0.5)` in `training/preprocess.py`). `numpy.rint` is not used: it rounds half to even, and on a 448-to-224 area resize that disagrees on about 18,649 of 150,528 values. The fixture `training/fixtures/round_half_up_2x2_to_1.json` is a 2×2 image of 10 and 11, which averages to 10.5 and must become 11.
4. Smaller images keep the bilinear half-pixel resize.
5. Normalization is `(pixel / 127.5) - 1`.

Training reads the cached PNG. It does not decode the original JPEG with `tf.io.decode_image`, which ignores EXIF. Corrupt files are skipped.

The sample list is shuffled in full before `from_tensor_slices`. A windowed `dataset.shuffle(1000)` on a class-sorted list is not used. Augmentation, after `dataset.cache()` on the deterministic decode, is a horizontal flip, a random scale from 1.0 to 1.25 followed by a crop back to 224, a rotation of about ±15 degrees, brightness, and contrast. Class weights are inverse frequency with mean 1, then capped at 10.

## Split

`training/split.py` keeps one field outing in one split. When the photo has a recorder, a finite latitude and longitude, and a date, the group is `recordedBy` (case-folded) plus a 0.01-degree grid (about 1.1 km north–south) plus the calendar day, and the taxon name so two species from the same person on the same day stay separate. Otherwise the group is the GBIF occurrence. `prepare_data.py` writes the counts of each kind of key to `training/data/split_groups.json`.

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

29 outputs. The contract is `assets/models/labels.json` (indexes are the logit order). Edibility is absent from that file. A scan is not allowed to print a verdict.

`unknown_mushroom` is the class immediately before `not_a_mushroom`. It means “this is a fungus, and it is not one of the species this model knows.” It is trained on CC0/CC-BY photos of other fungi that occur in Poland and nearby countries and that are **not** in the known species list (amanitas, boletes, russulas, milk-caps, brackets, and similar names in `labels.json`). Each taxon is capped. A fixed list of those taxa is `held_out_taxon` and is placed only in the test split.

Every species class has `safety_tag` `toxic`, `edible`, or `other`. Every aggregate taxon has `toxic` true or false. Those flags are evaluation labels. The app must not show them as an edibility verdict. Poisonous taxa inside the training unknown class (for example `Hypholoma fasciculare`) and poisonous held-out taxa (for example `Amanita verna`, `Amanita porphyria`, `Inocybe erubescens`, `Inocybe geophylla`, `Entoloma sinuatum`, `Clitocybe rivulosa`, `Gyromitra gigas`, `Agaricus xanthodermus`) are tagged so a test photo of any of them counts when `decide()` would show a confident edible species.

GBIF name matching is strict. `matchType` must be `EXACT` and the rank must be species, subspecies, variety, or form. A `HIGHERRANK` hit (a genus, a class, or the kingdom) stops the fetch with `SystemExit` before any download. That is why the bare strings `Helvella crispa` and `Boletus badius` are not in the manifest: GBIF maps them to a higher rank. The held-out name is `Helvella crispa (Scop.) Fr.`. `Imleria badia` keeps the synonym `Xerocomus badius`, which shares one accepted key. Collisions are checked on that accepted key. The same key may repeat only as synonyms of one class.

When the top class is `unknown_mushroom` and the energy gate accepts the photo, the app shows:

> To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.

It also says the mushroom may be deadly poisonous, and it shows the existing line that the mushroom should be checked by a mycologist or a Sanepid inspector. It does not show a species, a confidence, or an edibility verdict. The same three lines are on the journal entry. `not_a_mushroom` stays last.

### Toxic probes

These taxa are fetched only into the test split, labeled `unknown_mushroom`, target 50 CC0/CC-BY photos each. They are not a 30th class. Counts below are GBIF `StillImage` occurrences on 2026-10-08, before the license filter, so the licensed yield will be lower. The ship gate still requires 50 images of each poisonous held-out taxon, including a taxon that comes back with zero.

| Taxon | GBIF key | StillImage occurrences | Role |
| --- | ---: | ---: | --- |
| Lepiota brunneoincarnata | 2535390 | 188 | parasol look-alike |
| Lepiota subincarnata | 2535445 | 596 | parasol look-alike |
| Lepiota cristata | 2535471 | 4232 | parasol look-alike |
| Omphalotus olearius | 2538088 | 1563 | chanterelle look-alike |
| Galerina sulcipes | 8003146 | 0 | Galerina look-alike; the 50-image floor stays |
| Galerina sulciceps | 8347930 | 39 | GBIF spelling of the (Berk.) Boedijn fungus; a different key from sulcipes; still under 50 |
| Conocybe filaris | 2529789 | 153 | species probe. `Conocybe spp.` is `HIGHERRANK` and is not fetched |
| Tricholoma equestre | 3324883 | 2135 | |
| Chlorophyllum molybdites | 5243168 | 17255 | |

`Cortinarius orellanus`, `Cortinarius rubellus`, and `Galerina marginata` are already model classes. Fetching them again as `unknown_mushroom` would give one fungus two labels, so they are not probes. Their own test photos are poisonous (`safety_tag` `toxic`) and count in `confident_toxic_as_edible`.

The fetch also keeps at most 2 photos from one GBIF occurrence, so the licensed count is lower than the still-image count. Measured on 2026-10-08 with that cap, the whole GBIF still-image result for a taxon when it fit in one page:

| Taxon | CC0/CC-BY photos after the 2-per-occurrence cap |
| --- | ---: |
| Lepiota brunneoincarnata | 16 (the whole set; under 50) |
| Galerina sulcipes | 0 |
| Galerina sulciceps | 8 (the whole set; under 50) |
| Conocybe filaris | 78 (reaches 50) |

`Lepiota subincarnata`, `Lepiota cristata`, `Omphalotus olearius`, `Tricholoma equestre`, and `Chlorophyllum molybdites` each had enough licensed photos in the first page or two to reach 50. One occurrence page (300 records) took about 0.5–2.7 seconds. Three original JPEGs from iNaturalist were about 2 MB and arrived in about 0.2 seconds each on this machine. The extra probe crawl is 9 name lookups, a pass through the Central European countries, then global pages until the cap, then about 320 downloads for the taxa that can reach 50 plus the short taxa above. That is on the order of a few minutes on this CPU box (roughly one minute of occurrence requests and about a minute of JPEG transfer at the measured rate), not a separate multi-hour job. It is part of `python training/run_pipeline.py fetch` and is not run as a full download in CI. The 50-image gate still fails for `Galerina sulcipes`, `Galerina sulciceps`, and `Lepiota brunneoincarnata` at these counts.

Atlas species already in the app, kept so a future model lines up with the cards:

`Boletus edulis`, `Amanita phalloides`, `Macrolepiota procera`, `Cantharellus cibarius`, `Imleria badia`, `Suillus luteus`, `Leccinum scabrum`, `Tylopilus felleus`, `Amanita muscaria`, `Lactarius deliciosus`, `Gyromitra esculenta`, `Paxillus involutus`, `Russula virescens`, `Agaricus campestris`, `Chlorophyllum rhacodes`, `Hygrophoropsis aurantiaca`, `Lactarius torminosus`, `Morchella esculenta`.

Deadly or seriously poisonous Polish species that were not all in the atlas:

- `Amanita virosa` — destroying angel
- `Amanita pantherina` — panther cap
- `Cortinarius orellanus` and `Cortinarius rubellus` (the latter also fetched under `Cortinarius speciosissimus` and `Cortinarius orellanoides`) — orellanine webcaps
- `Galerina marginata` (also `Galerina autumnalis`) — funeral bell

Look-alikes added so those deadly species have somewhere else to go:

- `Kuehneromyces mutabilis` and `Armillaria mellea` — the wood-growing mushrooms people confuse with `Galerina marginata`
- `Amanita rubescens` — the blushing Amanita confused with `A. pantherina`
- `Amanita citrina` — the citron Amanita confused with pale `A. phalloides`

`not_a_mushroom` is a real training class, not a softmax leftover. Its GBIF names are animals, plants, and other non-fungi, with a per-taxon cap and a held-out taxon list so the test is not only the taxa the model trained on.

## Out-of-distribution gate

The energy score is `E(x) = -T * logsumexp(logits / T)` (Liu et al., NeurIPS 2020). In-distribution scores are lower.

The threshold is the lowest validation energy that keeps at least 97% of in-distribution validation images (everything except `not_a_mushroom`, including `unknown_mushroom`). That is an order statistic (`ID_KEEP_FIT`). `numpy.quantile` is not used: its linear interpolation can sit between samples so fewer than the requested share of a short validation split fall at or below it. The ship gate is still 95% on the test split. The extra two points are headroom so a 95% fit does not fail that gate on split noise. The 95% floor was not lowered.

`id_keep_rate_val` records that calibration. The ship gate reads `id_keep_rate_test`: the same threshold on the held-out test split. A photo is rejected, and no species is shown, when the background class wins, when energy is above the threshold, or when the top softmax is below 0.40. A confident `unknown_mushroom` (top class, softmax at least 0.40, energy inside the threshold) is also not a species result. If any logit is NaN or infinite, the result is `unavailable` / `output_mismatch`.

Low confidence (top softmax under 0.70 or top-1/top-2 margin under 0.15) still shows the top three species, with a Sanepid / expert warning. `not_a_mushroom` and `unknown_mushroom` are omitted from that list. The same warning is mandatory when any displayed top-3 genus is Amanita, Cortinarius, Galerina, or Gyromitra.

## Ship gates

`training/ship_gates.py` refuses `--install-into-app` unless every line below is true. None of the previous numeric floors were lowered.

| Gate | What it measures | Floor |
| --- | --- | --- |
| Macro top-1 | Mean top-1 of the **known species** on the test split. `unknown_mushroom` and `not_a_mushroom` are not in the mean. | ≥ 0.80 |
| Macro top-3 | Same, top-3. | ≥ 0.90 |
| High-stakes top-1 | Death cap, destroying angel, panther cap, fly agaric, false morel, both orellanine webcaps, funeral bell, brown roll-rim. | ≥ 0.85 on ≥ 8 test images |
| Species volume | Training images after dedup, each known species. | ≥ 40 |
| Aggregate volume | Training images for `not_a_mushroom` and for `unknown_mushroom`. | ≥ 100 |
| Pair confusion | A high-stakes photo whose argmax is an edible look-alike, for the listed pairs, both directions. | ≤ 0.05 |
| Confident toxic → edible | Every test photo tagged poisonous (known class, unknown-class taxon, or held-out probe) that `decide()` would show as a confident edible species. Edible means every class with `safety_tag` `edible`. Energy rejects, low confidence, and a dangerous-genus warning are not in this count. | 0 |
| Open-set safe outcome | Held-out fungi (`held_out_taxon`, class `unknown_mushroom`, including probes) whose `decide()` status is rejected, or candidates with low confidence or a dangerous-genus warning. Wilson 95% interval. | rate ≥ 0.90 and lower bound ≥ 0.85 |
| Open-set confident edible | The same held-out photos that `decide()` would show as a confident edible. Wilson 95% interval. | rate ≤ 0.02 and upper bound ≤ 0.05 |
| Poisonous held-out sample | Poisonous held-out photos, including every toxic probe and every toxic held-out unknown taxon, even when the count is 0. Confident edible among them must be 0. | ≥ 300 images and ≥ 50 per taxon |
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
| Hashes | sha256 of `model.keras` and `mushrooms_model.tflite` match the files on disk. | exact |

Export builds **fp16** weights with float32 input and output. `react-native-fast-tflite` runs XNNPACK, which executes that graph. A fully integer int8 graph is not the default: XNNPACK rejects MobileNetV3 ops from `TFLITE_BUILTINS_INT8` on device, while fp16 lands near 2 MB and keeps the float preprocess. `--quantization int8` is an experiment and is not what a ship build uses. There is no force flag.

## What is still missing before this is safe to ship

- A trained checkpoint and the measured metrics above.
- Enough CC-BY/CC0 photos of `Cortinarius orellanus`, `Amanita virosa`, and `Cortinarius rubellus`. Global fill is allowed, and it may still be short after dedup.
- Fifty licensed photos of every poisonous held-out taxon. `Galerina sulcipes` had 0 still images and `Galerina sulciceps` had 39 before the license filter, so that gate cannot pass on current GBIF counts. The floor stays 50.
- On-device measurement of accuracy, latency, and the reject rate on a phone. The exporter scores the interpreter on val/test photos on the training machine.
- `Armillaria mellea` is a species complex. Photos labeled that way on GBIF are often sensu lato.
- `Amanita verna` is not its own class. It is one of the held-out taxa inside `unknown_mushroom`.
