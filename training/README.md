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
- `unknown_mushroom` and `not_a_mushroom`: `class_cap` 2500 in `labels.json`, spread across every listed taxon (`per_taxon_cap` 80, reduced so the cap is shared)
- at most 2 photos from one GBIF observation

`Cortinarius orellanus`, `Cortinarius rubellus`, and `Amanita virosa` are thin in CC0/CC-BY. The fetch writes `training/data/fetch_report.json` with their counts and does not invent photos. The ship gate still requires 40 training images for a species, so a short class cannot ship.

## Preprocessing

The phone and the trainer see the same pixels:

1. EXIF orientation is applied (Pillow `ImageOps.exif_transpose` in prepare; `expo-image-manipulator` with no resize in `readPhotoAsPngBytes`, because the camera uses `skipProcessing`).
2. If both sides are at least 224, an antialiased box filter resizes to 224 and the result is rounded to uint8. `prepare_data.py` caches that PNG under `training/data/prepared/224/`.
3. Smaller images keep the bilinear half-pixel resize.
4. Normalization is `(pixel / 127.5) - 1`.

Training reads the cached PNG. It does not decode the original JPEG with `tf.io.decode_image`, which ignores EXIF. Corrupt files are skipped.

Train augmentation (after the cache) is a horizontal flip, brightness, and contrast. Class weights are inverse frequency. `dataset.cache()` sits on the deterministic decode, before augmentation.

## Backbone

`keras.applications.MobileNetV3Small(weights="imagenet", include_preprocessing=False)`.

The checkpoint is the Keras Applications ImageNet file, published with TensorFlow / Keras under **Apache-2.0**. ImageNet photographs are not downloaded or redistributed. Training images are the CC0/CC-BY set above. TensorFlow is pinned in `training/requirements.txt`.

The network reads floats already scaled with `(pixel / 127.5) - 1` and emits **logits**, not softmax.

## Class list

29 outputs. The contract is `assets/models/labels.json` (indexes are the logit order). Edibility is absent from that file. A scan is not allowed to print a verdict.

`unknown_mushroom` is the class immediately before `not_a_mushroom`. It means “this is a fungus, and it is not one of the species this model knows.” It is trained on CC0/CC-BY photos of other fungi that occur in Poland and nearby countries and that are **not** in the known species list (amanitas, boletes, russulas, milk-caps, brackets, and similar names in `labels.json`). Each taxon is capped. A fixed list of those taxa is `held_out_taxon` and is placed only in the test split, so the recall gate measures fungi the trainer never saw.

When the top class is `unknown_mushroom` and the energy gate accepts the photo, the app shows:

> To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.

It does not show a species, a confidence, or an edibility verdict. `not_a_mushroom` stays last.

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

The threshold is the lowest validation energy that keeps at least 95% of in-distribution validation images (everything except `not_a_mushroom`, including `unknown_mushroom`). That is an order statistic. `numpy.quantile` at 0.95 is not used: its linear interpolation can sit between samples so fewer than 95% of a short validation split fall at or below it.

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
| Confident toxic → edible | Test photos of a high-risk class that the app would **show** as an edible look-alike with `low_confidence` false. Energy rejects and low-confidence candidates are not in this count. | 0 |
| In-distribution keep | Share of test images other than `not_a_mushroom` whose energy is ≤ the **validation** threshold. | ≥ 0.95 |
| Non-mushroom reject | Test `not_a_mushroom` photos rejected by energy or the background class. | ≥ 0.90 |
| Overconfident non-mushrooms | Test non-mushrooms with softmax > 0.5 that energy or the background class still rejects. | ≥ 30 images and ≥ 0.90 |
| Held-out non-mushroom taxa | `not_a_mushroom` taxa that never appear in train or val. | ≥ 20 images and reject ≥ 0.90 |
| Unknown-fungus recall | Test photos of fungi taxa held out of train and val whose top class is `unknown_mushroom`. | ≥ 0.50 on ≥ 30 images |
| Unknown-fungus steal | Known-species test photos whose top class is `unknown_mushroom`. | ≤ 0.10 |
| Coverage | Every class in `labels.json` has a measured top-1/top-3 and support above 0 in train and in test. | required |
| TFLite agreement | Top-1 match between the interpreter and the float Keras model on **every** val and test photo. | ≥ 0.99 |
| TFLite high-risk agreement | The same match, only on high-risk class photos, again the full val+test count. | ≥ 0.99 |
| Attribution | `attributions.jsonl` beside the model has one complete row (creator, CC0 or CC-BY, image URL, source page) per train+val+test image. | complete |
| Hashes | sha256 of `model.keras` and `mushrooms_model.tflite` match the files on disk. | exact |

Export builds **fp16** weights with float32 input and output. `react-native-fast-tflite` runs XNNPACK, which executes that graph. A fully integer int8 graph is not the default: XNNPACK rejects MobileNetV3 ops from `TFLITE_BUILTINS_INT8` on device, while fp16 lands near 2 MB and keeps the float preprocess. `--quantization int8` is an experiment and is not what a ship build uses. There is no force flag.

## What is still missing before this is safe to ship

- A trained checkpoint and the measured metrics above.
- Enough CC-BY/CC0 photos of `Cortinarius orellanus`, `Amanita virosa`, and `Cortinarius rubellus`. Global fill is allowed, and it may still be short after dedup.
- On-device measurement of accuracy, latency, and the reject rate on a phone. The exporter scores the interpreter on val/test photos on the training machine.
- `Armillaria mellea` is a species complex. Photos labeled that way on GBIF are often sensu lato.
- `Amanita verna` is not its own class. It is one of the held-out taxa inside `unknown_mushroom`.
