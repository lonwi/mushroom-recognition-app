# 0001. Udział jednego zbieracza w klasie (20% czy 50%)

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23
- **Notka:** Wybór 0.50 z 12:13 został wstrzymany 2026-10-23 o 12:14. [#76](https://github.com/lonwi/mushroom-recognition-app/pull/76) (podniesienie do 0.50) zostaje wstrzymany. Liczby per klasa są poniżej (14:17). Wartość limitu nadal otwarta. W kodzie zostaje 0.20.

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

Wartość `COMPONENT_SHARE_LIMIT` nadal **otwarta**. Obowiązujący próg w kodzie to 0.20. Wybór 0.50 z 12:13 jest wstrzymany. [#76](https://github.com/lonwi/mushroom-recognition-app/pull/76) nie wchodzi na `main`.

**Trening, 2026-10-23, 14:17: A teraz i równolegle B.**

- **A teraz.** Pełny trening testowy. Acknowledgement dla `morchella_esculenta` (54,0%) i `suillus_grevillei` (27,3%). `shippable` = false.
- **B równolegle.** Dozbieranie zdjęć od innych autorów, żeby te klasy zeszły poniżej 0.20.

Liczby per klasa, udział największego komponentu:

| Klasa | Udział |
|---|---|
| `cortinarius_orellanus` | 84,7% |
| `morchella_esculenta` | 54,0% |
| `suillus_grevillei` | 27,3% |
| pozostałe 36 klas | ≤ 15% |

`cortinarius_orellanus` już jest na liście potwierdzeń i zostaje blokerem wydania ([0011](0011-orellanus-bloker.md)). Nowe acknowledgementy tego przebiegu to maślak i smardz. Przebieg i tak kończy się z `shippable` = false.

## Data

Wskazanie 0.50: 2026-10-23, 12:13 czasu polskiego.
Wstrzymanie 0.50: 2026-10-23, 12:14 czasu polskiego.
Trening A i B oraz liczby per klasa: 2026-10-23, 14:17 czasu polskiego.

## Uzasadnienie

Wstrzymanie 0.50: właściciel chciał najpierw liczb per klasa. Liczby są. Trzy klasy są powyżej 0.20 (`orellanus` 84,7%, `morchella` 54,0%, `suillus` 27,3%), reszta nie. Dlatego limit na razie zostaje 0.20, trening testowy idzie z acknowledgementem dwóch klas ponad progiem (oprócz już wpisanego orellanusa) i bez prawa wydania, a równolegle schodzimy zbieraniem zdjęć poniżej 0.20. Wartość stałej wróci do decyzji, gdy będzie widać, czy dozbieranie schodzi pod próg.

## Wdrożenie

W toku dla treningu. Na `main` stała w `training/component_share.py` wynosi **0.20**. Testy `training/tests/test_split_leak.py` i `training/tests/test_contract.py` sprawdzają 0.20. [#76](https://github.com/lonwi/mushroom-recognition-app/pull/76) jest otwarty i wstrzymany (tytuł: ON HOLD, limit zostaje 0.20). Nie mergować go z tego wpisu.

A: pełny trening testowy z acknowledgement dla `morchella_esculenta` i `suillus_grevillei`, wynik `shippable` = false. B: dozbieranie zdjęć innych autorów pod próg 0.20. Żadnego z tych dwóch kroków nie ma jeszcze jako zmergowanego PR.

Mechanizm podziału z [#69](https://github.com/lonwi/mushroom-recognition-app/pull/69) / `8ac95c4` zostaje.

## Weryfikacja

Liczby per klasa są zapisane tak, jak podał właściciel 14:17. Nie przeliczano ich ponownie z plików treningu w tym repozytorium. W kodzie na `main` jest 0.20.
