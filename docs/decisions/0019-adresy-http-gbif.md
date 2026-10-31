# 0019. Adresy http z GBIF (#84)

- **Status:** Zatwierdzona, czeka na wdrożenie
- **Data wpisu:** 2026-10-23

## Kontekst

[Issue #84](https://github.com/lonwi/mushroom-recognition-app/issues/84) jest otwarte. Tytuł: „Eksport pada po treningu: http w image_url/source_url (attributions.jsonl)”. Run testowy na `1e6f6e7`: `export_tflite.py` w `write_attribution_file` rzuca `RuntimeError`, bo `image_url` zaczyna się od `http://sweetgum.nybg.org/`. Błąd wypada dopiero po treningu.

Issue liczy 273 adresy `image_url` i 312 adresy `source_url` na `http`, wszystkie w train. Hosty w tym issue: NYBG 546, Kew 37, Flickr 2. Plik `attributions.jsonl` jest ze starego fetchu z 2026-10-16. Obecny fetch przepisuje tylko `image_url` w `_attach_file` (`training/fetch_gbif.py`, około linii 1827). `source_url` tam nie jest przepisywany. Pobranie nowego pliku już idzie przez `force_https_url` i odmawia adresu, który po przepisaniu nadal nie jest `https` (`download_image`). `force_https_url` w `training/url_safety.py` przepisuje dowolny host `http`, bez listy dozwolonych hostów.

Eksport odmawia `image_url` i `source_url`, które nie są `https` (`training/export_tflite.py`). `training/prepare_data.py` tej kontroli na adresach nie ma. Eksport i bramka wydania już zapisują albo porównują `fetch_report_sha256`. Manifest `prepare` tego skrótu pliku `fetch_report.json` nie zapisuje.

Lista zadań w issue jest szersza niż decyzja poniżej: `force_https_url` także dla `source_url`, twardy stop `https` w `prepare` przed treningiem, migracja istniejących atrybucji tylko dla hostów serwujących `https`, kontrola w eksporcie bez zmian.

## Opcje

- **A.** Odrzucić wiersze z adresem `http`.
- **B.** Przepisać te adresy na `https` i zostawić wiersz, gdy plik pod `https` jest ten sam.

## Rekomendacja

Brak.

## Decyzja

**B** (2026-10-23, 17:21). Wojtek: „Trzeba poprawić the http na https”. Potwierdzenie bezpośrednio o 17:23: „Tak”.

585 adresów `http` z NYBG i Kew (`source_url`, `image_url`) w danych z GBIF dociąganych w `prepare` przepisujemy na `https`. Tych wierszy nie odrzucamy z samego powodu `http`.

Poprawka tylko w `training/fetch_gbif.py`, z jawną listą dozwolonych hostów: NYBG i Kew.

Że pod `https` jest ten sam plik, potwierdza test na fixture z jednorazowym zapisem hashy `http` i `https` dla próbki z każdego hosta.

Wiersz, który po `https` nie działa, odpada z powodem w raporcie per klasa.

Kontrola `https` w `prepare` i w eksporcie zostaje bez zmian.

Raport i manifest `prepare` zapisują SHA-256 pliku `fetch_report.json`.

Paczka danych zdjęć `_v2` (sha256 `4780c690f76cc68a5a7f88cd40471abf0e9104c07e22c8a7561d43eb1056ab2f`) nie zawiera adresów `http` i się nie zmienia.

Issue wymienia dodatkowo 2 adresy Flickr. Nie ma ich na liście hostów tej decyzji.

Odrzucone: **A** (odrzucenie wierszy z samym `http`) oraz twardy stop `https` w `prepare`, który jest na liście zadań issue.

## Ustalenie zespołu

To nie jest decyzja Wojtka. Zespół ustalił, że dane zdjęć zostają poza repozytorium, zgodnie z [#68](https://github.com/lonwi/mushroom-recognition-app/pull/68). Do `prepare` używamy zamrożonej paczki `_v2` z `SHA256SUMS`. Hash tej paczki jest w decyzji powyżej. W rejestrze tego ustalenia wcześniej nie było. [#68](https://github.com/lonwi/mushroom-recognition-app/pull/68) jest na `main` i nie commituje zdjęć. Katalog `training/data/` jest w `.gitignore`.

## Data

2026-10-23, 17:21 czasu polskiego. Potwierdzenie bezpośrednio: 2026-10-23, 17:23 czasu polskiego.

## Uzasadnienie

Właściciel kazał poprawić `http` na `https`. Adresy NYBG i Kew zostają w zbiorze, gdy pod `https` jest ten sam plik. Wiersz, który po zmianie schematu nie działa, odpada z powodem, a nie przewraca całego eksportu po treningu.

## Wdrożenie

Brak. Poprawki w kodzie jeszcze nie ma. Ma wejść tylko do `training/fetch_gbif.py` i do testu na fixture. Paczka `_v2` zostaje tą samą paczką.

## Weryfikacja

Issue #84, `fetch_gbif.py` (przepisanie samego `image_url`), `url_safety.force_https_url`, odmowa `https` w eksporcie i brak tej kontroli w `prepare_data.py` sprawdzone w tym wpisie. Hash `fetch_report.json` jest już w eksporcie (`fetch_report_sha256`) i nie jest w manifeście `prepare`. Paczki `_v2` w repozytorium nie ma. Testu z jednorazowym zapisem hashy jeszcze nie ma.
