# 0002. https `license_url`, surowsza licencja duplikatu i trening

- **Status:** Wdrożona (trening w toku)
- **Data wpisu:** 2026-10-23

## Kontekst

[PR #72](https://github.com/lonwi/mushroom-recognition-app/pull/72) zacieśnia import zewnętrznych CSV po [#68](https://github.com/lonwi/mushroom-recognition-app/pull/68). Nie obniża progów wydania.

Na `main` po merge działa tak:

- Wiersz zdjęcia odpada, gdy `license_url` jest pusty, nie jest `https://`, albo wskazuje inną licencję niż tekst. Dotyczy to także tekstu `CC BY 4.0`. Adres `http://` nie jest podmieniany na https po to, żeby wiersz przeszedł.
- Odrzucenie licencji zapisuje klucze zdjęcia. Każda inna kopia tego zdjęcia też odpada (`dropped_rejected_license_copy`).
- To samo zdjęcie z dwóch licencji zostawia surowszą: NC i DF20 ponad CC BY, CC BY ponad CC0, w obu kolejnościach wejścia. Atrybucja CC BY zostaje.
- Wiersz Commons łączy się z kopią iNaturalist tylko przy wspólnym `inat_photo_id`. Opis pliku Commons nie jest czytany. Dalszy krok jest w [issue #73](https://github.com/lonwi/mushroom-recognition-app/issues/73).
- DF20 zostaje poza zdjęciami pokazywanymi w aplikacji. Bramka atrybucji na tym `main` blokuje model wydaniowy z wierszami `training_only`. To jest stan `main` sprzed [0004](0004-licencje-zdjec.md). Od 0004 model wydawany w aplikacji może być uczony na zdjęciach `training_only` (CC BY-NC, DF20, CC BY-SA). Zmiana bramki jest w wdrożeniu 0004, w PR Trenowania.

Przed decyzją PR był po poprawkach z review. Head: `1ede149b4bc03b0114984d0b4e6f0d8887e514e0`. PR Review i Quality dały approve. CI na tym headzie było zielone (Actions [run 39935100727](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39935100727): check, Code quality, python, End-to-end). Zostało OK właściciela.

## Opcje

- **A.** Zmergować i puścić pełny trening na GPU Wojciecha, bez zewnętrznych CSV.
- **B.** Zmergować, a trening zrobić później.
- **C.** Wstrzymać PR.

## Rekomendacja

Boty: **A**.

## Decyzja

Właściciel, 2026-10-23: **A**. Merge i pełny trening na jego GPU, bez zewnętrznych CSV.

## Data

2026-10-23, 11:55 czasu polskiego.

## Uzasadnienie

Właściciel wybrał rekomendowaną opcję A i doprecyzował, że ten przebieg treningu nie bierze zewnętrznych CSV.

## Wdrożenie

[PR #72](https://github.com/lonwi/mushroom-recognition-app/pull/72) zmergowany 2026-10-23 o 11:56 czasu polskiego jako [`1e6f6e76b241c34329d4805dc89107486a24c313`](https://github.com/lonwi/mushroom-recognition-app/commit/1e6f6e76b241c34329d4805dc89107486a24c313).

Trening na GPU Wojciecha, bez zewnętrznych CSV, jest w toku. Nie ma go w tym repozytorium.

## Weryfikacja

Merge sprawdzony na GitHubie: `state` PR to `MERGED`, `mergeCommit` to `1e6f6e76b241c34329d4805dc89107486a24c313`, `mergedAt` to 2026-10-23T09:56:00Z (11:56 czasu polskiego). `origin/main` wskazuje ten commit.

Przebieg treningu nie był sprawdzany. Nie ma go w git.
