# 0014. Poniedziałkowe przeglądy SOLID/DRY i bezpieczeństwa

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

`docs/QUALITY.md` (sekcja „Weekly reviews”) opisuje dwa automatyczne przeglądy w każdy poniedziałek rano, czas Europa/Warszawa, na `main`:

- przegląd kodu pod SOLID/DRY,
- przegląd bezpieczeństwa (zależności npm i Pythona, CI/CD, uprawnienia i dane aplikacji, potok treningu, nowy kod).

Każdy ma dać raport z porównaniem do poprzedniego tygodnia. Poprawki z tych przeglądów startują dopiero po OK właściciela.

W `.github/workflows/` nie ma workflow z harmonogramem `cron` pod te przeglądy. Są CI, Pages, Release i Dependabot. W historii Actions do 2026-10-23 nie ma przebiegu o takiej nazwie. Przebieg z poniedziałku 2026-10-19 nie powstał w GitHub Actions tego repozytorium. W tym git nie widać wyzwalacza, który odpaliłby przegląd 26.10.2026. Samo odczekanie tej daty nic nie uruchomi.

## Opcje

- **A.** Naprawić harmonogram i poczekać na przebieg 26.10.2026.
- **B.** Uruchomić oba przeglądy ręcznie teraz.

## Rekomendacja

Brak. Czekanie na 26.10 bez naprawy harmonogramu nic nie da, więc nie ma podstaw, żeby rekomendować samo odczekanie. Wybór między naprawą harmonogramu a ręcznym przebiegiem zostaje przy właścicielu.

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
