# Filtry atlasu (etap 1)

Dane pochodzą z `filtry.json` (2026-10-14, skrypt `filtry/build_filtry.py`). W aplikacji jest tylko skrót faktów: `src/data/atlasFilterFacts.json`. Źródła stron i propozycje z kart nie wchodzą do bundla. Etykiety chipów są w `src/i18n`, nie w danych.

## Etap 1

Grupy chipów: rodzaj (jadalne, niejadalne, trujące), spód kapelusza (blaszki, rurki, listwy, kolce), kolor wysypu, ochrona, pierścień, pochwa/bulwa.

Poza tym etapem: miesiące, siedliska, drzewa.

## Reguły

- Brak aktywnego chipa w grupie oznacza, że grupa niczego nie odcina. Brak jakiegokolwiek chipa pokazuje cały atlas.
- W obrębie grupy chipy łączą się przez OR. Między grupami obowiązuje AND.
- Pole wielowartościowe trafia, gdy choć jedna wartość pokrywa się z wybranym chipem.
- Puste pole albo `do_weryfikacji` przy aktywnym chipie tej grupy przenosi kartę do sekcji „Do weryfikacji”. Karta nie wpada do wyników i nie znika.
- Znana wartość, która nie pokrywa się z żadnym chipem grupy, wyklucza kartę z obu sekcji.
- Pięć statusów z kart: `jadalny` i `jadalny warunkowo` → jadalne; `niejadalny` → niejadalne; `trujący` i `śmiertelnie trujący` → trujące. Odznaka na karcie zostaje odznaką gatunku (śmiertelnie trujący nie jest spłaszczany do „trujący”).
- `jadalny warunkowo` może być w wynikach „jadalne” tylko z widocznym warunkiem przy wierszu.
- `NO_ATLAS_VERDICT` nie ma rodzaju, więc nie wpada do jadalnych ani niejadalnych. Nie ma chipa „nietrujące”.
- Żaden układ chipów nie wkłada trujących ani śmiertelnie trujących do wyników wyglądających na bezpieczne. Przy wynikach jadalnych zostają ostrzeżenia o śmiertelnych sobowtórach.
- Muchomor czerwony i plamisty mają etykietę ostrzegawczą „psychoaktywne”. To nie jest grupa filtrów. Oba zostają widoczne pod „trujące”.
