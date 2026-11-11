# Faza 1: kanon gatunków i `species.db`

Baza jest tylko do odczytu. Buduje ją `pnpm build:species` przez `node:sqlite`. Plik `assets/db/species.db` jest artefaktem CI i nie wchodzi do gita. Zdjęcia kart też nie.

## Co jest w bazie

- 67 klas z `data/sources/pokrycie-67.csv`. Każda ma wiersz w `model_class_species`.
- Karty dawcy z tagu `prototype-final` (`src/data/mushrooms.ts`, commit `a74fc2b`). Pole kulinarne nie zostało przeniesione.
- Brakujące pola są `incomplete_card`, bez zgadywania cech.
- `cortinarius_rubellus` ma własną kartę i jest podpięty do klasy `cortinarius_orellanus`.
- `neoboletus_erythropus` ma pustą kartę podpiętą do `neoboletus_luridiformis`, bo pokrycie mówi, że klasa go obejmuje. Nie ma osobnej karty dawcy.
- Sobowtóry spoza modelu mają karty, w tym `lepiota_subincarnata` i `lepiota_castanea`. `in_model = 0`.
- Pary z `karty-sobowtory.json` mają `review_status = proposed`, dopóki `_meta.nie_zatwierdzone` jest prawdziwe. Po akceptacji wystarczy zmienić tę flagę.
- Status sporny albo warunkowy (`SPORNY`, `WARUNKOWY`, albo rozjazd dawcy z propozycją) dostaje `status_disputed` i notkę. Nikt nie dostał `CONDITIONALLY_EDIBLE`. To zostaje dla recenzenta (Q7).
- Angielski jest w `content_locale` z `enabled = 0`. Filtr rodzaju jest w danych z `enabled = 0` (Q18).

## Bramki

`CONTENT_GATES` przerywają build:

- trujący i śmiertelnie trujący mają ostrzeżenie w każdym włączonym locale;
- każda klasa z pokrycia i z manifestu przykładowego jest w `model_class_species`;
- zdjęcia kart są CC0 albo CC BY, najwyżej 3 na gatunek, WebP;
- słownik z `data/sources/preparation-phrases.json` nie przechodzi w tekście karty;
- sporny i `CONDITIONALLY_EDIBLE` mają notkę;
- rycina bez pliku jest `pending`;
- baza ryciny jest CC0 albo CC BY;
- etykieta to `ilustracja`, a wiersz jest wyłączony z treningu;
- zatwierdzona rycina rodzaju Amanita, Galerina albo Lepiota wymaga zdjęcia tej cechy;
- zielony token jadalności nie jest przypięty do `CONDITIONALLY_EDIBLE` ani do `status_disputed` (test tokenów).

Słownik obróbki jest **propozycją do akceptacji (Q15)**. Nie jest werdyktem.

## Hugging Face

Dataset `lonwi/grzybobranie-zdjecia`. Sekret CI: `HF_TOKEN_READONLY` (tylko odczyt). Bez sekretu import zdjęć jest pomijany, z ostrzeżeniem, a reszta builda przechodzi. Wartość tokenu nie jest logowana.

Układ CSV sprawdzony 2026-11-11, inny niż szkic w planie:

- osobne pliki `data/20261108-v3/<klasa>.csv`, `data/miniplus-new16-20261110/output/<klasa>.csv` i addendum;
- sufiksy `_by_nc`, `_by_sa`, `_pd_self` są odrzucane;
- kolumny: `image_url`, `author`, `license` (`CC0`, `CC BY`, `CC BY-NC`, `CC BY-SA`), `source_url`, `license_url`, `inat_observation_id`, `mo_observation_id`, `inat_photo_id`, `mo_image_id`, `commons_file`.

## Rozmiar wobec budżetu 100 MB

Build bez tokenu (2026-11-11): baza 385024 B, zdjęcia 0 B, razem 385024 B. Budżet 104857600 B. Wycinek mieści się w budżecie. To nie jest cały APK: nie ma tu paczki JS ani modelu.

## Ryciny

Styl jest rastrowy (tablica botaniczna), nie Recraft Vector. Generowanie nie jest w CI. Metadane pilotażu 7 gatunków (14 plansz) wchodzą z `provenance.json`. Brak pliku w `assets/illustrations/` zostawia `pending`. Mapa cechy jest w `data/sources/illustration-features.json` i też jest propozycją.

## Numery alarmowe

`src/core/safety/emergency-contacts.ts` jest jedynym miejscem na numer. Pola są puste. Bramka nie wpuści numeru bez `verified` i źródła `https://`.
