# 0016. Proporcje train/val/test w training/split.py

- **Status:** Podjęta
- **Data wpisu:** 2026-10-23

## Kontekst

`training/split.py`, funkcja `split_by_observation`, ma domyślnie `val_ratio` 0.15 i `test_ratio` 0.15. Zostaje 70% na train. Jedna grupa to komponent tożsamości: zdjęcia połączone po autorze (albo po obserwacji, zdjęciu, wystąpieniu) idą w całości do jednego splitu. Ta sama grupa może obejmować wiele klas. Gdy wcześniejsza klasa zablokuje grupę w teście, późniejsza klasa dopisuje swoje wiersze do tego samego splitu i dolicza je do licznika, także powyżej własnego celu.

Ostatni `prepare` dał proporcje **51/19/29** zamiast 70/15/15. Grupy po autorze ciągną do testu za dużo zdjęć. `cortinarius_orellanus` ma 86% w teście i 10 zdjęć w train. Wycieku nie ma: komponent zostaje w jednym splicie. Metryki są zaniżone, bo test jest za duży, a train za mały.

Próg udziału zbieracza zostaje 0.20. Ta decyzja go nie rusza ([0001](0001-udzial-zbieracza.md)). Bloker orellanusa opisuje [0011](0011-orellanus-bloker.md).

Liczb 51/19/29, 86% i 10 zdjęć w train nie przeliczano ponownie w tym wpisie. Pochodzą z ostatniego `prepare` podanego przy tej decyzji.

## Opcje

- **A.** PR naprawiający. Grupa idzie do testu tylko wtedy, gdy nie przekroczy celu żadnej ze swoich klas. Do tego test na udział każdej klasy. Progi splitu i limit 0.20 bez zmian.
- **B.** Bez zmian.
- **C.** Zmiana łączenia grup.

## Rekomendacja

Trenowanie: **A**.

## Decyzja

**A** (2026-10-23, 16:05). PR naprawiający. Grupa idzie do testu tylko wtedy, gdy nie przekroczy celu żadnej ze swoich klas. Test sprawdza udział każdej klasy. Progi splitu i `COMPONENT_SHARE_LIMIT` 0.20 zostają.

Odrzucone: **B** (bez zmian) i **C** (zmiana łączenia grup).

## Data

2026-10-23, 16:05 czasu polskiego.

## Uzasadnienie

Cel zostaje 70/15/15. Łączenie po autorze zostaje, bo trzyma wyciek. Grupa nie może jednak wepchnąć obcej klasy ponad jej cel testu. Stąd warunek na każdą klasę grupy i test udziału per klasa, bez ruszania progu 0.20.

## Wdrożenie

PR od Trenowania. Jeszcze nie otwarty. Na `main` jest opisane wyżej zachowanie `split_by_observation`.

## Weryfikacja

Po merge: proporcje dla każdej klasy z `prepare`. Tego przebiegu jeszcze nie ma.
