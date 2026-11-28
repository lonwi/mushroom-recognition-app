# species.db

Faza 1 buduje bazę: `pnpm build:species`. Schemat jest w `species-schema.ts`, SQL w `species-ddl.ts`.

Plik `assets/db/species.db` nie wchodzi do gita. EAS buduje go w `eas-build-post-install` i aplikacja otwiera ten asset. Bez pliku przy bundlowaniu zostaje siew z `donor-cards.json`.

Spike C jest zaliczony (2026-11-28). Xiaomi Mi 11 Lite 5G, telefon referencyjny: źródło asset, p95 ciepłych zapytań 4,8 ms przy progu poniżej 50 ms; 34,7 ms otwarcia obejmuje kopiowanie assetu. Samsung S23: dym OK, bez progu; 4,2 ms to otwarcie bazy już skopiowanej, nie czas pierwszego importu. Liczby są w `docs/spikes/F0-raport.md`. Huawei P smart 2019 pominięty. Tu jest budowa bazy i test zapytania, nie liczba z urządzenia.
