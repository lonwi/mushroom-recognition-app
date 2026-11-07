# 0021. Wiersze GBIF bez statusu weryfikacji

- **Status:** Podjęta (wdrożenie w toku)
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

Odrzucone tego dnia: **B** i **C** z listy powyżej (wyrzucenie całej puli bez statusu).

**C** (2026-11-07, Wojciech Bubółka), osobny wybór po [#92](https://github.com/lonwi/mushroom-recognition-app/pull/92). Najpierw scalony zostaje #92 tak, jak jest (commit `129eea7210cbac7ebbf5a34c5da827ca866e838d`, Refs [#83](https://github.com/lonwi/mushroom-recognition-app/issues/83)). Potem osobny pull request zacieśnia regułę. #92 nie jest otwierany ponownie.

Jedna reguła w `fetch_gbif` i w `prepare_data`, dla `gbif_no_status` i dla `gbif_not_validated`:

- pusty status zostaje;
- status, który po zrzuceniu wielkości liter i zbiciu białych znaków jest na liście `Approved | Expert | Evidence` albo `Confident`, zostaje;
- każdy inny niepusty status odpada.

`unverified` jest liczone osobno (`identification_unverified` w imporcie i w `prepare`, `rejected_unverified` w `fetch_report`). Inna etykieta spoza listy, na przykład `Questionable`, `Needs ID` albo `validated`, jest `identification_not_allowlisted` albo `rejected_not_allowlisted`. Pusty status nadal zostaje w treningu i w teście, więc decyzja A z 2026-10-31 zostaje. `commons_category` i pliki `_niezweryfikowane` zostają przy dotychczasowej fladze `unverified`.

## Ustalenie zespołu

To ustalenie jest sprzed 2026-11-07 i nie jest decyzją Wojtka. Zespół wtedy ustalił, że odrzucane jest tylko 55 wierszy jawnie `unverified`, jako błąd importera w [#83](https://github.com/lonwi/mushroom-recognition-app/issues/83). Wybór właściciela z 2026-11-07 jest w sekcji Decyzja.

## Data

2026-10-31, 08:13 czasu polskiego. Dopisek: 2026-11-07, wybór właściciela, wariant C (po scaleniu #92, zacieśnienie listy statusów).

## Uzasadnienie

Właściciel zostawia wiersze bez statusu w obecnym splicie i każe liczyć iNat research-grade jako zweryfikowane. Nie ogranicza wierszy spoza iNat do samego treningu i nie wyrzuca całej puli bez statusu.

Dopisek 2026-11-07: po scaleniu #92 wiersz `gbif_no_status` z niepustą etykietą spoza listy, oraz fetch, który odrzucał tylko jawne `unverified`, nadal wpuszczały taki status do treningu. Właściciel wybrał jedną listę we wszystkich tych miejscach.

## Wdrożenie

Polityka A zostaje przy pustym statusie: wiersze bez statusu nie są odrzucane i idą zwykłym splitem.

#92 jest na `main` (`129eea7210cbac7ebbf5a34c5da827ca866e838d`). Jawne `unverified` odpada w fetchu i ponownie w `prepare_data`. `gbif_not_validated` trzyma listę `Approved | Expert | Evidence` i `Confident`. Pusty `gbif_not_validated` zostaje z flagą `unverified`.

Zacieśnienie z 2026-11-07 jest w [#105](https://github.com/lonwi/mushroom-recognition-app/pull/105), osobnym pull requeście po tamtym commicie. Ta sama funkcja w `training/licenses.py` decyduje w fetchu, w `prepare_data` i przy obu etykietach CSV. Skrót polityki zapytania GBIF jest liczony z bajtów `licenses.py`, więc stary cache zapytań przestaje pasować.

## Weryfikacja

Issue #83 oraz brak pola weryfikacji w `accepted_media_records` sprawdzone przy pierwszym wpisie. Liczb z API GBIF tu nie pobierano ponownie. Są takie, jak w #83.

2026-11-07: w kodzie po #92 sprawdzone, że fetch i `prepare_data` odrzucały tylko jawne `unverified`, a `gbif_no_status` z etykietą `Questionable` albo `Needs ID` przechodził. Testy treningu pokrywają jedną regułę i osobne liczniki.
