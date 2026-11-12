---
name: grzybobranie-layer-guardrails
description: Architectural layers, dependency rules, and platform isolation for Grzybobranie AI (app, screens, ui, core, infra, platform adapters).
---

# Grzybobranie AI Layer Guardrails

Projekt opiera się na 5 ściśle izolowanych warstwach architektonicznych. Reguły te są wymuszane przez `dependency-cruiser` (`.dependency-cruiser.cjs`) oraz dedykowane reguły ESLint (`eslint.config.mjs`).

## Diagram zależności warstw

```
src/app/          (Trasy Expo Router)
   │
   ▼
src/screens/      (Widoki ekranów i stan lokalny)
   │
   ├──► src/ui/       (Tokeny Pileus, komponenty czysto prezentacyjne bez I/O)
   ├──► src/core/     (Domena: czysty TypeScript, reguły biznesowe, i18n, zero React)
   └──► src/infra/    (Adaptery platformowe: SQLite, pliki, kv-store, share sheet)
```

## Zasady poszczególnych warstw

| Warstwa | Ścieżka | Uprawnienia i ograniczenia |
|---|---|---|
| **Trasy** | `src/app/` | Tylko routing Expo Router. Składa ekrany z `src/screens/`, `src/ui/`, `src/core/`, `src/infra/`. Żadnej logiki biznesowej. |
| **Ekrany** | `src/screens/` | Kompozycja widoków ekranu. Woła `ui`, `core`, `infra`. **Nie wolno** importować z `src/app/`. |
| **UI** | `src/ui/` | Tokeny Pileus (`tokens.ts`), prymitywy widoków bez I/O. **Nie wolno** importować z `src/app/`, `src/screens/`, `src/infra/`. |
| **Domena (Core)** | `src/core/` | Logika biznesowa, i18n, schematy, ring log, obliczenia. **Czysty TypeScript!** Bezwzględny zakaz importowania `react`, `react-native`, `expo`, `src/ui`, `src/screens`, `src/app`, `src/infra`. |
| **Infrastruktura** | `src/infra/` | Implementacje adapterów I/O (SQLite, kv-store, pliki, platforma). **Nie wolno** importować z `src/app/`, `src/screens/`, `src/ui/`. |

## Izolacja platformy (Platform Guardrail - Q13)

1. `Platform.OS` oraz `Platform.select` są dozwolone **wyłącznie** w katalogu `src/infra/platform/`. Wszelkie inne wystąpienia w `src/` zakończą się błędem ESLint (`no-restricted-syntax`).
2. API dostępne wyłącznie na jednej platformie (np. `BackHandler`, `ToastAndroid`, `ActionSheetIOS`) są bezwzględnie zakazane. Zamiast nich używamy modułów Expo (`expo-camera`, `expo-sqlite`, `expo-file-system`, itp.).
3. `SafeAreaView` importujemy **zawsze** z `'react-native-safe-area-context'`, nigdy z `'react-native'`.

## Lokalizacja testów

- Testy jednostkowe funkcji i modułów domenowych: kolokowane obok testowanego pliku (`plik.test.ts`).
- Testy komponentów React Native Testing Library: `src/components/__tests__/` lub obok komponentu (`Komponent.test.tsx`).
- Testy tras: `src/*-route.test.tsx`.
