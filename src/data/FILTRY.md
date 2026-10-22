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
- Resztki pochwy na bulwie liczą się i do pochwy, i do bulwy. Muchomor czerwonawy (`amanita_rubescens`) ma `['bulwa','pochwa']`.
- Znana wartość, która nie pokrywa się z żadnym chipem grupy, wyklucza kartę z obu sekcji.
- Rodzaj liczy się wyłącznie z `species.status` i `incompleteCard`, nie z faktów. `EDIBLE` → jadalne, `INEDIBLE` → niejadalne, `POISONOUS` i `DEADLY_POISONOUS` → trujące. Odznaka zostaje odznaką gatunku.
- Karta z `incompleteCard: true` nie trafia do wyników „jadalne”. Przy chipie „jadalne” idzie do „Do weryfikacji”.
- Karta bez wpisu w faktach przy chipie rodzaju idzie do wyników według statusu. Do „Do weryfikacji” trafia dopiero przy aktywnym chipie cechy, której brak.
- Nie ma chipa „nietrujące”. `NO_ATLAS_VERDICT` nie jest statusem karty i nie wchodzi do jadalnych ani niejadalnych.
- Żaden układ chipów nie wkłada trujących ani śmiertelnie trujących do wyników wyglądających na bezpieczne. Przy wynikach jadalnych zostają ostrzeżenia o śmiertelnych sobowtórach.
- Muchomor czerwony i plamisty mają etykietę ostrzegawczą „psychoaktywne”. To nie jest grupa filtrów. Oba zostają widoczne pod „trujące”.

## Pochodzenie danych

### Skąd pochodzą wartości filtrów

Wartości chipów filtrów atlasu powstają po stronie danych, poza repo, w trzech plikach JSON:

| Plik (folder danych) | Zawartość | Jak powstał | Data |
|---|---|---|---|
| `filtry/filtry_miesiace_siedliska_drzewa.json` | `season_months`, `habitats`, `host_trees` dla 44 gatunków aplikacji | ręcznie zebrane parafrazy z książek (`filtry/_praca/cur1.py`, `cur2.py`), złożone skryptem `filtry/_praca/build_out.py`; opis: `filtry/README_miesiace_siedliska_drzewa.md` | `_meta.data`: 2026-10-15 |
| `filtry/filtry.json` | 34 gatunki: `status`, flaga `psychoaktywne`, `hymenophore`, `spore_print_color`, `ring`, `volva_or_bulb`, `protection` (oraz starsze, ogólne miesiące/siedliska/drzewa) | skrypt `filtry/build_filtry.py` z kart gatunków (`karty/*/karta.json`, `karty-sobowtory/karty_sobowtory.json`, `karty-sobowtory/psychoaktywne.json`); opis: `filtry/README.md` | `_meta.wygenerowano`: 2026-10-14 |
| `filtry/filtry_uzupelnienie_17.json` | cechy budowy (bez statusu) dla 17 gatunków bez wpisu w `filtry.json` | parafrazy z książek | `_meta.wygenerowano`: 2026-10-14 |

Kolejność przy konflikcie: miesiące, siedliska i drzewa – wyłącznie z `filtry_miesiace_siedliska_drzewa.json` (wartości z `filtry.json` w tych polach są ogólne i niesprawdzone pole po polu); pozostałe pola – z `filtry.json`, a dla 17 gatunków spoza niego – z `filtry_uzupelnienie_17.json`. Lista gatunków w aplikacji jest ograniczona wg `src/data/atlasFilterFacts.json`.

Pole `status` jest skopiowane bez zmian z pola `edibility` kart gatunków (bez nowych werdyktów jadalności). Flaga `psychoaktywne` pochodzi z `karty-sobowtory/psychoaktywne.json` i służy wyłącznie jako etykieta ostrzegawcza; gatunki psychoaktywne mają status „trujący”. Pole `protection` opiera się na rozporządzeniu Ministra Środowiska z 9.10.2014 w sprawie ochrony gatunkowej grzybów (Dz.U. 2014 poz. 1408).

### Źródła książkowe

Opis i ocena wiarygodności każdej książki: `sources.md` w folderze danych. Każda wartość ma w polu `sources` tytuł i numer strony.

| Poziom zaufania | Źródła (ID z `sources.md`) |
|---|---|
| 1 | Grzyby polskich lasów (GrzybyPolskichLasow2021, GPL; Zarzyński, CILP 2021), Bezpieczne grzybobranie (BezpGrzyb2016; CILP + WSSE Warszawa 2016) |
| 2 | Grzyby jakich nie znamy (Wrzosek, Sierota, CILP 2012), Klucz do rozpoznawania grzybów (TSE „Tilia”), Poradnik grzybiarza (LOT „Serce Kaszub”), Najczęściej spotykane grzyby jadalne |
| 3 | Grzyby – prezentacja (Hawryluk), Orłoś 1979, Orłoś 1966 – przestarzałe oceny jadalności, tylko pomocniczo |

Tekst książki Stametsa (1996) nie został użyty w danych filtrów. Teksty książek są chronione prawem autorskim: w danych są tylko parafrazy z numerem strony, bez cytatów i bez zdjęć z książek.

Numeracja stron nie jest jednolita: w `filtry_miesiace_siedliska_drzewa.json` GPL i Poradnik grzybiarza mają strony drukowane (pole `numeracja_stron` przy każdym źródle), a w `filtry.json` i `filtry_uzupelnienie_17.json` – strony pliku PDF (GPL: strona drukowana = PDF + 2). Pełny opis: `sources.md`, sekcja „Numeracja stron”.

### Wartości niepotwierdzone: `null` + `do_weryfikacji`

Wartość, której nie potwierdzono w źródłach poziomu 1–2 (lub przy sprzeczności między nimi), ma postać `value: null`, `do_weryfikacji: true` i `powod`. Zgodnie z uzgodnionym modelem filtrów taki gatunek trafia do grupy „Do weryfikacji” i nie znika z listy przy aktywnym filtrze. Pusta lista `[]` w `host_trees` oznacza saprotrofa (brak związku z drzewem), a nie brak danych. Stan na 2026-10-15: `season_months` `null` dla 4 gatunków, `host_trees` `null` dla 5 (lista: `filtry/README_miesiace_siedliska_drzewa.md`, sekcja „Pokrycie”).

### Pola, które nie trafiają do aplikacji

- `propozycja*` (np. `propozycja_z_karty`) – wartość ze starej karty gatunku, niepotwierdzona; służy wyłącznie do weryfikacji.
- `wartosci_tylko_w_innych_zrodlach` – wartości występujące tylko w książkach niższego poziomu; nie wchodzą do `value`.
- `kandydaci`, `luki_slownika`, `pewnosc`, `note` i `_meta` to metadane robocze, a nie treść do wyświetlenia.

Zasada: do aplikacji trafiają wyłącznie `value`, `do_weryfikacji` (jako sygnał stanu) i źródła. Zgodności kodu importu z tą zasadą strona danych nie sprawdzała.

### Data sprawdzenia

- Miesiące, siedliska, drzewa: 2026-10-15 (`filtry_miesiace_siedliska_drzewa.json`, `_meta.data`).
- Cechy budowy, status, ochrona: 2026-10-14 (`filtry.json`, `filtry_uzupelnienie_17.json`, `_meta.wygenerowano`).
- Opis numeracji stron: 2026-10-22 (`sources.md`).

Zmiana danych odbywa się w folderze danych (edycja `cur1.py`/`cur2.py` albo kart i ponowne uruchomienie skryptu), a nie przez ręczną edycję JSON-a w repo.

### Kto utrzymuje

Stronę danych (pliki `filtry/`, karty gatunków, `sources.md`) utrzymuje „Zbieranie informacji o grzybach”. Kod filtrów i import JSON-a do repo – „Grzybobranie”; review – „Grzybobranie PR Review”; testy i CI – „Quality”. Zmiany w treściach wymagają zgody Wojtka (Wojciech Bubółka). Instrukcja przejęcia strony danych: `PRZEKAZANIE.md` w folderze danych.
