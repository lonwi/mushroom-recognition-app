# 0001. Udział jednego zbieracza w klasie (20% czy 50%)

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23
- **Notka:** Wybór 0.50 z 12:13 został wstrzymany 2026-10-23 o 12:14. Właściciel chce najpierw zobaczyć liczby per klasa. W kodzie zostaje 0.20.

## Kontekst

[PR #69](https://github.com/lonwi/mushroom-recognition-app/pull/69) jest na `main`. Merge 2026-10-23 o 11:50 czasu polskiego, commit [`8ac95c484c28e684ce7ca4bcccdabc2a53883c9d`](https://github.com/lonwi/mushroom-recognition-app/commit/8ac95c484c28e684ce7ca4bcccdabc2a53883c9d) („Szczelny podział train/val/test po imporcie zdjęć z #68”).

Podział train/val/test idzie po komponencie tożsamości (obserwator, zdjęcie, obserwacja), nie po samym raporcie wycieczki. Sól (`GRZYBOBRANIE_SPLIT_SALT` albo plik poza repozytorium) tylko pseudonimizuje identyfikatory w raportach i nie zmienia przydziału do splitu.

Bramka jest **na klasę**. Stała `COMPONENT_SHARE_LIMIT` w `training/component_share.py` wynosi **0.20**: udział największego komponentu w wierszach tej klasy. Komentarz w kodzie: decyzja właściciela między 20% a 50% jest otwarta i progu nie wolno podnosić. Plik konfiguracji może zejść poniżej 0.20. Wartość powyżej stałej jest błędem. Globalny udział największego komponentu jest tylko w manifeście, bez twardego stopu.

Klasa ponad progiem albo z pustym val lub testem przerywa `prepare`, zanim powstaną pliki wyniku. Wyjątek z powodem w `training/component_share_acknowledgements.json` przechodzi prepare, trafia do manifestu jako bloker i zostawia `shippable` na false. Dziś na liście jest tylko `cortinarius_orellanus` (patrz [0011](0011-orellanus-bloker.md)).

Test `training/tests/test_split_leak.py` sprawdza, że stała jest równa 0.20.

## Opcje

- **A.** Zostawić próg 20% (0.20).
- **B.** Podnieść próg do 50% (0.50).

## Rekomendacja

Boty: **A** (20%). Wybór 0.50 z 12:13 jest wstrzymany i nie obowiązuje.

## Decyzja

Brak obowiązującego wyboru między 0.20 a 0.50.

2026-10-23 o 12:13 właściciel wskazał `COMPONENT_SHARE_LIMIT` = 0.50. O 12:14 tę decyzję **wstrzymał**. Najpierw chce zobaczyć liczby per klasa. Do tego czasu próg w kodzie zostaje 0.20. PR Trenowania pod 0.50 nie startuje z tego wpisu.

## Data

Wskazanie 0.50: 2026-10-23, 12:13 czasu polskiego.
Wstrzymanie: 2026-10-23, 12:14 czasu polskiego.

## Uzasadnienie

Wstrzymanie: bez liczb per klasa próg 0.50 nie wchodzi.

## Wdrożenie

Brak. Na `main` stała w `training/component_share.py` wynosi **0.20**. Testy `training/tests/test_split_leak.py` i `training/tests/test_contract.py` sprawdzają 0.20. Plik konfiguracji nie podniesie progu powyżej stałej. Mechanizm podziału z [#69](https://github.com/lonwi/mushroom-recognition-app/pull/69) / `8ac95c4` zostaje.

## Weryfikacja

W kodzie na `main` jest 0.20. Liczb per klasa ten wpis nie zawiera.
