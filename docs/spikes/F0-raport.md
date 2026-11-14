# Raport spike'ów Fazy 0

Wypełnia Wojciech na telefonach. CI tego nie mierzy. Puste komórki zostają puste, dopóki nie ma pomiaru.

Telefony:

| Rola                | Telefon               | Co zapisujemy                           |
| ------------------- | --------------------- | --------------------------------------- |
| Referencyjny        | Xiaomi Mi 11 5G, 6 GB | budżety, w tym motyw ≤150 ms            |
| Najgorszy przypadek | Huawei P smart 2019   | brak awarii, OOM i ANR; czasy bez progu |
| Dym / GPU           | Samsung S23           | uruchomienie i motywy                   |

## Potwierdzenie Huaweia (Q3)

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

Kryteria z `docs/adr/0001-styling.md`. Wszystkie muszą przejść. Czas na Huaweiu nie jest progiem.

| Kryterium                                                                   | Xiaomi Mi 11 | Huawei P smart 2019 | Samsung S23 |
| --------------------------------------------------------------------------- | ------------ | ------------------- | ----------- |
| (a) release instaluje się i startuje, bez błędu Metro / Babel / Reanimated  |              |                     |             |
| (b) trzy motywy, czas do zatwierdzonej klatki (próg 150 ms tylko na Xiaomi) |              | czas, bez progu     | dym         |
| (c) `@rn-primitives`: fokus, rola, etykieta na przyciskach spike'a          |              |                     |             |
| (d) brak awarii i ANR przy przełączaniu                                     |              |                     |             |
| (e) dym: start i trzy motywy                                                |              |                     |             |
| Liczba z ekranu spike'a (ms, ostatnie przełączenie)                         |              |                     |             |

Werdykt A: `zaliczony` / `niezaliczony` / `niezmierzony`.

Jeśli niezaliczony: przejście na Unistyles 3.8.x i aktualizacja ADR 0001.

## Spike B — dekoder

Zbudowane w module `modules/photo-decoder` i w `src/core/ai/image-preprocessing.ts`. Pomiar na telefonie jest pusty, dopóki nie wpiszesz liczb z urządzenia. Tych komórek nie wolno zgadywać.

### Co jest w buildzie

- Natywny moduł Expo (Kotlin). `decode(uri, minShortSide)` dekoduje zdjęcie z aparatu albo galerii (`file://` i `content://`) z podpróbkowaniem, tak aby krótszy bok miał co najmniej zadany próg. Od Androida 9 jest to `ImageDecoder.setTargetSize`, poniżej API 28 `inSampleSize` (potęga dwójki). Orientacja EXIF jest nakładana, bitmapa jest zwalniana od razu po skopiowaniu pikseli RGB. Wynik niesie wymiary i szczyt PSS, sterty natywnej i sterty Javy zmierzony w trakcie dekodowania.
- To samo API na iOS. Implementacji nie ma: wywołanie kończy się kodem `unsupported`.
- Próg krótszego boku bierze się z `preprocessing.decodeMinWidth` manifestu. Gdy pola nie ma, zostaje 448 px. To nie jest rozmiar wejścia modelu. Nazwa pola w szkicu schematu mówi o szerokości; spike B stosuje ją do krótszego boku.
- `image-preprocessing.ts` czyta sekcję `preprocessing`: rozmiar, kolejność kanałów, filtr, kadrowanie, zaokrąglenie, skalę i offset albo średnią i odchylenie. Rozmiar wejścia nie jest wybrany.
- Ekran deweloperski `grzybobranie://dev/decoder`, tylko w buildzie deweloperskim. Trzy zdjęcia, dekodowanie po kolei, czas każdego i łącznie, szczyt pamięci, OOM. Raport można przytrzymać (kopiowanie) albo oddać arkuszem udostępniania.

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

Expo Go tego modułu nie załaduje. Potrzebny jest build deweloperski z kodem natywnym. Paczka release wycina `src/app/dev`, więc deep link spike'a działa tylko w `__DEV__`.

1. Podłącz telefon, włącz debugowanie USB.
2. Z katalogu repozytorium: `pnpm android` (`expo run:android`). To kompiluje moduł i instaluje aplikację.
3. Gdy APK jest już zbudowane, powtórna instalacja: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
4. Otwórz ekran: `adb shell am start -a android.intent.action.VIEW -d "grzybobranie://dev/decoder" com.grzybobranie.ai`. Ten sam ekran jest w Ustawieniach jako „Spike dekodera”.
5. Zrób albo wybierz **trzy** zdjęcia w pełnej rozdzielczości. Nie kadruje ich edytor, a jakość jest ustawiona na maksimum. Wybór z galerii i tak może skopiować plik; nie ustawiamy maksymalnego boku.
6. Naciśnij „Dekoduj trzy zdjęcia”. Zdjęcia idą po kolei. Przytrzymaj raport albo udostępnij go jako `spike-b-dekoder.txt`.
7. Wpisz liczby poniżej. Jeśli proces zniknie i raportu nie ma, w rubryce „proces ubity” wpisz „tak”.

Z raportu bierz: sumę dekodowania, czas ściany przebiegu, szczyt PSS, szczyt sterty natywnej, linię OOM. Czas preprocessingu TypeScript jest w raporcie osobno i nie jest progiem tego spike'a.

| Pomiar                                    | Xiaomi Mi 11 | Huawei P smart 2019 | Samsung S23 |
| ----------------------------------------- | ------------ | ------------------- | ----------- |
| Suma dekodowania trzech zdjęć (ms)        |              |                     |             |
| Czas ściany przebiegu (ms)                |              |                     |             |
| Szczyt PSS (MB)                           | próg 400     | bez OOM             | dym         |
| Szczyt sterty natywnej (MB)               |              |                     |             |
| OOM                                       |              |                     |             |
| Proces ubity                              |              |                     |             |
| ANR                                       |              |                     |             |
| Zapas na sesję 3 zdjęć ≤ 5 s p95 (Xiaomi) |              | nie dotyczy         | nie dotyczy |

Werdykt B: `zaliczony` / `niezaliczony` / `niezmierzony`.

Na Xiaomi próg pamięci to 400 MB, a czas dekodowania wchodzi w budżet sesji ≤ 5 s p95. Na Huaweiu zaliczenie to brak OOM, brak ubicia procesu i brak ANR. Czas Huaweia tylko zapisujemy. Samsung w tym spike'u jest dymem, bez progu GPU.

## Spike C — species.db i FTS5

Poza tą gałęzią (`src/core/db/TODO.md`).

| Pomiar                    | Xiaomi Mi 11       | Huawei P smart 2019 | Samsung S23 |
| ------------------------- | ------------------ | ------------------- | ----------- |
| Baza otwiera się z assetu |                    |                     |             |
| Zapytanie FTS5            | próg poniżej 50 ms | działa, czas        | dym         |
| ANR / awaria              |                    |                     |             |
