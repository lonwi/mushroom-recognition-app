# 0017. React Doctor

- **Status:** Zatwierdzona, czeka na wdrożenie
- **Data wpisu:** 2026-10-23

## Kontekst

Skille `react-doctor`, `improve-react` i `performance` są we wspólnej bibliotece botów.

PR Review uruchamia `npx react-doctor@latest --scope changed --no-score` w review pull requestów z kodem React Native.

`main` po [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75) to squash [`30165b7569307de4db3b160cdc6ef7dcefae31e6`](https://github.com/lonwi/mushroom-recognition-app/commit/30165b7569307de4db3b160cdc6ef7dcefae31e6).

## Opcje

- **A.** Audyt `main` przez `improve-react`. Raport z priorytetami. Poprawki osobnymi PR-ami po OK Wojtka.
- **B.** A plus React Doctor w CI jako krok informacyjny.
- **C.** Na razie nic.

## Rekomendacja

Brak.

## Decyzja

**A** (2026-10-23, 16:35). Audyt `main` przez `improve-react`, raport z priorytetami, poprawki osobnymi PR-ami dopiero po OK Wojtka.

Odrzucone: **B** (React Doctor w CI jako krok informacyjny) i **C** (na razie nic).

PR Review dalej uruchamia `npx react-doctor@latest --scope changed --no-score` przy review PR-ów z kodem React Native. Ta decyzja nie dokłada React Doctora do CI.

**Zakres poprawek, wariant B raportu** (2026-10-23, 17:25). Wojtek wybrał z raportu Quality (71/100) pozycje HIGH 1–3 i Error Boundary oraz MEDIUM 4–7. Każda pozycja to osobny mały PR. To nie jest opcja B z 16:35. React Doctor nadal nie wchodzi do CI.

1. `key={species.id}` na `SpeciesDetailScreen`.
2. `onRequestClose` w `ResultModal`.
3. a11y migawki, latarki i galerii w skanerze.
4. `useEffectEvent` w `useHardwareBack` i usunięcie `stackRef`.
5. Dziennik na `FlatList`.
6. Role `tab` / `tablist` i `selected` w dolnym pasku.
7. `accessibilityRole="alert"` na banerze weryfikacji eksperta, bez zmiany treści.

Do tego Error Boundary wokół treści w `App.tsx`.

Teksty bezpieczeństwa bez zmian. Pozycje LOW 8+ nie wchodzą w zakres.

## Data

Audyt: 2026-10-23, 16:35 czasu polskiego.
Zakres poprawek: 2026-10-23, 17:25 czasu polskiego.

## Uzasadnienie

Właściciel chciał najpierw raport z priorytetami dla całego `main`, a poprawki dopiero po swoim OK. O 17:25 zatwierdził zakres B z raportu Quality: HIGH 1–3, Error Boundary i MEDIUM 4–7, każdą pozycję osobnym małym PR. Nie bierze LOW 8+ i nie zmienia tekstów bezpieczeństwa. Kroku React Doctor w CI nie chce.

## Wdrożenie

Audyt `main` (`30165b7`) skillem `improve-react` jest zrobiony. Raport Quality ma wynik 71/100. Poprawek z listy powyżej w kodzie jeszcze nie ma. Każda pozycja, łącznie z Error Boundary, czeka na osobny mały PR. Pełnej treści raportu w tym pliku nie ma.

Na obecnym kodzie: `SpeciesDetailScreen` w `shellScreens` (`App.tsx`) nie ma `key={species.id}`. `ResultModal` otwiera `Modal` bez `onRequestClose`. Migawka, latarka i galeria w `ScannerScreen` nie mają ról dostępności. `stackRef` jest w `AppContent` i zasila `useHardwareBack`. Dziennik w `JournalScreen` jest na `ScrollView`. Dolny pasek w `App.tsx` nie ma ról `tab` / `tablist`. Baner weryfikacji eksperta w `RecognitionSummary` (`testID` `expert-verification-banner`) nie ma `accessibilityRole="alert"`. Error Boundary wokół treści w `App.tsx` nie ma.

## Weryfikacja

Decyzja z 16:35 i zakres z 17:25 są w tym wpisie. Wynik 71/100 i numery pozycji są z raportu Quality podanego przez koordynatora. Pliku raportu w repozytorium nie ma. Miejsca w kodzie z listy powyżej sprawdzone: poprawki jeszcze nie weszły.
