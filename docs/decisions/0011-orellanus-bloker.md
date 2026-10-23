# 0011. Cortinarius orellanus jako bloker wydania

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

Klasa `cortinarius_orellanus` (zasłonak rudy) jest na liście gatunków modelu i na liście klas cienkich (`training/sampling.py`: razem z `cortinarius_rubellus` i `amanita_virosa`). Przy samym CC0 i CC BY z GBIF pula zostaje krótka (`training/fetch_gbif.py`).

[Issue #51](https://github.com/lonwi/mushroom-recognition-app/issues/51): 24 zdjęcia z 21 obserwacji, 23 od jednej autorki (GBIF / Artsobservasjoner). Issue oznacza zbiór jako niewystarczający do oceny i zostawia klasę w blokerach wydania ze statusem „niezweryfikowany”. Potrzebne są inne źródła.

Po [#69](https://github.com/lonwi/mushroom-recognition-app/pull/69) to samo jest w kodzie. `training/component_share_acknowledgements.json` ma jeden wpis:

- `class_id`: `cortinarius_orellanus`
- powód: 23 z 24 zdjęć należy do jednego fotografa; klasa zostaje blokerem statku, dopóki pula nie jest szersza.

Potwierdzenie pozwala skończyć `prepare`. Trafia do manifestu i do `component_share_blockers`, więc `shippable` zostaje false (`training/ship_gates.py` czyta tę listę). Próg udziału opisuje [0001](0001-udzial-zbieracza.md). Pomiar z 2026-10-23, 14:17, zapisany w 0001: udział największego komponentu w `cortinarius_orellanus` to 84,7%. Treść karty atlasu opisuje [0010](0010-drobne-atlas-51.md).

Issue #51 jest nadal otwarte. Nie ma nowszej puli zdjęć w repozytorium.

## Opcje

- **A.** Zostawić klasę blokerem wydania, dopóki pula zdjęć nie jest szersza i nie jest sprawdzona. Tak jest w kodzie i w #51.
- **B.** Uznać obecną pulę za wystarczającą i zdjąć bloker.

## Rekomendacja

Brak osobnej rekomendacji botów poza stanem, który już jest w kodzie: **A**. Zdjęcie blokera obniżyłoby warunek wydania. Tego ten wpis nie proponuje.

## Decyzja

Brak. Mechanizm blokera jest na `main`. Brakuje słowa właściciela, że tak ma zostać do czasu szerszej puli, albo że bloker schodzi.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Bloker jest wdrożony w #69 / `8ac95c4` przez `component_share_acknowledgements.json` i `ship_gates.py`. Nie ma PR, który zdejmuje blokadę.

## Weryfikacja

—
