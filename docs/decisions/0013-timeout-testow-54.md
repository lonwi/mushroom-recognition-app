# 0013. Timeout 15 s w testach ekranów (#54)

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

[PR #54](https://github.com/lonwi/mushroom-recognition-app/pull/54) jest otwarty jako szkic. Head: `998d269680f534d6b0573c8485c5e094bbecbf13` (2026-10-22). Tytuł: „test: per-file 15s timeout for cold-cache screen tests”.

Domyślny limit Jesta to 5 s. CI trzyma `.cache/jest` pod kluczem z `pnpm-lock.yaml`. PR, który zmienia lockfile, startuje z zimnym cache transformacji. Pierwszy test na zimnym workerze płaci za kompilację React Native Paper i modułu ekranu, i ten czas liczy się do limitu testu. `ResultModal.test.tsx` już woła `jest.setTimeout(15000)` z tego samego powodu.

PR dopisuje to samo wywołanie tylko w:

- `src/__tests__/screens/AtlasScreen.test.tsx`
- `src/__tests__/screens/SpeciesDetailScreen.test.tsx`

Nie dodaje `testTimeout` w `jest.config.js`. Inne pliki dalej kończą się przy 5 s. Opis PR podaje pomiary: przy pełnej suicie na zimno Atlas i karta gatunku zbliżają się do 5 s, a Journal i Scanner nie. Samotne uruchomienie pliku jest wolniejsze także dla Journal i Scanner, ale to koszt startu, którego równoległa suita CI nie pokazuje. Timeout 15 s na tych dwóch plikach ukryłby przyszły wolny test.

CI na tym headzie jest zielone (Actions [run 39835807095](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39835807095): check, Code quality, python, End-to-end). W API recenzji GitHuba nie ma review. `reviewDecision` jest pusty.

Head jest z 2026-10-22. Od tego czasu na `main` weszły między innymi #60, #66, #67, #68, #69 i #72. Przed mergem gałąź trzeba złożyć z aktualnym `main`. Samo OK nie aktualizuje diffu.

PR nie zamyka issue. W opisie jest follow-up w [#50](https://github.com/lonwi/mushroom-recognition-app/issues/50).

## Opcje

- **A.** Zmergować po review i po złożeniu z aktualnym `main`.
- **B.** Zamknąć bez merge. Zostaje limit 5 s także dla Atlasu i karty gatunku.

## Rekomendacja

Brak rekomendacji botów co do merge. PR czeka na review i na OK właściciela. `docs/QUALITY.md`: PR agenta Quality wchodzi dopiero po wyraźnym OK właściciela. Ten PR dotyka konfiguracji testów, nie treści bezpieczeństwa.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak. Zmiana jest tylko na gałęzi PR #54.

## Weryfikacja

—
