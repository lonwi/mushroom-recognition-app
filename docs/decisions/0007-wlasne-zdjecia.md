# 0007. Własne zdjęcia Wojciecha w treningu

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

W repozytorium nie ma folderu ze zdjęciami właściciela ani CSV, które by je opisywało. Zdjęcia treningowe nie są commitowane. Fetch GBIF pisze do `training/data/` (katalog roboczy, gitignore). Import zewnętrzny (`training/import_external.py`) czyta CSV per gatunek (iNaturalist, GBIF, Wikimedia Commons, `df20/`) i stosuje reguły licencji z [0004](0004-licencje-zdjec.md). Nie pobiera plików obrazów.

`--gallery-csv` w `prepare_data.py` (opis w #69) dotyczy manifestu galerii już używanej przy wykluczaniu zdjęć z treningu (`training/gallery_exclusion.py`). To nie jest importer prywatnego zbioru Wojciecha.

Propozycja, której jeszcze nie ma w kodzie: folder na klasę oraz CSV z autorem i licencją, wpuszczane tym samym importerem i tymi samymi regułami co obce CSV (https, wersja licencji, odrzucenie surowszej kopii, limit na zbieracza).

Pełny trening z [0002](0002-license-url-trening.md) idzie **bez** zewnętrznych CSV. Ten wpis jest osobny i nie dokłada zdjęć do tamtego przebiegu.

## Opcje

- **A.** Dopisać folder i CSV w nowym PR.
- **B.** Zrobić to później.
- **C.** Nie dodawać własnych zdjęć tą drogą.

## Rekomendacja

Boty: **A**.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak.

## Weryfikacja

—
