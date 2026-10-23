# 0014. Poniedziałkowe przeglądy SOLID/DRY i bezpieczeństwa

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

`docs/QUALITY.md` (sekcja „Weekly reviews”) opisuje dwa automatyczne przeglądy w każdy poniedziałek rano, czas Europa/Warszawa, na `main`:

- przegląd kodu pod SOLID/DRY,
- przegląd bezpieczeństwa (zależności npm i Pythona, CI/CD, uprawnienia i dane aplikacji, potok treningu, nowy kod).

Każdy ma dać raport z porównaniem do poprzedniego tygodnia. Poprawki z tych przeglądów startują dopiero po OK właściciela.

W `.github/workflows/` nie ma workflow z harmonogramem `cron` pod te przeglądy. Są CI, Pages, Release i Dependabot. W historii Actions do 2026-10-23 nie ma przebiegu o takiej nazwie. Przebieg z poniedziałku 2026-10-19 nie powstał w GitHub Actions tego repozytorium. Jeśli harmonogram żyje poza repozytorium, w tym git go nie widać.

Następny poniedziałek po 19.10.2026 to 26.10.2026. Samo odczekanie tej daty nie utworzy przebiegu, dopóki nie ma harmonogramu w miejscu, które naprawdę uruchamia przeglądy.

## Opcje

- **A.** Poczekać na przebieg 26.10.2026.
- **B.** Uruchomić oba przeglądy ręcznie teraz.

## Rekomendacja

Boty: **A**.

Przy A trzeba wiedzieć, co ma odpalić przebieg 26.10. W tym repozytorium takiego wyzwalacza nie ma.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak. Opis jest w `docs/QUALITY.md`. Przebiegu z 2026-10-19 nie ma.

## Weryfikacja

—
