# Filtry atlasu (etap 1)

Dane budowy pochodzą z `filtry.json` (2026-10-14, skrypt `filtry/build_filtry.py`). W aplikacji jest tylko skrót: `src/data/atlasFilterFacts.json`. Import kopiuje pola jawnie na `StructureFacts` (bez spreada), więc `status`, `propozycja` i inne klucze spoza typu nie wchodzą do bundla. Etykiety chipów są w `src/i18n`, nie w danych.

Wpis faktów bez karty w atlasie nie jest trzymany. Karta bez wpisu zostaje w atlasie.

## Etap 1

Grupy chipów: rodzaj (jadalne, niejadalne, trujące), spód kapelusza (blaszki, rurki, listwy, kolce), kolor wysypu, ochrona, pierścień, pochwa/bulwa.

Poza tym etapem: miesiące, siedliska, drzewa.

## Reguły

- Brak aktywnego chipa w grupie oznacza, że grupa niczego nie odcina. Brak jakiegokolwiek chipa pokazuje cały atlas.
- W obrębie grupy chipy łączą się przez OR. Między grupami obowiązuje AND.
- Pole wielowartościowe trafia, gdy choć jedna wartość pokrywa się z wybranym chipem.
- Puste pole albo `do_weryfikacji` przy aktywnym chipie tej cechy przenosi kartę do sekcji „Do weryfikacji”. Karta nie wpada do wyników i nie znika.
- Znana wartość, która nie pokrywa się z żadnym chipem grupy, wyklucza kartę z obu sekcji.
- Rodzaj liczy się wyłącznie z `species.status` i `incompleteCard`, nie z faktów. `EDIBLE` → jadalne, `INEDIBLE` → niejadalne, `POISONOUS` i `DEADLY_POISONOUS` → trujące. Odznaka zostaje odznaką gatunku.
- Karta z `incompleteCard: true` nie trafia do wyników „jadalne”. Przy chipie „jadalne” idzie do „Do weryfikacji”.
- Karta bez wpisu w faktach przy chipie rodzaju idzie do wyników według statusu. Do „Do weryfikacji” trafia dopiero przy aktywnym chipie cechy, której brak.
- Nie ma chipa „nietrujące”. `NO_ATLAS_VERDICT` nie jest statusem karty i nie wchodzi do jadalnych ani niejadalnych.
- Żaden układ chipów nie wkłada trujących ani śmiertelnie trujących do wyników wyglądających na bezpieczne. Przy wynikach jadalnych zostają ostrzeżenia o śmiertelnych sobowtórach.
- Muchomor czerwony i plamisty mają etykietę ostrzegawczą „psychoaktywne”. To nie jest grupa filtrów. Oba zostają widoczne pod „trujące”.
