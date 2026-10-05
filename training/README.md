# Training an on-device mushroom model

This directory is not part of the Expo bundle. It downloads openly licensed photos, trains a small MobileNetV3-Small classifier, measures it, and can export TFLite. The app does not currently contain `assets/models/mushrooms_model.tflite`. Until `export_tflite.py` installs a model that passes the ship gates, the scanner stays on “recognition unavailable”.

No weights were trained in the environment that added this pipeline (no GPU). Do not treat a smoke-test checkpoint as a foraging model.

## License rules

Photos are fetched from the GBIF occurrence API (`training/fetch_gbif.py`). A photo is kept only when **its own media license** normalizes to CC0 or CC-BY (any version). The occurrence-level license is not allowed to override the photo.

Rejected on purpose:

- CC-BY-NC, CC-BY-SA, CC-BY-ND, and the NC/SA/ND combinations (this includes most iNaturalist research-grade photos, which are CC-BY-NC, and DF20 / FungiTastic)
- “all rights reserved”, free-text copyright lines, and missing media licenses
- anything that is not an explicit Creative Commons CC0 or CC-BY URL

Every accepted photo is written to `training/data/attributions.jsonl` with the creator, the license URL, the normalized license id, the image URL, and a source page (the publisher URL or the GBIF occurrence). That file is required for CC-BY. It is gitignored because it is produced by the fetch. The app settings screen points at it. See `training/ATTRIBUTION.md`.

Geography: Poland, Germany, Czechia, Slovakia, Austria, Hungary, Lithuania, Latvia, and Estonia are collected first. If a class still has fewer than `--min-before-global` photos (default 40), the same license filter is allowed to fill from the rest of the world. Some deadly species barely exist as CC-BY photos inside Central Europe; `Cortinarius orellanus` is the thin one (on the order of 70 explicit CC-BY media on GBIF, plus a handful of CC0, before dedup).

## Backbone

`keras.applications.MobileNetV3Small(weights="imagenet", include_preprocessing=False)`.

The checkpoint is the Keras Applications ImageNet file, published with TensorFlow / Keras under **Apache-2.0**. ImageNet photographs are not downloaded or redistributed. Training images are the CC0/CC-BY set above.

The network reads floats already scaled with `(pixel / 127.5) - 1` and emits **logits**, not softmax. The same resize (bilinear, half-pixel centers) and scale live in `training/preprocess.py` and `src/services/imagePreprocess.ts`.

## Class list

28 outputs. The contract is `assets/models/labels.json` (indexes are the logit order). Edibility is intentionally absent from that file; the atlas remains the place for edibility, and a scan is not allowed to print a verdict.

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

`not_a_mushroom` is a real training class, not a softmax leftover. Its GBIF names are non-fungi (`Felis catus`, dog, blackbird, oak, daisy, honeybee, red squirrel, horse) so a cat photo has a class that is allowed to win.

Pairs the evaluation report must count in both directions include death cap versus parasol, green russula, and field mushroom; panther cap versus blushing Amanita; false morel versus morel; funeral bell versus sheathed woodtuft and honey fungus; cep versus bitter bolete; chanterelle versus false chanterelle.

## Out-of-distribution gate

Two mechanisms, both required:

1. The background class above.
2. An energy score `E(x) = -T * logsumexp(logits / T)` (Liu et al., NeurIPS 2020). In-distribution scores are lower. The threshold is the 95th percentile of in-distribution **validation** energies, so about 95% of validation mushrooms are kept. Test mushrooms and held-out non-mushrooms are scored only after that.

A photo is rejected, and no species is shown, when the background class wins, when energy is above the threshold, or when the top softmax is below 0.40. A softmax above 0.5 is not acceptance. The shared cases in `training/fixtures/decision_cases.json` include a vector whose top softmax is about 0.53 on a bolete and a vector whose top softmax is about 0.76; both are rejected because their logits are small. A separate case is a confident “not a mushroom” (large background logit, in-distribution energy) and is still rejected.

Low confidence (top softmax under 0.70 or top-1/top-2 margin under 0.15) still shows the top three, with a Sanepid / expert warning. The same warning is mandatory when any top-3 genus is Amanita, Cortinarius, Galerina, or Gyromitra.

Those softmax floors are policy. They are not evidence the gate works. Evidence is the measured rate at which held-out non-mushrooms with softmax above 0.5 are still rejected. The ship gate demands at least 30 such images and a rejection rate of at least 0.90. That number does not exist yet, because no model has been trained.

## Ship gates

`training/ship_gates.py` refuses `--install-into-app` unless all of the following are present in `training/artifacts/metrics.json`:

- macro top-1 at least 0.80 and macro top-3 at least 0.90 on fungi classes
- each high-stakes class (death cap, destroying angel, panther cap, fly agaric, false morel, both orellanine webcaps, funeral bell, brown roll-rim) has top-1 at least 0.85 on at least 8 test images
- at least 40 training images per fungi class after dedup, and at least 100 background images
- a high-stakes photo predicted as an edible look-alike at a rate of at most 0.05
- validation in-distribution keep rate at least 0.95
- held-out non-mushroom reject rate at least 0.90
- at least 30 held-out non-mushrooms with softmax above 0.5, of which at least 90% are still rejected by energy or the background class
- a TFLite file that the interpreter actually loads, with top-1 agreement at least 0.99 against the float Keras model on random inputs in [-1, 1]
- a complete attribution row (creator, CC0 or CC-BY license, image URL, source page) for every image

Export tries int8 weights with float input/output first, then fp16. Internal quantization must not change the app’s float preprocess. If neither build loads and agrees, nothing is copied into `assets/models/`.

There is no force flag.

## How to run

On a machine with a GPU, a current NVIDIA driver, and Python 3.11+:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r training/requirements.txt
# GPU build of TensorFlow, if pip’s default wheel is CPU-only:
# pip install 'tensorflow[and-cuda]'

python training/run_pipeline.py fetch
python training/run_pipeline.py prepare
python training/run_pipeline.py train
python training/run_pipeline.py evaluate
python training/run_pipeline.py export
```

`train` fine-tunes MobileNetV3-Small: frozen head, then the last 20 layers. Outputs land in `training/artifacts/` (`model.keras`, `metrics.json`, `mushrooms_model.tflite`). The Expo app is unchanged.

Install into the app only after reading `metrics.json` and only if `shippable` is true:

```bash
python training/run_pipeline.py export -- --install-into-app
```

That copies the TFLite file, writes the calibrated thresholds into `assets/models/labels.json`, and points `src/services/modelPackage.ts` at the asset. A development build is required after that (`react-native-fast-tflite` and `react-native-nitro-modules` are native). Expo Go cannot load the interpreter. Until this step succeeds, `PACKAGED_MODEL_MODULE` stays `null`.

Useful fetch limits while checking licenses:

```bash
python training/fetch_gbif.py --dry-run --only amanita_phalloides --max-per-class 5 --max-pages 1
```

Unit tests that do not need TensorFlow:

```bash
python -m unittest discover -s training/tests -v
```

## What is still missing before this is safe to ship

- A trained checkpoint and the measured metrics above. They were not produced here.
- Enough CC-BY/CC0 photos of `Cortinarius orellanus`, `Amanita virosa`, and `Cortinarius rubellus`. Global fill is allowed, and it may still be short after dedup.
- A harder negative set than the eight non-fungus taxa (hands, soil, leaves, bread, supermarket mushrooms that are not in the class list). The ship gate will fail if too few negatives score softmax above 0.5, which is the failure mode we need to measure.
- Confirmation from counsel if the Apache-2.0 Keras ImageNet initialization is acceptable. The weight file’s license is Apache-2.0; the ImageNet images themselves are not in this repo and are not all CC-BY.
- `Armillaria mellea` is a species complex. Photos labeled that way on GBIF are often sensu lato.
- `Amanita verna` and other white deadly Amanitas are not separate classes yet.
- On-device measurement of accuracy, latency, and the reject rate on a phone, including Expo dev-client builds. The JS path is in place; it does not run without the file.
- int8 calibration on real validation images rather than uniform noise in [-1, 1]. The exporter’s agreement check is necessary and not sufficient.

## Left for later

Journal GPS, atlas filters, full i18n of every screen, CI for the Python pipeline, per-image attribution UI beyond the settings notice, and any model that has not passed the ship gates.
