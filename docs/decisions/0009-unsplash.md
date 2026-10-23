# 0009. Unsplash

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

Aplikacja i potok treningu nie pobierają zdjęć z Unsplash. Jedyny ślad to adresy w testach, które mają **nie** pojawić się jako wynik skanu (`src/__tests__/components/ResultModal.test.tsx`, `src/__tests__/screens/ScannerScreen.test.tsx`). To atrapa URI, nie integracja.

Źródła zdjęć na `main` to GBIF (CC0 i CC BY) oraz, gdy ktoś uruchomi importer, zewnętrzne CSV. Reguły licencji: [0004](0004-licencje-zdjec.md).

## Opcje

- **A.** Tylko oficjalne API Unsplash, a gatunek na zdjęciu sprawdza człowiek, zanim wiersz wejdzie do treningu.
- **B.** Nie używać Unsplash.

## Rekomendacja

Boty: **A**.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak.

## Weryfikacja

—
