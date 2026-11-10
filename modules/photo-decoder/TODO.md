# Spike B — dekoder zdjęć

Poza Fazą 0. Lokalny moduł `modules/photo-decoder`: podpróbkowanie do co najmniej 448 px i parytet P1 na fixture'ach z `ml/fixtures/`.

Kryteria z `docs/spikes/F0-raport.md`:

- parytet P1 na fixture'ach
- Xiaomi Mi 11: trzy zdjęcia z aparatu w budżecie pamięci 400 MB
- Huawei P smart 2019: trzy zdjęcia bez OOM i bez ubicia procesu; czas tylko zapisany

Rozmiar wejścia i normalizacja przyjdą z manifestu (M0), nie ze stałych prototypu.
