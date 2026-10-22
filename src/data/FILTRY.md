# Filtry atlasu (etap 1)

Dane budowy pochodzą z `filtry.json` oraz z uzupełnienia 17 kart (2026-10-14). W aplikacji jest tylko skrót: `src/data/atlasFilterFacts.json`. Import kopiuje pola jawnie na `StructureFacts` (bez spreada), więc `status`, `propozycja` i inne klucze spoza typu nie wchodzą do bundla. Etykiety chipów są w `src/i18n`, nie w danych.

Wpis faktów bez karty w atlasie nie jest trzymany. Karta bez wpisu zostaje w atlasie.

## Układ

Nad listą jest jeden przewijany rząd: jadalne, niejadalne, trujące, „Do weryfikacji” i przycisk „Filtry (n)”.
`n` liczy tylko chipy z dolnego panelu (spód, wysyp, ochrona, pierścień, pochwa/bulwa).
Aktywne chipy panelu wiszą pod rzędem i schodzą pojedynczo. Czytnik dostaje „Usuń filtr: {grupa}: {wartość}”, a na chipie zostaje sama wartość. „Wyczyść” zdejmuje chipy panelu i zostawia rodzaj. „Pokaż n” liczy karty widoczne po zamknięciu panelu: pasujące oraz te w „Do weryfikacji”. Zero pasujących nie daje „Pokaż 0”, dopóki sekcja weryfikacji ma karty.
„Do weryfikacji” jest zawsze w rzędzie. To przełącznik sekcji, nie chip modelu: nie wchodzi do `chipIds` i nie zmienia OR/AND.
Odznaczenie rodzaju nie ukrywa trujących. Brak chipa rodzaju dalej pokazuje cały atlas, łącznie ze śmiertelnie trującymi.

## Etap 1

Grupy chipów: rodzaj (jadalne, niejadalne, trujące), spód kapelusza (blaszki, rurki, listwy, kolce), kolor wysypu, ochrona, pierścień, pochwa/bulwa.

Poza tym etapem: miesiące, siedliska, drzewa.

## Reguły

- Brak aktywnego chipa w grupie oznacza, że grupa niczego nie odcina. Brak jakiegokolwiek chipa pokazuje cały atlas.
- W obrębie grupy chipy łączą się przez OR. Między grupami obowiązuje AND.
- Pole wielowartościowe trafia, gdy choć jedna wartość pokrywa się z wybranym chipem. Wysyp może mieć kilka tokenów istniejącego słownika naraz, np. `['bialy','kremowy']`. Nowych słów się nie dopisuje. Odcień bez potwierdzenia w słowniku zostaje pusty (`do_weryfikacji`).
- Puste pole albo `do_weryfikacji` przy aktywnym chipie tej cechy przenosi kartę do sekcji „Do weryfikacji”. Karta nie wpada do wyników i nie znika.
- Chip „pochwa” i chip „bulwa” pasują do tokenów `pochwa` i `bulwa`. Bulwa nie jest pochwą, a pochwa zostawiona w ziemi wygląda jak bulwiasta nasada. Sromotnik, muchomor jadowity i plamisty zostają na obu chipach razem z cytrynowym (`bulwa`) i czerwonawym (`bulwa`).
- Maślanka łagodna i wiązkowa mają `ring: false` oraz `wlokna_zasnowki`. Zasnówka nie jest błoniastym pierścieniem. Chip „jest pierścień” zostawia maślankę wiązkową w „Do weryfikacji”. Czy to ma zostać wykluczeniem, rozstrzyga issue #63. Allowlista jest pusta.
- Znana wartość, która nie pokrywa się z żadnym chipem grupy, wyklucza kartę z obu sekcji. Gatunek `POISONOUS` albo `DEADLY_POISONOUS` wypada z obu sekcji tylko przy sprzeczności pola z `STABLE_TRAITS` (dziś tylko spód kapelusza, `hymenophore`) albo przy parze z `src/data/poisonousMissAllowlist.ts`. Puste albo `null` na polu stabilnym daje „Do weryfikacji”, nie wykluczenie. Wysyp i każde inne pole, także dopisane później, też dają „Do weryfikacji”. Nowe wpisy allowlisty tylko po decyzji właściciela w issue #63. Usuwanie wpisów jest zawsze dozwolone.
- Rodzaj liczy się wyłącznie z `species.status` i `incompleteCard`, nie z faktów. `EDIBLE` → jadalne, `INEDIBLE` → niejadalne, `POISONOUS` i `DEADLY_POISONOUS` → trujące. Odznaka zostaje odznaką gatunku.
- Karta z `incompleteCard: true` nie trafia do wyników „jadalne”. Przy chipie „jadalne” idzie do „Do weryfikacji”.
- Karta bez wpisu w faktach przy chipie rodzaju idzie do wyników według statusu. Do „Do weryfikacji” trafia dopiero przy aktywnym chipie cechy, której brak.
- Nie ma chipa „nietrujące”. `NO_ATLAS_VERDICT` nie jest statusem karty i nie wchodzi do jadalnych ani niejadalnych.
- Chip „jadalne” nie wstawia trujących do wyników. Zostają w „Do weryfikacji”. Przy wynikach jadalnych zostają ostrzeżenia o śmiertelnych sobowtórach.
- Muchomor czerwony i plamisty mają etykietę ostrzegawczą „psychoaktywne”. To nie jest grupa filtrów. Oba zostają widoczne pod „trujące”.

## Cechy klucza (2026-10-22)

`atlasFilterFacts.json` ma też cechy pod planowany klucz: kształt i kolor kapelusza, rozmiar, trzon, zapach, smak, przebarwienie, mleczko, drzewa, podłoże. Panel filtrów ich nie czyta. Brak pola (albo `null` przy pierścieniu, pochwie i wysypie) zostaje pustką, więc istniejące „Do weryfikacji” działa bez zmian reguły.

Tokeny są polskim ASCII, jak `pochwa` i `bialy`. Mapa z angielskich wartości źródłowych jest w `data/sources/ATLAS_CECHY.md`. Etykiety PL/EN są w `src/i18n`, nie w JSON. Pochodzenie każdego pola (źródło, `checkedAt`, status) jest w `data/sources/atlas_cechy_20261022.json`. Do aplikacji wchodzą `zweryfikowane`, `wniosek_z_klucza`, `istniejace` i `pominiete`. `do_weryfikacji` zostaje poza faktami. `pominiete` i `istniejace` nie są składane do `zweryfikowane`. Smak gatunku trującego albo śmiertelnie trującego to `nie_podaje_sie` i nie jest smakiem do pokazania.
