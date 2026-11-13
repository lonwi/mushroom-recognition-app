## Opis zmian

<!-- Krótki opis problemu, kontekstu oraz wprowadzonych zmian. -->

## Typ zmiany

- [ ] `feat`: Nowa funkcjonalność
- [ ] `fix`: Naprawa błędu
- [ ] `refactor`: Refaktoryzacja kodu bez zmiany zachowania
- [ ] `docs`: Zmiany w dokumentacji
- [ ] `test`: Dodanie lub poprawa testów
- [ ] `chore`: Zmiany w konfiguracji, zależnościach, buildzie

## Checklista zgodności z AGENTS.md

- [ ] **Baza gałęzi:** PR celuje w gałąź `rewrite/greenfield` (NIGDY w `main`).
- [ ] **Konwencja commitów:** Tytuł i commity w stylu Conventional Commits w języku angielskim.
- [ ] **Bramki jakości (`pnpm quality`):**
  - [ ] `tsc --noEmit` przechodzi bez błędów.
  - [ ] ESLint przechodzi z `--max-warnings 0` (brak `eslint-disable`).
  - [ ] Prettier przechodzi (`pnpm format:check`).
  - [ ] Duplikacja kodu `jscpd` poniżej 1.5%.
  - [ ] `knip` nie zgłasza nieużywanych eksportów.
  - [ ] `depcruise` nie zgłasza naruszeń warstw ani cykli.
  - [ ] Wszystkie testy `jest --ci` przechodzą.
- [ ] **Zero wyciszeń:** Nie dodano baseline'ów ani ignorów do knip, jscpd, eslint czy dependency-cruiser.
- [ ] **Czystość warstw:**
  - [ ] `src/core/` to czysty TypeScript (bez importów `react`, `react-native`, `expo`).
  - [ ] `Platform.OS` i `Platform.select` występują wyłącznie w `src/infra/platform/`.
  - [ ] `SafeAreaView` zaimportowany z `react-native-safe-area-context`.
- [ ] **Bezpieczeństwo i domena:**
  - [ ] Model nie orzeka o jadalności (jadalność pochodzi wyłącznie z bazy gatunków).
  - [ ] `CONDITIONALLY_EDIBLE` nie posiada zielonego koloru ani instrukcji obróbki kulinarnej.
  - [ ] Zdjęcia w UI posiadają licencję CC0 lub CC BY z pełną atrybucją.
  - [ ] Nowe teksty UI dodano do słownika `src/core/i18n/pl.ts`.
