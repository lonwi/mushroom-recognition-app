# Filtry atlasu

Dane budowy etapu 1 pochodzą z `filtry.json` oraz z uzupełnienia 17 kart (2026-10-14). W aplikacji jest tylko skrót: `src/data/atlasFilterFacts.json`. Import kopiuje pola jawnie na `StructureFacts` (bez spreada), więc `status`, `propozycja` i inne klucze spoza typu nie wchodzą do bundla.

Etap 2 (miesiące, siedliska, drzewa żywicielskie) jest w `src/data/atlasFilterSeason.json`. Do pliku weszły wyłącznie pola `value` z 44 gatunków oraz flaga `habitatsReview` skopiowana z `do_weryfikacji` siedliska u `lactarius_torminosus`. W bundlu nie ma `propozycja_z_karty`, `wartosci_tylko_w_innych_zrodlach`, `luki_slownika`, `kandydaci`, stron ani notatek źródeł. Import kopiuje pola jawnie na `SeasonFacts`. Etykiety chipów są w `src/i18n` (własna kopia, bez importu `src/data`). Skróty miesięcy to istniejące klucze `months.*`.

Wpis faktów bez karty w atlasie nie jest trzymany. Karta bez wpisu zostaje w atlasie. Oba pliki mają te same 44 klucze co karty.

## Układ

Nad listą jest jeden przewijany rząd: jadalne, niejadalne, trujące, „Do weryfikacji” i przycisk „Filtry (n)”.
`n` liczy tylko chipy z dolnego panelu (spód, wysyp, ochrona, pierścień, pochwa/bulwa, miesiąc, siedlisko, drzewo żywicielskie).
Aktywne chipy panelu wiszą pod rzędem i schodzą pojedynczo. Czytnik dostaje „Usuń filtr: {grupa}: {wartość}”, a na chipie zostaje sama wartość. „Wyczyść” zdejmuje chipy panelu i zostawia rodzaj. „Pokaż n” liczy karty widoczne po zamknięciu panelu: pasujące oraz te w „Do weryfikacji”. Zero pasujących nie daje „Pokaż 0”, dopóki sekcja weryfikacji ma karty.
„Do weryfikacji” jest zawsze w rzędzie. To przełącznik sekcji, nie chip modelu: nie wchodzi do `chipIds` i nie zmienia OR/AND.
Odznaczenie rodzaju nie ukrywa trujących. Brak chipa rodzaju dalej pokazuje cały atlas, łącznie ze śmiertelnie trującymi.
Miesiące, siedliska i drzewa są tylko w dolnym panelu. Miesiące to siatka 12 chipów. Siedlisko i drzewo żywicielskie są zwijane i na starcie zwinięte. Główny rząd i przypięty nagłówek się nie wydłużają.

## Etap 1

Grupy chipów: rodzaj (jadalne, niejadalne, trujące), spód kapelusza (blaszki, rurki, listwy, kolce), kolor wysypu, ochrona, pierścień, pochwa/bulwa.

## Etap 2

Grupy chipów: miesiąc (1–12), siedlisko, drzewo żywicielskie.

Słownik chipów jest zamknięty (`habitats` i `host_trees` z `filtry.json`). Zarośla, zręby, łęgi, pola, klon i inne braki słownika nie dostają chipa i nie są mapowane na najbliższy chip.

- Miesiąc pasuje, gdy `seasonMonths` zawiera wybrany miesiąc. Kilka miesięcy w grupie łączy się przez OR.
- `null` w aktywnej grupie (albo brak wpisu) przenosi kartę do „Do weryfikacji”. Karta nie znika.
- `hostTrees: []` to saprotrof bez drzewa żywicielskiego, nie brak danych. Przy aktywnym filtrze drzewa karta nie pasuje do żadnego wybranego drzewa i nie trafia do „Do weryfikacji” tylko z powodu pustej listy.
- `habitatsReview: true` (mleczaj wełnianka, `lactarius_torminosus`) działa jak `null` siedliska: zapisane typy nie biorą udziału w dopasowaniu, karta idzie do „Do weryfikacji”.
- Pieprznik (`cantharellus_cibarius`) ma w źródle flagę przy drzewach, bo dwie książki podają różne zestawy, a `value` jest ich sumą. Do aplikacji wchodzi ta suma, bez flagi. Gatunek pasuje do każdego z tych drzew.

Pokrycie wartości: miesiące 40/44 (`null`: `cortinarius_rubellus`, `galerina_marginata`, `inocybe_erubescens`, `tylopilus_felleus`), siedliska 44/44 z 1 flagą (`lactarius_torminosus`), drzewa 39/44, w tym 4 puste `[]` (`calocybe_gambosa`, `chlorophyllum_rhacodes`, `gyromitra_esculenta`, `macrolepiota_procera`) i 5 × `null` (`agaricus_campestris`, `agaricus_xanthodermus`, `amanita_excelsa`, `armillaria_mellea`, `cortinarius_rubellus`).

## Reguły

- Brak aktywnego chipa w grupie oznacza, że grupa niczego nie odcina. Brak jakiegokolwiek chipa pokazuje cały atlas.
- W obrębie grupy chipy łączą się przez OR. Między grupami obowiązuje AND.
- Pole wielowartościowe trafia, gdy choć jedna wartość pokrywa się z wybranym chipem. Wysyp może mieć kilka tokenów istniejącego słownika naraz, np. `['bialy','kremowy']`. Nowych słów się nie dopisuje. Odcień bez potwierdzenia w słowniku zostaje pusty (`do_weryfikacji`).
- Puste pole albo `do_weryfikacji` przy aktywnym chipie tej cechy przenosi kartę do sekcji „Do weryfikacji”. Karta nie wpada do wyników i nie znika. Wyjątek: pusta lista drzew żywicielskich (`[]`) jest znanym saprotrofem, nie pustym polem.
- Resztki pochwy na bulwie liczą się i do pochwy, i do bulwy. Muchomor czerwonawy (`amanita_rubescens`) ma `['bulwa','pochwa']`.
- Znana wartość, która nie pokrywa się z żadnym chipem grupy, wyklucza kartę z obu sekcji. Dotyczy to też tokenu spoza słownika (np. zarośla): nie wskakuje na najbliższy chip.
- Rodzaj liczy się wyłącznie z `species.status` i `incompleteCard`, nie z faktów. `EDIBLE` → jadalne, `INEDIBLE` → niejadalne, `POISONOUS` i `DEADLY_POISONOUS` → trujące. Odznaka zostaje odznaką gatunku.
- Karta z `incompleteCard: true` nie trafia do wyników „jadalne”. Przy chipie „jadalne” idzie do „Do weryfikacji”.
- Karta bez wpisu w faktach przy chipie rodzaju idzie do wyników według statusu. Do „Do weryfikacji” trafia dopiero przy aktywnym chipie cechy, której brak.
- Nie ma chipa „nietrujące”. `NO_ATLAS_VERDICT` nie jest statusem karty i nie wchodzi do jadalnych ani niejadalnych.
- Żaden układ chipów nie wkłada trujących ani śmiertelnie trujących do wyników wyglądających na bezpieczne. Przy wynikach jadalnych zostają ostrzeżenia o śmiertelnych sobowtórach.
- Muchomor czerwony i plamisty mają etykietę ostrzegawczą „psychoaktywne”. To nie jest grupa filtrów. Oba zostają widoczne pod „trujące”.
- Gatunek trujący z `null` miesiąca albo drzewa przy włączonym chipie tej grupy zostaje w „Do weryfikacji” i dalej pokazuje ostrzeżenie o sobowtórach. Odznaczenie rodzaju nigdy go nie chowa.
