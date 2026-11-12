---
name: grzybobranie-safety-and-domain
description: Safety, domain, licensing, and life-critical rules for Grzybobranie AI (edibility isolation, look-alikes, deadly warnings, CC licensing, emergency numbers).
---

# Grzybobranie AI Safety & Domain Rules

Aplikacja wspiera rozpoznawanie grzybów w warunkach terenowych. Błędna identyfikacja gatunku śmiertelnie trującego (*Amanita phalloides*, *Galerina marginata*, *Cortinarius rubellus*) stwarza bezpośrednie zagrożenie utraty życia lub zdrowia.

## 1. Izolacja jadalności (Edibility Isolation)

- **Model nigdy nie orzeka o jadalności.** W strukturze wyniku inferencji (`recognition-decision.ts` lub podobne) nie może istnieć pole jadalności wyliczone z wag modelu.
- Informacja o jadalności pochodzi **wyłącznie** z autorytatywnej bazy wiedzy (`species.db`), przypiętej do unikalnego identyfikatora gatunku (slug).
- Model zwraca wyłącznie prawdopodobieństwo taksonu.

## 2. Kategoria `CONDITIONALLY_EDIBLE` (Warunkowo jadalny)

Zgodnie z decyzją D-12:
- Status `CONDITIONALLY_EDIBLE` w UI jest traktowany **jak status podwyższonego ryzyka** (`status_disputed`).
- **NIGDY** nie wolno nadać mu zielonego koloru jadalności (np. `primaryGreen` / `statusEdible`).
- **NIGDY** nie wolno zamieszczać instrukcji obróbki kulinarnej (np. „gotować 20 minut z odlaniem wody”), ponieważ aplikacja nie może brać odpowiedzialności za błędy w obróbce toksyn termolabilnych.
- Pilnuje tego test w CI: `src/ui/tokens.test.ts` oraz testy bramek treści.

## 3. Sobowtóry i gatunki śmiertelnie trujące (Look-alikes)

- Każda para sobowtórów (`confusionRisks` / `look_alike_pairs`) zawierająca gatunek śmiertelnie trujący musi mieć ustawioną flagę `fatal: true`.
- Ostrzeżenie przed gatunkiem śmiertelnie trującym musi być wyróżnione plakietką: `#2A080C` tło, `#FF4560` tekst, ramka z symbolem czaszki (☠️).
- Cechy różnicujące (np. trzon, pierścień, pochwa, blaszki) muszą być jednoznacznie wyeksponowane w widoku porównania 50/50.

## 4. Uczciwość rozpoznawania (Honest Recognition)

- Aplikacja nigdy nie fabrykuje pewności predykcji. Jeśli model nie dokonał rzeczywistej inferencji na pikselach (np. brak modelu, błąd dekodera), wynik to jawne „rozpoznawanie niedostępne” (`recognition_unavailable`).
- Procenty ufności pokazujemy tylko przy skalibrowanym modelu (`calibrated && ECE <= próg`). W przeciwnym razie stosowany jest wyłącznie opis słowny (np. „Możliwe dopasowanie”).

## 5. Licencjonowanie mediów w UI

- W aplikacji mobilnej (`src/`) wolno prezentować **wyłącznie zdjęcia na licencjach CC0 oraz CC BY**.
- Każde zdjęcie musi posiadać pełną atrybucję autora i źródła.
- Zdjęcia na licencjach `CC BY-NC`, `CC BY-SA` oraz `pd-self` mogą być wykorzystywane wyłącznie w potoku treningowym (`ml/`), nigdy w interfejsie użytkownika.
- Wygenerowane obrazy/ryciny muszą posiadać jawną etykietę „ilustracja”.

## 6. Numery alarmowe

- Wszystkie numery alarmowe i kontakty do ośrodków ostrych zatruć mogą znajdować się **wyłącznie** w dedykowanym module `src/core/safety/emergency-contacts.ts`.
- Nigdzie indziej w kodzie nie wolno wpisywać numerów telefonów „z pamięci”.
