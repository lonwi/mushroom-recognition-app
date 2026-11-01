# 0001. Udział jednego zbieracza w klasie (20% czy 50%)

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23
- **Notka:** Wybór 0.50 z 12:13 został wstrzymany 2026-10-23 o 12:14. [#76](https://github.com/lonwi/mushroom-recognition-app/pull/76) (podniesienie do 0.50) zostaje wstrzymany. Liczby per klasa poniżej pochodzą z runu Trenowania na `main` `1e6f6e7` (`prepare` zatrzymał się fail-closed). Wojtek o 14:17 zdecydował na ich podstawie. Wartość limitu nadal otwarta. W kodzie zostaje 0.20.

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

**Trening, 2026-10-23, 14:17: A teraz i równolegle B.** Wojtek zdecydował na podstawie liczb z runu Trenowania. Tych liczb sam nie podał.

- **A teraz.** Pełny trening testowy. Acknowledgement dla `morchella_esculenta` (54,0%) i `suillus_grevillei` (27,3%). `shippable` = false.
- **Warunki Quality dla A.** Acknowledgement dla `morchella_esculenta` i `suillus_grevillei` zostają tylko na branchu albo w pliku runu, bez merge do `main`. Raport ma mieć `shippable` = false. Po runie na danych od Zbierania te wpisy się usuwa.
- **B równolegle.** Dozbieranie zdjęć od innych autorów, żeby te klasy zeszły poniżej 0.20.

`cortinarius_orellanus` już jest na liście potwierdzeń na `main` i zostaje blokerem wydania ([0011](0011-orellanus-bloker.md)). Nowe acknowledgementy tego przebiegu to maślak i smardz i nie wchodzą na `main`. Przebieg i tak kończy się z `shippable` = false.

### Liczby z runu Trenowania

Źródło: run Trenowania na `main` [`1e6f6e76b241c34329d4805dc89107486a24c313`](https://github.com/lonwi/mushroom-recognition-app/commit/1e6f6e76b241c34329d4805dc89107486a24c313) (`1e6f6e7`). `prepare` zatrzymał się fail-closed. Wojtek o 14:17 tylko na tej podstawie zdecydował.

Udział największego komponentu:

| Klasa | Udział |
|---|---|
| `cortinarius_orellanus` | 84,7% |
| `morchella_esculenta` | 54,0% |
| `suillus_grevillei` | 27,3% |
| pozostałe 36 klas | ≤ 15% |

Zdanie o pozostałych 36 klasach też pochodzi z raportu Trenowania. Najwyżej w tych 36: `not_a_mushroom` 15,0%, `boletus_edulis` 13,8%, `russula_virescens` 13,5%.

Braki wyliczone przez Trenowanie przy progu 0.20, liczone wyłącznie ze zdjęć od nowych autorów i z nowych obserwacji:

| Klasa | Brak przy 0.20 | Cel |
|---|---|---|
| `morchella_esculenta` | +595 | ≥ 945 |
| `suillus_grevillei` | +161 | ≥ 605 |
| `cortinarius_orellanus` | +233 | ≥ 305 |

Zapas Zbierania ok. 10%, w tej samej kolejności klas: +655, +180 i +255. Maks. ok. 30 zdjęć na autora na klasę.

## Data

Wskazanie 0.50: 2026-10-23, 12:13 czasu polskiego.
Wstrzymanie 0.50: 2026-10-23, 12:14 czasu polskiego.
Trening A i B: 2026-10-23, 14:17 czasu polskiego. Decyzja na podstawie raportu, nie jako źródło liczb.
Liczby per klasa, zdanie o 36 klasach (w tym `not_a_mushroom` 15,0%, `boletus_edulis` 13,8%, `russula_virescens` 13,5%) i braki przy 0.20: raport Trenowania z runu na `main` `1e6f6e7`. Zapas ok. 10%: Zbieranie.

## Uzasadnienie

Wstrzymanie 0.50: właściciel chciał najpierw liczb per klasa. Run Trenowania na `main` `1e6f6e7` je podał (`prepare` fail-closed). Trzy klasy są powyżej 0.20 (`orellanus` 84,7%, `morchella` 54,0%, `suillus` 27,3%), pozostałe 36 klas ≤ 15%. Dlatego limit na razie zostaje 0.20. Trening testowy idzie z acknowledgementem dwóch klas ponad progiem (oprócz już wpisanego orellanusa), na warunkach Quality: wpisy maślaka i smardza tylko na branchu albo w pliku runu, raport z `shippable` = false, a po runie na danych od Zbierania te wpisy schodzą. Równolegle dozbieranie schodzi pod 0.20. Braki Trenowania przy 0.20 to +595, +161 i +233; zapas Zbierania ok. 10% to +655, +180 i +255, przy maks. ok. 30 zdjęciach na autora na klasę. Wartość stałej wróci do decyzji, gdy będzie widać, czy dozbieranie schodzi pod próg.

## Wdrożenie

W toku dla treningu. Na `main` stała w `training/component_share.py` wynosi **0.20**. Testy `training/tests/test_split_leak.py` i `training/tests/test_contract.py` sprawdzają 0.20. [#76](https://github.com/lonwi/mushroom-recognition-app/pull/76) jest otwarty i wstrzymany (tytuł: ON HOLD, limit zostaje 0.20). Nie mergować go z tego wpisu.

A: pełny trening testowy z acknowledgement dla `morchella_esculenta` i `suillus_grevillei`. Warunki Quality: te acknowledgementy zostają tylko na branchu albo w pliku runu, bez merge do `main`; raport ma `shippable` = false; po runie na danych od Zbierania wpisy się usuwa. B: dozbieranie zdjęć od nowych autorów i z nowych obserwacji pod próg 0.20, według braków Trenowania (+595 / +161 / +233) i zapasu Zbierania ok. 10% (+655 / +180 / +255), maks. ok. 30 zdjęć na autora na klasę. Żadnego z tych dwóch kroków nie ma jeszcze jako zmergowanego PR.

Mechanizm podziału z [#69](https://github.com/lonwi/mushroom-recognition-app/pull/69) / `8ac95c4` zostaje.

## Weryfikacja

Liczby per klasa, zdanie o 36 klasach i braki przy 0.20 są zapisane z raportu Trenowania (run na `main` `1e6f6e7`, `prepare` fail-closed). Nie pochodzą od właściciela i nie przeliczano ich ponownie z plików treningu w tym repozytorium. Wojtek o 14:17 zdecydował na ich podstawie. W kodzie na `main` jest 0.20. Acknowledgementów dla `morchella_esculenta` i `suillus_grevillei` na `main` nie ma.
