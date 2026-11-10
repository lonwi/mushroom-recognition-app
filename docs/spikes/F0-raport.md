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

Poza tą gałęzią. Moduł jeszcze nie istnieje (`modules/photo-decoder/TODO.md`).

| Pomiar                                 | Xiaomi Mi 11 | Huawei P smart 2019 |
| -------------------------------------- | ------------ | ------------------- |
| Parytet P1 na fixture'ach              |              |                     |
| Trzy zdjęcia z aparatu, szczyt pamięci | próg 400 MB  | bez OOM             |
| Czas dekodowania                       |              | bez progu           |
| Proces ubity / ANR                     |              |                     |

## Spike C — species.db i FTS5

Poza tą gałęzią (`src/core/db/TODO.md`).

| Pomiar                    | Xiaomi Mi 11       | Huawei P smart 2019 | Samsung S23 |
| ------------------------- | ------------------ | ------------------- | ----------- |
| Baza otwiera się z assetu |                    |                     |             |
| Zapytanie FTS5            | próg poniżej 50 ms | działa, czas        | dym         |
| ANR / awaria              |                    |                     |             |
