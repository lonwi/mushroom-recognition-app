# 0001. Udział jednego zbieracza w klasie (20% czy 50%)

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

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

Boty: **A** (20%).

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Mechanizm podziału i bramka przy 0.20 są na `main` przez #69 / `8ac95c4`. Wybór 20% albo 50% nie jest zamknięty. Samo podniesienie stałej bez tego wpisu byłoby zmianą wbrew komentarzowi w `component_share.py`.

## Weryfikacja

—
