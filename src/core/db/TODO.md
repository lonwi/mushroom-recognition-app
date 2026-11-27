# species.db

Faza 1 buduje bazę: `pnpm build:species`. Schemat jest w `species-schema.ts`, SQL w `species-ddl.ts`.

Plik `assets/db/species.db` nie wchodzi do gita. EAS buduje go w `eas-build-post-install` i aplikacja otwiera ten asset. Bez pliku przy bundlowaniu zostaje siew z `donor-cards.json`.

Spike C (czas FTS5 na Xiaomi Mi 11 Lite 5G) mierzy ekran `src/app/dev/fts.tsx`. Samsung S23 w tym spike'u jest dymem. Jak odpalić pomiar, jest w `docs/spikes/F0-raport.md`. Komórki zostają puste, dopóki nie ma pomiaru z telefonu. Tu jest budowa bazy i test zapytania, nie liczba z urządzenia.
