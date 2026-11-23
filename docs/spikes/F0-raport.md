# Raport spike'ów Fazy 0

Wypełnia Wojciech na telefonach. CI tego nie mierzy. Puste komórki zostają puste, dopóki nie ma pomiaru.

Telefony:

| Rola         | Telefon              | Co zapisujemy                                                                                  |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------- |
| Referencyjny | Xiaomi Mi 11 Lite 5G | budżety, w tym motyw ≤200 ms                                                                   |
| Pominięty    | Huawei P smart 2019  | pominięty decyzją właściciela (2026-11-23); wcześniej: brak awarii, OOM i ANR, czasy bez progu |
| Dym / GPU    | Samsung S23          | uruchomienie i motywy                                                                          |

Telefon referencyjny jest potwierdzony: Xiaomi Mi 11 Lite 5G. Rozmiar RAM nie jest znany. Pomiary z 2026-11-22 wpisał właściciel (Wojciech). Pochodzą z buildu release złożonego profilem EAS `preview`. Seria przełączeń spike'a A i seria przebiegów spike'a B zastępują wcześniejsze pojedyncze pomiary z tego dnia.

Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Nie będzie na nim przebiegów spike'ów F0. Wiersz zostaje, żeby nie zgubić wcześniejszego zestawu.

## Potwierdzenie Huaweia (Q3)

Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Polecenia i pusta tabela zostają jako ślad pytania Q3. Nikt ich nie uruchamia. Puste komórki nie są brakiem pomiaru spike'a A ani B.

Podłącz telefon i uruchom:

```bash
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
adb shell cat /proc/meminfo
adb shell getprop ro.hardware
adb shell getprop ro.board.platform
adb shell pm path com.google.android.gms
```

Oczekiwane, do potwierdzenia: model w okolicy `POT-LX1`, Android 9 (API 28) albo nowszy, `MemTotal` około 3 GB (jest też wariant 4 GB), platforma Kirin 710, obecność pakietu `com.google.android.gms`. API 28 spełnia minSdk 24 React Native 0.88.

| Pole                                | Wynik |
| ----------------------------------- | ----- |
| `ro.product.model`                  |       |
| `ro.build.version.release`          |       |
| `ro.build.version.sdk`              |       |
| `MemTotal`                          |       |
| `ro.hardware` / `ro.board.platform` |       |
| `com.google.android.gms`            |       |

## Spike A — stylowanie

Kryteria z `docs/adr/0001-styling.md`. Każde oceniamy na telefonie, który ADR dla niego wskazuje, nie na każdym telefonie z zestawu. (b) i próg 200 ms tylko na Xiaomi Mi 11 Lite 5G. (e) to dym na S23. (c) od 2026-11-23 jest odczytem TalkBack na Mi 11 Lite 5G. (a) i brak awarii przy przełączaniu są zapisane na Mi 11 Lite 5G i na S23. Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Czas na Huaweiu nie był progiem. Sam pomiar Huaweia, w ADR kryterium (d), też już nie jest wymagany. Kolumna Huaweia zostaje i ma `pominięty`, zamiast pustych komórek czekających na przebieg.

| Kryterium                                                                          | Xiaomi Mi 11 Lite 5G                                   | Huawei P smart 2019 | Samsung S23                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------- | ----------------------------------------------------- |
| (a) release instaluje się i startuje, bez błędu Metro / Babel / Reanimated         | zaliczone                                              | pominięty           | zaliczone                                             |
| (b) trzy motywy, czas do zatwierdzonej klatki (próg 200 ms tylko na Mi 11 Lite 5G) | zaliczone                                              | pominięty           | dym OK                                                |
| (c) `@rn-primitives`: fokus, rola, etykieta na przyciskach spike'a                 | zaliczone                                              | pominięty           |                                                       |
| (d) brak awarii i ANR przy przełączaniu                                            | zaliczone                                              | pominięty           | zaliczone                                             |
| (e) dym: start i trzy motywy                                                       |                                                        | pominięty           | zaliczone                                             |
| Seria przełączeń z ekranu spike'a (ms)                                             | n=30, średnia 103,0, mediana 99,7, min 79,4, max 140,5 | pominięty           | n=35, średnia 90,1, mediana 94,0, min 62,4, max 132,2 |

Werdykt A: `zaliczony` (skala: `zaliczony` / `niezaliczony` / `niezmierzony`).

(b) na Mi 11 Lite 5G jest `zaliczone`. Próg 200 ms od 2026-11-22 dotyczy tylko tego telefonu. Seria 30 przełączeń na buildzie release, profil EAS `preview`, obejmuje wszystkie trzy motywy. Maksimum 140,5 ms jest poniżej progu. Wcześniej tego samego dnia był pomiar pięciu przełączeń; ta seria go zastępuje.

Samsung S23, 35 przełączeń, wszystkie trzy motywy. (b) jest dymem, bez progu 200 ms: dym OK.

(a) jest `zaliczone` na Mi 11 Lite 5G i na S23: release instaluje się i startuje, bez błędu Metro, Babel i Reanimated. Właściciel: aplikacja startuje.

(d) jest `zaliczone` na Mi 11 Lite 5G i na S23: brak awarii i ANR przy przełączaniu. Właściciel: brak awarii. W ADR (d) jest pomiarem Huaweia. Ten pomiar odpada z telefonem.

(e) jest `zaliczone` na S23: dym startu i trzech motywów. Komórka Mi 11 Lite 5G zostaje pusta. (e) w ADR jest kryterium dymu na S23. Komórka Huaweia jest `pominięty`.

(c) na Mi 11 Lite 5G jest `zaliczone`, 2026-11-23. Źródło: ręczny odczyt TalkBack właściciela (Wojciech) na buildzie release, profil EAS `preview`. Fokus dochodzi do każdego przycisku motywu. Rola jest ogłaszana jako przycisk. Etykieta jest znacząca. Przycisk aktywnego motywu jest wyłączony. Podwójne stuknięcie przełącza motyw i nie gubi fokusu. Komórka S23 zostaje pusta: tego odczytu tam nie było. Huawei jest `pominięty`.

Werdykt jest `zaliczony`, bo po tych dwóch zmianach nic już nie brakuje. Reguła jest z akapitu, który wcześniej trzymał `niezmierzony`: na Mi 11 Lite 5G brakowało tylko (c), a Huawei nie był mierzony. (c) jest teraz `zaliczone` na Mi 11 Lite 5G. Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23), więc brak jego pomiaru nie jest już brakiem. Dym S23 to (a), (d) i (e), wszystkie `zaliczone`. (b) na S23 jest dymem bez progu 200 ms. (e) nie dotyczy Mi 11 Lite 5G. Pusta komórka (c) na S23 nie wchodzi w tę regułę: powód `niezmierzony` wymieniał (c) tylko przy Mi 11 Lite 5G.

Jeśli niezaliczony: przejście na Unistyles 3.8.x i aktualizacja ADR 0001.

## Spike B — dekoder

Zbudowane w module `modules/photo-decoder` i w `src/core/ai/image-preprocessing.ts`. Puste komórki zostają puste. Tych komórek nie wolno zgadywać. Liczby Mi 11 Lite 5G i S23 poniżej są z serii 10 przebiegów po trzy zdjęcia, 2026-11-22, właściciel Wojciech, build release, profil EAS `preview`. Wcześniej tego dnia na Mi 11 Lite 5G był jeden przebieg; seria go zastępuje. Kolumna Huaweia jest `pominięty`: Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). To nie są liczby.

### Co jest w buildzie

- Natywny moduł Expo (Kotlin). `decode(uri, minShortSide)` dekoduje zdjęcie z aparatu albo galerii (`file://` i `content://`) z podpróbkowaniem, tak aby krótszy bok miał co najmniej zadany próg. Od Androida 9 jest to `ImageDecoder.setTargetSize`, poniżej API 28 `inSampleSize` (potęga dwójki). Orientacja EXIF jest nakładana, bitmapa jest zwalniana od razu po skopiowaniu pikseli RGB. Wynik niesie wymiary i szczyt PSS, sterty natywnej i sterty Javy zmierzony w trakcie dekodowania.
- To samo API na iOS. Implementacji nie ma: wywołanie kończy się kodem `unsupported`.
- Próg krótszego boku bierze się z `preprocessing.decodeMinWidth` manifestu. Gdy pola nie ma, zostaje 448 px. To nie jest rozmiar wejścia modelu. Nazwa pola w szkicu schematu mówi o szerokości; spike B stosuje ją do krótszego boku.
- `image-preprocessing.ts` czyta sekcję `preprocessing`: rozmiar, kolejność kanałów, filtr, kadrowanie, zaokrąglenie, skalę i offset albo średnią i odchylenie. Rozmiar wejścia nie jest wybrany.
- Ekran deweloperski `grzybobranie://dev/decoder`, tylko w buildzie deweloperskim. Trzy zdjęcia wybiera się raz. Seria 1, 5, 10 albo 20 (domyślnie 10) powtarza ten sam przebieg po kolei. Raport ma statystyki czasu ściany, sumy dekodowania i sumy preprocessingu oraz szczyt pamięci i OOM. Można go przytrzymać (kopiowanie) albo oddać arkuszem udostępniania jako `spike-b-dekoder.txt`.

### Co gwarantuje parytet P1

P1 porównuje `preprocessImage` z `ml.preprocess.preprocess_rgb_uint8` na tych samych pikselach uint8 RGB, już po orientacji EXIF.

Gwarancja, dla przypadków `p1-preprocess-py` w `ml/fixtures/p1/parity.json`:

- geometria jest filtrem pudełkowym przy zmniejszaniu i bilinearem z centrami połowy piksela przy powiększaniu;
- krok ograniczenia szerokości jest w specyfikacji tam, gdzie organ prototypu go stosuje, i tylko zmniejsza;
- po filtrze jest zaokrąglenie połówkowe do uint8, potem normalizacja ze specyfikacji;
- różnica bezwzględna tensora float32 nie przekracza **1e-5**. Przy skali prototypu jeden poziom uint8 to około 0,0078, więc ta tolerancja oznacza zgodność uint8 co do wartości, a nie tylko „w pobliżu”.

Przypadki `p1-derived` dokładają na tej samej geometrii z `preprocess.py` normalizację `mean_std`, kolejność BGR i brak zaokrąglenia do uint8. `nearest` i `bicubic` nie są w organie prototypu: ich oczekiwane wartości liczy `scripts/generate_p1_fixtures.py`, a test Pythona sprawdza, że plik fixture jest tym, co skrypt emituje.

P1 **nie** gwarantuje:

- że dekoder JPEG Androida da te same piksele co Pillow;
- że podpróbkowanie natywne (`inSampleSize` albo `ImageDecoder`) da ten sam raster co `resize_to_width` w Pythonie. Natywny krok istnieje po to, żeby nie wczytać pełnej rozdzielczości. Dokładny resampling robi TypeScript, ale już na obrazie po podpróbkowaniu, więc duże zdjęcie z telefonu nie jest bitowo zgodne z tensorem treningowym. Domknięcie tej luki czeka na M0.

P1 jest testem Jest i `python -m unittest ml.tests.test_p1_fixtures`. Nie jest pomiarem telefonu, więc nie ma go w tabeli urządzeń.

### Jak zmierzyć na telefonie

Expo Go tego modułu nie załaduje. Liczby spike'a B mają pochodzić z release, nie z Metro. Profile EAS `development` i `preview` ustawiają `EXPO_PUBLIC_DEV_TOOLS=1` i składają APK release, więc ekran jest w telefonie. Profil `production` flagi nie dostaje, a Metro wycina `src/app/dev`.

1. Zbuduj APK: `eas build -p android --profile preview` (albo `development`) i zainstaluj je na telefonie.
2. Otwórz Ustawienia (nagłówek Dziennika, Pomocy albo Profilu, a na Atlasie przycisk w ekranie) i wejdź w „Narzędzia deweloperskie” → „Spike dekodera”. Deep link na tym buildzie: `adb shell am start -a android.intent.action.VIEW -d "grzybobranie://dev/decoder" com.grzybobranie.ai`.
3. Zrób albo wybierz **trzy** zdjęcia w pełnej rozdzielczości. Nie kadruje ich edytor, a jakość jest ustawiona na maksimum. Wybór z galerii i tak może skopiować plik; nie ustawiamy maksymalnego boku.
4. Wybierz liczbę przebiegów: 1, 5, 10 albo 20. Domyślnie 10. Naciśnij „Dekoduj serię”. Te same trzy zdjęcia idą po kolei tyle razy. W trakcie serii start jest wyłączony. „Anuluj serię” przerywa przed kolejnym przebiegiem; bieżący dobiega końca.
5. Przytrzymaj raport albo udostępnij go jako `spike-b-dekoder.txt`. Jeśli proces zniknie i raportu nie ma, w rubryce „proces ubity” wpisz „tak”.
6. Wpisz liczby poniżej.

Z raportu bierz: p95 czasu ściany do budżetu sesji ≤ 5 s, sumę dekodowania, sumę preprocessingu, szczyt PSS, szczyt sterty natywnej, linię OOM. Czas ściany to dekodowanie i preprocessing TypeScript. Inferencja modelu nie wchodzi w ten pomiar i nie jest progiem tego spike'a. Liczby w tabeli są z serii 10 przebiegów. Przy n=10 p95 (najbliższa ranga, bez interpolacji) jest równe maksimum.

| Pomiar                                           | Xiaomi Mi 11 Lite 5G                                                                                                    | Huawei P smart 2019 | Samsung S23                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| Udane / nieudane                                 | 10 / 0                                                                                                                  | pominięty           | 10 / 0                                                                   |
| Suma dekodowania trzech zdjęć (ms)               | n=10, średnia 386,4, mediana 384,0, min 375,5, max 410,8, p95 410,8                                                     | pominięty           | n=10, średnia 502,9, mediana 503,3, min 458,0, max 565,2, p95 565,2      |
| Suma preprocessingu trzech zdjęć (ms)            | n=10, średnia 798,5, mediana 798,2, min 788,0, max 811,3, p95 811,3                                                     | pominięty           | n=10, średnia 571,2, mediana 556,1, min 542,3, max 632,5, p95 632,5      |
| Czas ściany przebiegu (ms)                       | n=10, średnia 1427,2, mediana 1434,3, min 1353,3, max 1468,0, p95 1468,0                                                | pominięty           | n=10, średnia 1321,7, mediana 1295,7, min 1254,9, max 1474,0, p95 1474,0 |
| Szczyt PSS (MB)                                  | 205,7 (próg 400) — zaliczone                                                                                            | pominięty           | 208,2 — dym OK                                                           |
| Szczyt sterty natywnej (MB)                      | 105,3                                                                                                                   | pominięty           | 98,4                                                                     |
| Szczyt sterty Javy (MB)                          | 28,5                                                                                                                    | pominięty           | 29,1                                                                     |
| OOM                                              | nie                                                                                                                     | pominięty           | nie                                                                      |
| Proces ubity                                     | nie                                                                                                                     | pominięty           | nie                                                                      |
| ANR                                              | nie                                                                                                                     | pominięty           | nie                                                                      |
| Zapas na sesję 3 zdjęć ≤ 5 s p95 (Mi 11 Lite 5G) | p95 1,47 s z 5 s na dekodowanie i preprocessing; zapas ok. 3,5 s na inferencję i resztę sesji (inferencja niezmierzona) | pominięty           | nie dotyczy                                                              |

Werdykt B: `niezmierzony` (skala: `zaliczony` / `niezaliczony` / `niezmierzony`).

Na Mi 11 Lite 5G próg pamięci jest zaliczony: szczyt PSS 205,7 MB przy progu 400 MB. Seria 10 przebiegów jest w całości udana (10/0). Czas dekodowania i preprocessingu też przechodzi: p95 czasu ściany to 1,47 s z budżetu 5 s na tę część sesji. Czas ściany to dekodowanie i preprocessing TypeScript; inferencja nie wchodzi w ten pomiar. Werdykt całości zostaje `niezmierzony`, bo inferencja nie jest wliczona w budżet sesji ≤ 5 s. To czeka na model i M0. Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23) i nie jest już powodem tego werdyktu. Wcześniej powodem był też brak pomiaru Huaweia (brak OOM, brak ubicia procesu, brak ANR).

Przy n=10 p95 (najbliższa ranga, bez interpolacji) jest równe maksimum.

Preprocessing w TypeScript to około 56% czasu ściany na Mi 11 Lite 5G (798,5 ms z 1427,2 ms). To główny kandydat do optymalizacji w M0. Nie jest progiem spike'a B.

Samsung S23: seria 10/0, dym OK, bez progu pamięci i bez progu czasu. Właściciel na obu telefonach: brak nieudanych przebiegów, brak OOM, proces nieubity, brak ANR.

Na Mi 11 Lite 5G próg pamięci to 400 MB, a czas dekodowania wchodzi w budżet sesji ≤ 5 s p95. Wcześniej zaliczenie na Huaweiu to brak OOM, brak ubicia procesu i brak ANR, a czas tylko zapisujemy. Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Samsung w tym spike'u jest dymem, bez progu GPU.

### Surowy raport (Mi 11 Lite 5G, 2026-11-22)

Skrót serii 10 przebiegów po trzy zdjęcia. Wcześniejszy jeden przebieg z tego dnia jest zastąpiony i nie jest już liczbą w tabeli. Czas ściany nie obejmuje inferencji.

```
Udane: 10, nieudane: 0
Czas ściany (ms): n=10, średnia 1427,2, mediana 1434,3, min 1353,3, max 1468,0, p95 1468,0
Suma dekodowania (ms): n=10, średnia 386,4, mediana 384,0, min 375,5, max 410,8, p95 410,8
Suma preprocessingu (ms): n=10, średnia 798,5, mediana 798,2, min 788,0, max 811,3, p95 811,3
Szczyt PSS: 205,7 MB (próg 400 — zaliczone)
Szczyt sterty natywnej: 105,3 MB
Szczyt sterty Javy: 28,5 MB
OOM: nie
Proces ubity: nie
ANR: nie
```

### Surowy raport (Samsung S23, 2026-11-22)

Skrót serii 10 przebiegów po trzy zdjęcia. Dym, bez progu. Czas ściany nie obejmuje inferencji.

```
Udane: 10, nieudane: 0
Czas ściany (ms): n=10, średnia 1321,7, mediana 1295,7, min 1254,9, max 1474,0, p95 1474,0
Suma dekodowania (ms): n=10, średnia 502,9, mediana 503,3, min 458,0, max 565,2, p95 565,2
Suma preprocessingu (ms): n=10, średnia 571,2, mediana 556,1, min 542,3, max 632,5, p95 632,5
Szczyt PSS: 208,2 MB (dym OK)
Szczyt sterty natywnej: 98,4 MB
Szczyt sterty Javy: 29,1 MB
OOM: nie
Proces ubity: nie
ANR: nie
```

## Spike C — species.db i FTS5

Poza tą gałęzią (`src/core/db/TODO.md`).

| Pomiar                    | Xiaomi Mi 11 Lite 5G | Huawei P smart 2019 | Samsung S23 |
| ------------------------- | -------------------- | ------------------- | ----------- |
| Baza otwiera się z assetu |                      | pominięty           |             |
| Zapytanie FTS5            | próg poniżej 50 ms   | pominięty           | dym         |
| ANR / awaria              |                      | pominięty           |             |

Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Wcześniej spike C miał na nim sprawdzić, że zapytanie FTS5 działa, i zapisać czas. Zostają Xiaomi Mi 11 Lite 5G (próg poniżej 50 ms) i Samsung S23 (dym). Komórki tych dwóch telefonów zostają puste, dopóki nie ma pomiaru.
