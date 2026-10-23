# 0001. Udział jednego zbieracza w klasie (20% czy 50%)

- **Status:** Podjęta (wdrożenie w toku)
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

Boty wskazywały **A** (20%). Obowiązuje decyzja poniżej: **B** (0.50).

## Decyzja

**B.** `COMPONENT_SHARE_LIMIT` = **0.50**.

Próg na klasę to udział największego komponentu równy 50%. Plik konfiguracji nadal może zejść poniżej stałej. Wartość powyżej stałej zostaje błędem.

## Data

2026-10-23, 12:13 czasu polskiego.

## Uzasadnienie

Właściciel podniósł próg z 0.20 do 0.50. Rekomendacja botów była przy 20%.

## Wdrożenie

W toku, w osobnym PR Trenowania. Na `main` stała w `training/component_share.py` nadal wynosi **0.20** (komentarz: decyzji 20% albo 50% nie wolno realizować podniesieniem progu w innym miejscu). Testy `training/tests/test_split_leak.py` i `training/tests/test_contract.py` sprawdzają 0.20. Plik `component_share_acknowledgements.json` nie podniesie progu: limit wyższy niż stała jest odrzucany. Mechanizm podziału z [#69](https://github.com/lonwi/mushroom-recognition-app/pull/69) / `8ac95c4` zostaje.

## Weryfikacja

Decyzja zapisana w tym wpisie. W kodzie na `main` nadal jest 0.20.
