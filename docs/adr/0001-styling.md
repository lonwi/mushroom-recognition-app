# ADR 0001 — stylowanie na SDK 58

- Status: **proposed**
- Data: 2026-11-10
- Decyzja: D-03

## Kontekst

Tokeny Pileus w `src/ui/tokens.ts` są jedynym źródłem kolorów, siatki 8 i pól 48 dp. Biblioteka stylów jest osobnym wyborem. Plan A to NativeWind 4.2.7. Plan B to Unistyles 3.8.x, gdy NativeWind w ogóle nie buduje się na SDK 58.

## Co jest w tej gałęzi

NativeWind 4.2.7 stoi na tokenach: `themeVars()` wstawia kolory jako zmienne, a klasy (`bg-paper`, `text-ink`) je czytają. `react-native-css-interop` jest zależnością bezpośrednią, bo pnpm nie wynosi jej z NativeWind, a Metro szuka `react-native-css-interop/jsx-runtime`. Ekran deweloperski `src/app/dev/styling.tsx` przełącza trzy motywy i mierzy czas do drugiej klatki (`requestAnimationFrame` dwa razy). W paczce produkcyjnej Metro pomija `src/app/dev`, gdy `NODE_ENV=production` i nie ma `EXPO_PUBLIC_DEV_TOOLS=1` (tak robi krok eksportu w CI). Profile EAS development i preview ustawiają tę flagę, więc spike zostaje w release na telefonie. Gdy plik wejdzie do bundla bez flagi, ekran robi `Redirect` na `/`, więc `grzybobranie://dev/styling` nie otwiera spike'a. Przyciski motywu na tym ekranie są prymitywem `@rn-primitives/slot` (`Pressable`) z rolą, etykietą i stanem `selected`.

Werdykt spike'a A jest w `docs/spikes/F0-raport.md`. Od 2026-11-23 jest `zaliczony`. Status tego ADR zostaje `proposed`. Przejście na `accepted` jest osobnym wpisem. Pominięcie (d) nie jest tym wpisem.

## Zmiana progu (2026-11-22)

Próg (b) na telefonie referencyjnym zmienia się ze 150 ms na 200 ms. Decyzja właściciela po pomiarach na Xiaomi Mi 11 Lite 5G: czas poniżej 200 ms jest wystarczający. Zdanie sprzed 2026-11-23: Huawei nadal zapisuje czas bez progu.

## Pominięcie Huaweia i odczyt (c) (2026-11-23)

Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23). Kryterium (d) było pomiarem tego telefonu i odpada razem z nim. Wiersz (d) zostaje w tabeli, oznaczony jako pominięty.

(c) jest zaliczone na Xiaomi Mi 11 Lite 5G. Właściciel (Wojciech) sprawdził TalkBack na przyciskach motywu spike'a stylowania (build release, profil EAS `preview`): fokus dochodzi do każdego przycisku, rola jest ogłaszana jako przycisk, etykieta jest znacząca, przycisk aktywnego motywu jest wyłączony, podwójne stuknięcie przełącza motyw i nie gubi fokusu.

## Kryteria zaliczenia

Wszystkie są wymagane, poza (d). Od 2026-11-23 (d) jest pominięte i nie blokuje spike'a. Porażka któregoś z pozostałych oznacza przejście na Unistyles 3.8.x na tych samych tokenach.

|     | Kryterium                                                                                                                                                   | Gdzie                                                              | Stan w CI                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| (a) | Build release na SDK 58 bez błędów Metro, Babel i Reanimated 4.7                                                                                            | telefon, `expo run:android --variant release`                      | CI składa tylko paczkę JS (`expo export --platform android`). To nie jest build release.         |
| (b) | Przełączenie 3 motywów ≤200 ms do zatwierdzonej klatki                                                                                                      | Xiaomi Mi 11 Lite 5G, telefon referencyjny                         | Liczba na ekranie spike'a jest pomiarem JS do drugiej klatki. Nie zastępuje nagrania z telefonu. |
| (c) | Działające `@rn-primitives`: fokus, rola, etykieta                                                                                                          | Xiaomi Mi 11 Lite 5G, przyciski spike'a. Wcześniej: trzy telefony. | TalkBack na Mi 11 Lite 5G zaliczony 2026-11-23. W kodzie rola i etykieta są ustawione.           |
| (d) | Huawei P smart 2019: release instaluje się i startuje. Przełączenie motywów bez awarii i bez klatek prowadzących do ANR. Czas zapisujemy, nie jest progiem. | Huawei — pominięty decyzją właściciela (2026-11-23)                | Niemierzalne w CI. Pominięte, nie mierzone.                                                      |
| (e) | Samsung S23: uruchomienie i motywy (dym)                                                                                                                    | S23                                                                | Niemierzalne w CI.                                                                               |

## Czego CI nie rozstrzyga

- Czasu do zatwierdzonej klatki na Xiaomi Mi 11 Lite 5G.
- Braku ANR i gubienia klatek na Huaweiu. Huawei P smart 2019 pominięty decyzją właściciela (2026-11-23), więc tego punktu już się nie mierzy.
- Dymu na S23.
- Tego, czy natywny build release przechodzi przez Gradle. W CI nie ma kompilacji APK: runner nie dostaje tu stabilnego, krótkiego buildu Androida dla świeżego prebuildu RN 0.88. Zamiast tego jest `expo config` i eksport paczki JS, który łapie błędy Metro, Babel i NativeWind.

Gdy (a), (b), (c) i (e) są zaliczone, a (d) jest pominięte, raport spike'a może być `zaliczony`. Status `accepted` w tym pliku zostaje do osobnego wpisu. Gdy któreś z wymaganych kryteriów padnie, implementacja przechodzi na Unistyles i ten plik opisuje powód.
