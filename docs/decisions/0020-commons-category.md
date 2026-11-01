# 0020. Zdjęcia z kategorii Wikimedia Commons (`commons_category`)

- **Status:** Zatwierdzona, czeka na wdrożenie
- **Data wpisu:** 2026-10-31

## Kontekst

Import CSV (`training/import_external.py`) oznacza wiersz jako `unverified`, gdy `id_confidence` to `commons_category` albo `gbif_not_validated`, i gdy nazwa pliku zawiera `_niezweryfikowane`. `training_eligible` odrzuca każdy wiersz `unverified`. `prepare_data.py` pomija takie wiersze z powodem `unverified`, więc nie wchodzą do train, val ani test. Zostają w `external.jsonl`. `training/split.py` nie ma osobnej flagi dla `commons_category`.

Ta decyzja dotyczy tylko `commons_category`. `gbif_not_validated` i pliki `_niezweryfikowane` zostają przy obecnym pominięciu. Dopisanie zdjęć Commons i limit autora są w [0018](0018-limit-autora-commons.md). Licencje zdjęć są w [0004](0004-licencje-zdjec.md).

Liczba 9 466 wierszy jest z tej decyzji. Plików CSV w repozytorium nie ma (ustalenie zespołu w [0019](0019-adresy-http-gbif.md)).

## Opcje

- **A.** Tylko do treningu. Nigdy do testu ani do walidacji.

## Rekomendacja

Trenowanie i Zbieranie: **A**.

## Decyzja

**A** (odpowiedź 2026-10-23, potwierdzona 2026-10-31). Zdjęcia z kategorii Wikimedia Commons (`commons_category`, 9 466 wierszy) są tylko do treningu. Nie wchodzą do testu ani do walidacji.

## Data

Odpowiedź: 2026-10-23. Potwierdzenie: 2026-10-31.

## Uzasadnienie

Właściciel przyjął rekomendację Trenowania i Zbierania. Kategoria Commons może uczyć model. Nie może trafić do walidacji ani do testu.

## Wdrożenie

Flaga w splicie i test kontraktu, w PR-ze Trenowania. Tego PR jeszcze nie ma.

## Weryfikacja

Stan kodu sprawdzony: `commons_category` jest w `_UNVERIFIED_CONFIDENCE`, a `prepare` takie wiersze pomija. Flagi w splicie i testu kontraktu jeszcze nie ma. Liczby 9 466 nie przeliczano na plikach w repozytorium.
