# ADR 0001 — stylowanie na SDK 58

- Status: **proposed**
- Data: 2026-11-10
- Decyzja: D-03

## Kontekst

Tokeny Pileus w `src/ui/tokens.ts` są jedynym źródłem kolorów, siatki 8 i pól 48 dp. Biblioteka stylów jest osobnym wyborem. Plan A to NativeWind 4.2.7. Plan B to Unistyles 3.8.x, gdy NativeWind w ogóle nie buduje się na SDK 58.

## Co jest w tej gałęzi

NativeWind 4.2.7 stoi na tokenach: `themeVars()` wstawia kolory jako zmienne, a klasy (`bg-paper`, `text-ink`) je czytają. `react-native-css-interop` jest zależnością bezpośrednią, bo pnpm nie wynosi jej z NativeWind, a Metro szuka `react-native-css-interop/jsx-runtime`. Ekran deweloperski `src/app/dev/styling.tsx` przełącza trzy motywy i mierzy czas do drugiej klatki (`requestAnimationFrame` dwa razy). Przyciski motywu na tym ekranie są prymitywem `@rn-primitives/slot` (`Pressable`) z rolą, etykietą i stanem `selected`.

To nie zamyka spike'a. Status zostaje `proposed`, dopóki Wojciech nie zmierzy kryteriów na telefonach.

## Kryteria zaliczenia

Wszystkie są wymagane. Porażka któregokolwiek oznacza przejście na Unistyles 3.8.x na tych samych tokenach.

|     | Kryterium                                                                                                                                                   | Gdzie                                         | Stan w CI                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| (a) | Build release na SDK 58 bez błędów Metro, Babel i Reanimated 4.7                                                                                            | telefon, `expo run:android --variant release` | CI składa tylko paczkę JS (`expo export --platform android`). To nie jest build release.         |
| (b) | Przełączenie 3 motywów ≤150 ms do zatwierdzonej klatki                                                                                                      | Xiaomi Mi 11, telefon referencyjny            | Liczba na ekranie spike'a jest pomiarem JS do drugiej klatki. Nie zastępuje nagrania z telefonu. |
| (c) | Działające `@rn-primitives`: fokus, rola, etykieta                                                                                                          | trzy telefony, przyciski na ekranie spike'a   | W kodzie rola i etykieta są ustawione. Fokus i czytnik ekranu wymagają telefonu.                 |
| (d) | Huawei P smart 2019: release instaluje się i startuje. Przełączenie motywów bez awarii i bez klatek prowadzących do ANR. Czas zapisujemy, nie jest progiem. | Huawei                                        | Niemierzalne w CI.                                                                               |
| (e) | Samsung S23: uruchomienie i motywy (dym)                                                                                                                    | S23                                           | Niemierzalne w CI.                                                                               |

## Czego CI nie rozstrzyga

- Czasu do zatwierdzonej klatki na Xiaomi.
- Braku ANR i gubienia klatek na Huaweiu.
- Dymu na S23.
- Tego, czy natywny build release przechodzi przez Gradle. W CI nie ma kompilacji APK: runner nie dostaje tu stabilnego, krótkiego buildu Androida dla świeżego prebuildu RN 0.88. Zamiast tego jest `expo config` i eksport paczki JS, który łapie błędy Metro, Babel i NativeWind.

Gdy (a)–(e) przejdą, status tego ADR zmienia się na `accepted`. Gdy którekolwiek padnie, implementacja przechodzi na Unistyles i ten plik opisuje powód.
