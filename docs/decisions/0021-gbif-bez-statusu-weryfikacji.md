# 0021. Wiersze GBIF bez statusu weryfikacji

- **Status:** Zatwierdzona
- **Data wpisu:** 2026-10-31

## Kontekst

[Issue #83](https://github.com/lonwi/mushroom-recognition-app/issues/83) jest otwarte. Tytuł: „fetch_gbif: brak filtra weryfikacji — wiersze GBIF z identificationVerificationStatus=unverified trafiają do treningu”.

`training/fetch_gbif.py` szuka wystąpień po `taxonKey`, `mediaType` i kraju (`iter_occurrences`, `_fetch_occurrence_page`). `training/licenses.py` w `accepted_media_records` zostawia medium tylko przy licencji CC0 albo CC BY i nie kopiuje `identificationVerificationStatus` ani `basisOfRecord`. Bramka `unverified` w `prepare_data.py` dotyczy wierszy, które już mają tę flagę z `import_external.py`. Fetch GBIF jej nie ustawia.

Liczby z #83, lokalne dane runu `1e6f6e7`, status z API GBIF: 23 332 wiersze. Jawnie `unverified`: 55 (42 wystąpienia, zbiór „ibbi observations”). `validated`: 294. Observation.org Approved: 69. „verified using recorded media”: 25. Brak statusu: 22 883, w tym iNat research-grade 19 098.

To nie jest [0020](0020-commons-category.md). Tamte wiersze mają `id_confidence` = `commons_category` w imporcie CSV i dziś w ogóle nie wchodzą do splitu.

## Opcje

- **A.** Wiersze bez statusu zostają w treningu i w teście, jak dziś. iNat research-grade liczymy jako zweryfikowane.
- **B.** Wiersze spoza iNat bez statusu tylko do treningu.
- **C.** Odrzucić wszystkie wiersze bez statusu. Zostałoby ok. 400 wierszy.

## Rekomendacja

Brak.

## Decyzja

**A** (2026-10-31, 08:13). Wiersze z GBIF bez statusu weryfikacji zostają w treningu i w teście, jak dziś. iNat research-grade liczymy jako zweryfikowane.

Odrzucone: **B** i **C**.

## Ustalenie zespołu

To nie jest decyzja Wojtka. Zespół ustalił, że odrzucane jest tylko 55 wierszy jawnie `unverified`, jako błąd importera w [#83](https://github.com/lonwi/mushroom-recognition-app/issues/83).

## Data

2026-10-31, 08:13 czasu polskiego.

## Uzasadnienie

Właściciel zostawia wiersze bez statusu w obecnym splicie i każe liczyć iNat research-grade jako zweryfikowane. Nie ogranicza wierszy spoza iNat do samego treningu i nie wyrzuca całej puli bez statusu.

## Wdrożenie

Polityka A jest dzisiejszym zachowaniem fetchu: wiersze bez statusu nie są odrzucane i idą zwykłym splitem. `accepted_media_records` nadal nie zapisuje statusu weryfikacji ani research-grade. Odrzucenia 55 jawnych `unverified` w kodzie jeszcze nie ma. Jest na liście zadań #83.

## Weryfikacja

Issue #83 oraz brak pola weryfikacji w `accepted_media_records` sprawdzone w tym wpisie. Liczb z API GBIF tu nie pobierano ponownie. Są takie, jak w #83.
