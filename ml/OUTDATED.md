# Kontrakt `ml/` po cięciu greenfield (Q12)

Ten katalog **nie jest** potokiem treningowym mini+. Trening prowadzi osobny bot. Tutaj zostaje zamrożony kontrakt prototypu, zawężony do tego, czego potrzebują fixture'y, `ship_gates` i testy kontraktu. Logiki bramek i matematyki decyzji nie przepisujemy.

## Co jest przestarzałe

`ml/DATA_CONTRACT.md`, `ml/AGENTS.md`, `ml/README.md` oraz nagłówki `recognition_math.py`, `preprocess.py`, `manifest.py` i `ship_gates.py` opisują stan prototypu:

- 54 wyjścia: 52 gatunki + `unknown_mushroom` + `not_a_mushroom`
- `class_cap` 2500 dla klas zbiorczych
- preprocessing na sztywno 224 px i `(piksel / 127.5) - 1`

**Obowiązująca decyzja (2026-11-10):** do 67 wyjść gatunkowych (cel 67), bez klas zbiorczych. Odrzucenie zdjęcia robi próg energii i minimalne prawdopodobieństwo top-1. Gatunki mini+ bez danych nie są wyjściami z `in_model: false`. Trafiają do `uncoveredSpecies` w manifeście. Aktualny kontrakt aplikacji to `schemas/model-manifest.schema.json` (szkic v1.0.0-draft) i `fixtures/model-manifest.example.json`.

`assets/models/labels.json` zostaje, bo zamrożone testy ładują ten plik. To nie jest manifest v1.

## Co zostało

- `ml/fixtures/**` — fixture'y parytetu prototypu (P1/P2) oraz zamrożona lista 44 kart atlasu (`prototype-atlas-cards.json`), bo test kontraktu porównywał z nią `labels.json`.
- `ml/ship_gates.py` i moduły, które importuje (także leniwie): `evaluate.py`, `export_tflite.py`, `manifest.py`, `recognition_math.py`, `stats.py`, `component_share.py`, `publication.py`, `import_external.py`, `license_policy.py`, `licenses.py`, `url_safety.py`, `split.py`, `split_salt.py`, `gallery_exclusion.py`.
- `ml/preprocess.py` — referencja parytetu P1 prototypu.
- `ml/tests/test_contract.py` — testy decyzji, preprocessingu, bramek i statystyk.

## Co wypadło z testu kontraktu

- Instalacja wag do `src/services/modelPackage.ts` i typecheck kopii repozytorium. Prototypowej aplikacji już nie ma.
- Testy wołające `fetch_gbif` i `prepare_data._usable_records`. To był potok pobierania zdjęć, nie kontrakt aplikacji.

## Czego nie ma w tym katalogu

`train.py`, `fetch_gbif.py`, `prepare_data.py`, `dedup.py`, `sampling.py` i reszta potoku danych. `ml/requirements.txt` (TensorFlow) zostaje jako ślad pinu prototypu i nie jest instalowany w CI. CI odpala tylko `ml/requirements-dev.txt` (numpy, Pillow) i `python -m unittest discover -s ml/tests`.
