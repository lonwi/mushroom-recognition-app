# 0018. Limit autora i Wikimedia Commons

- **Status:** Podjęta (wdrożenie w toku)
- **Data wpisu:** 2026-10-23

## Kontekst

Próg udziału komponentu w klasie jest nadal otwarty i w kodzie zostaje 0.20 ([0001](0001-udzial-zbieracza.md)). W 0001 i [0004](0004-licencje-zdjec.md) jest zapis „maks. ok. 30 zdjęć na autora na klasę”. To było ustawienie Zbierania, nie decyzja właściciela.

[#78](https://github.com/lonwi/mushroom-recognition-app/pull/78) jest otwarty („Podział train/val/test nie przekracza celu żadnej klasy”). Pytanie o minimum w tym PR zostaje otwarte. Naprawę proporcji opisuje [0016](0016-proporcje-splitu.md).

## Opcje

- **A.** Dopisać zdjęcia z Wikimedia Commons dla wszystkich gatunków i wprowadzić limit zdjęć jednej osoby w klasie.
- **B.** Tylko Commons.
- **C.** Wstrzymanie.

## Rekomendacja

Brak.

## Decyzja

**A** (2026-10-23, 16:55).

1. Dopisujemy zdjęcia z Wikimedia Commons dla wszystkich gatunków.
2. Limit zdjęć jednej osoby w klasie to `min(60, max(10, round(0.10 × N)))`. N to liczba zdjęć tej klasy. Limit stosuje się też do istniejących danych. Maksymalnie 3 zdjęcia na obserwację zostają bez zmian.

Odrzucone: **B** (tylko Commons) i **C** (wstrzymanie).

Wcześniejsze 30 na autora było ustawieniem Zbierania, a nie decyzją. Obowiązuje wzór powyżej, nie tamta liczba.

**Otwarte:** czy współzbieracze łączą komponenty. Status: otwarte.

Skutki: większość klas schodzi poniżej udziału komponentu 0.20, a `cortinarius_orellanus` mocno się zmniejsza. Pytanie o minimum w [#78](https://github.com/lonwi/mushroom-recognition-app/pull/78) zostaje otwarte. Wartość `COMPONENT_SHARE_LIMIT` nadal opisuje [0001](0001-udzial-zbieracza.md).

## Data

2026-10-23, 16:55 czasu polskiego.

## Uzasadnienie

Właściciel bierze Commons dla wszystkich gatunków i tnie pulę jednej osoby wzorem od 10 do 60 zdjęć, także na danych, które już są. Sufit 3 zdjęć na obserwację zostaje. Nie wstrzymuje zbioru i nie bierze samego Commons bez limitu.

## Wdrożenie

Osobny PR. Zbieranie zapisuje to w CSV. Trenowanie wstawia limit w kodzie `prepare`, po złączeniu źródeł, z tą samą funkcją klucza osoby co split, i z testem kontraktu. Tego PR jeszcze nie ma.

## Weryfikacja

Decyzja zapisana w tym wpisie. Nie przeliczano tu udziałów klas po limicie. Pytanie o współzbieraczy i pytanie o minimum w #78 są otwarte.
