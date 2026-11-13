---
name: grzybobranie-pr-review
description: Self-review and automated PR review checklist for Grzybobranie AI based on AGENTS.md rules.
---

# Grzybobranie AI PR Review Guide

Przed utworzeniem Pull Requesta (lub w trakcie jego recenzji przez agenta AI) należy bezwzględnie zweryfikować poniższą listę kontrolną.

## 1. Gałąź docelowa i historia Git

- [ ] **Baza PR to `rewrite/greenfield`**: Pull Request **nigdy** nie może celować w gałąź `main` (jest to zamrożony prototyp).
- [ ] **Nazwa gałęzi roboczej**: `feat/...`, `fix/...`, `chore/...` lub `cursor/...`.
- [ ] **Format commitów**: Conventional Commits w języku angielskim, np. `feat(atlas): add filter chips for edibility`, `fix(ui): correct season badge contrast`.

## 2. Bramki jakości (Zero wyciszeń)

- [ ] `pnpm quality` przechodzi bezbłędnie (0 błędów, 0 ostrzeżeń).
- [ ] Brak nowych wyciszeń ESLint (`eslint-disable`).
- [ ] Brak dodanych wpisów `ignore` w `knip.json` lub `.jscpd.json`.
- [ ] Brak wyciszeń w `.dependency-cruiser.cjs`.

## 3. Integralność architektury

- [ ] `src/core/` zawiera wyłącznie czysty TypeScript (brak importów `react`, `react-native`, `expo`).
- [ ] Brak `Platform.OS` i `Platform.select` poza katalogiem `src/infra/platform/`.
- [ ] Brak platformowych API takich jak `ToastAndroid`, `BackHandler` – użyte uniwersalne moduły Expo.
- [ ] `SafeAreaView` zaimportowany z `react-native-safe-area-context`.

## 4. Bezpieczeństwo i domena

- [ ] Model ML nie posiada wyjścia jadalności.
- [ ] Status `CONDITIONALLY_EDIBLE` nie posiada zielonego koloru ani przepisów obróbki cieplnej.
- [ ] Wszystkie zdjęcia w UI mają licencję CC0 lub CC BY wraz z autorem i źródłem.
- [ ] Nowe teksty dla użytkownika dodane są do `src/core/i18n/pl.ts` (i zsynchronizowane z `en.ts`).
- [ ] Teksty w UI nie są hardkodowane w widokach (używany jest słownik i18n).

## 5. Testy

- [ ] Dodano testy jednostkowe lub komponentowe dla nowego kodu.
- [ ] Wszystkie istniejące testy przechodzą (`jest --ci`).
