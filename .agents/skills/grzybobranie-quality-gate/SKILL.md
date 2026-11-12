---
name: grzybobranie-quality-gate
description: Enforce local quality gates and zero-suppression policy for Grzybobranie AI (typecheck, lint, prettier, duplication, knip, depcruise, jest, species db).
---

# Grzybobranie AI Quality Gate

Ta umiejętność służy do weryfikacji i egzekwowania jakości kodu przed jakimkolwiek commitem lub zgłoszeniem Pull Requesta w projekcie Grzybobranie AI.

## Zasada nadrzędna: Zero Wyciszeń (Zero-Suppression)

W repozytorium obowiązuje bezwzględny zakaz:
- dodawania komentarzy wyciszających ESLint (`// eslint-disable-next-line` itp.),
- rozszerzania ignorów w `knip.json`,
- podnoszenia progu duplikacji w `.jscpd.json` (próg wynosi ściśle **1.5%**),
- luzowania reguł w `.dependency-cruiser.cjs`,
- tworzenia plików baseline dla jakichkolwiek narzędzi.

Jeśli narzędzie zgłasza błąd, problem należy naprawić w kodzie, a nie ukrywać.

## Komenda główna

Przed zakończeniem zadania ZAWSZE uruchom:
```bash
pnpm quality
```

Polecenie `pnpm quality` wykonuje sekwencję:
1. `pnpm typecheck` (`tsc --noEmit`) – brak błędów typowania TypeScript.
2. `pnpm lint` (`eslint . --max-warnings 0`) – brak jakichkolwiek błędów i ostrzeżeń ESLint.
3. `pnpm format:check` (`prettier --check .`) – pełna zgodność z konfiguracją Prettiera. Do automatycznej naprawy: `pnpm format`.
4. `pnpm duplication` (`jscpd --no-colors --config .jscpd.json`) – duplikacja tokenów poniżej 1.5%.
5. `pnpm knip` (`knip`) – brak martwego kodu, nieużywanych eksportów i zbędnych zależności.
6. `pnpm depcruise` (`depcruise src --config .dependency-cruiser.cjs`) – brak naruszeń 5 warstw architektury oraz brak zależności cyklicznych.
7. `pnpm test` (`jest --ci`) – wszystkie testy jednostkowe i komponentowe RNTL muszą przechodzić.

## Dodatkowe bramki domenowe

W zależności od zakresu zmian:
- Gdy zmieniane są źródła danych taksonomicznych lub `scripts/build-species-db.ts`:
  ```bash
  pnpm build:species
  ```
- Gdy weryfikowany jest kontrakt z modelem:
  ```bash
  python -m unittest discover -s ml/tests -v
  ```
- Gdy sprawdzana jest poprawność paczki Androida:
  ```bash
  pnpm export:android
  ```

## Typowe problemy i ich rozwiązania

- **Błąd jscpd (duplikacja kodu):** Wyekstrahuj powtarzające się fragmenty do wspólnego helpera w tej samej warstwie (np. `src/core/` lub `src/ui/`).
- **Błąd knip (nieużywany eksport):** Jeśli funkcja jest eksportowana tylko dla testów, rozważ testowanie przez publiczne API modułu lub usuń zbędny eksport.
- **Błąd depcruise (naruszenie warstwy):** Sprawdź importy. `src/core` nie może importować niczego z `src/ui`, `src/screens`, `src/app` ani `src/infra`.
