# 0006. GitHub Pages: źródło GitHub Actions

- **Status:** Wdrożona
- **Data wpisu:** 2026-10-23

## Kontekst

Strona statyczna leży w `site/`. Workflow [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) wgrywa ten katalog na GitHub Pages. Komentarz w pliku mówi, że właściciel włącza stronę w Settings → Pages → Build and deployment → Source: GitHub Actions.

[PR #61](https://github.com/lonwi/mushroom-recognition-app/pull/61) jest na `main` od 2026-10-22 (commit `51e84e1119ba9879b2b047a7eb553f6f906ef344`). Pierwszy push na `main` nie wdrożył strony: job „Configure Pages” w [runie 39858509946](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39858509946) zakończył się błędem „Get Pages site failed” z prośbą, żeby Pages było włączone i budowane przez GitHub Actions.

Lista zadań dla bota zakładała status „Oczekuje na właściciela”. Sprawdzenie GitHuba 2026-10-23 pokazuje, że ten krok już jest zrobiony.

## Opcje

- **A.** Ustawić Source na GitHub Actions, żeby workflow wdrażał `site/`.
- **B.** Zostawić Pages wyłączone albo na innym źródle.

## Rekomendacja

Boty: **A**.

## Decyzja

**A.** Źródło jest ustawione na GitHub Actions.

Nie ma osobnego komentarza właściciela z godziną kliknięcia. Widać skutek: konto `lonwi` uruchomiło `workflow_dispatch` workflow Pages, a API repozytorium podaje `build_type: workflow`.

## Data

2026-10-23, 09:40 czasu polskiego (start udanego przebiegu; 07:40 UTC).

## Uzasadnienie

Bez źródła „GitHub Actions” workflow z #61 nie potrafi odczytać witryny Pages. Po ustawieniu źródła ten sam commit `51e84e1` wdrożył się poprawnie.

## Wdrożenie

Udany przebieg: [run 39919368299](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39919368299), zdarzenie `workflow_dispatch`, aktor `lonwi`, wniosek `success`. Wdrożenie środowiska `github-pages` ma stan `success`. Adres: <https://lonwi.github.io/mushroom-recognition-app/>.

## Weryfikacja

2026-10-23: API Pages zwraca `build_type: workflow` i `public: true`. Adres strony odpowiada HTTP 200. Treść podstron nie była ponownie czytana przy tym wpisie.
