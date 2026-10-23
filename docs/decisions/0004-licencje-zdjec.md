# 0004. Dopuszczalne licencje zdjęć w treningu, w tym CC BY-SA

- **Status:** Podjęta (wdrożenie w toku)
- **Data wpisu:** 2026-10-23

## Kontekst

Dziś kod ma dwie ścieżki i nie mówią tego samego.

Pobieranie z GBIF (`training/licenses.py`, `training/fetch_gbif.py`) zostawia zdjęcie tylko wtedy, gdy licencja **tego medium** normalizuje się do CC0 albo CC BY. CC BY-NC, CC BY-SA, CC BY-ND, kombinacje NC/SA/ND, DF20 i brak licencji odpadają. Licencja wystąpienia nie nadpisuje licencji zdjęcia.

Import zewnętrznych CSV (`training/import_external.py`, na `main` od [#68](https://github.com/lonwi/mushroom-recognition-app/pull/68), zacieśniony w [0002](0002-license-url-trening.md)) rozróżnia użycie:

- CC0 i wersjonowane CC BY: `usage=publishable`.
- Wersjonowane CC BY-NC: `usage=training_only`.
- Danish Fungi 2020: `usage=training_only`, `license_normalized` `df20`.
- CC BY-SA, CC BY-ND, CC BY-NC-ND i CC BY-NC-SA: wiersz odpada. `training/README.md` pisze, że CC BY-SA zostaje odrzucone, dopóki właściciel nie powie inaczej. Późniejsze dopuszczenie oznacza dopisanie dokładnych id `cc-by-sa-<wersja>` jako `training_only`.

`is_publishable` (galeria atlasu, `site/`, zdjęcia porównań) nie przepuszcza CC BY-NC ani DF20. Na `main` sprzed tej decyzji bramka wydania nie oznacza modelu jako `shippable`, gdy w atrybucji są wiersze `training_only`. `AGENTS.md` wymaga przy wydaniu komercyjnym retreningu bez BY-NC i DF20. Oba te zapisy opisują kod sprzed wyboru poniżej. Wybór je zmienia dla CC BY-NC i CC BY-SA: model wydawany w aplikacji może być na nich uczony. DF20, wariant B z 12:15, zostaje przy treningach testowych i zawsze blokuje `shippable`.

`AGENTS.md` zapisuje też decyzję właściciela z 2026-10-16: CC BY-NC (samo BY-NC, bez NC-ND i NC-SA) oraz DF20 są zatwierdzone tylko do treningu, nigdy do publikacji zdjęć w aplikacji. Ta notatka nadal opisuje to jako „jeszcze nie wdrożone” i nie obejmuje CC BY-SA. Importer z #68 już przyjmuje BY-NC i DF20 jako `training_only`. Fetch GBIF ich nie przyjmuje. Tekst ustawień w `src/i18n/pl.ts` (`settings.dataLicenseBody`) mówi, że model wolno trenować tylko na CC0 albo CC-BY, bez NC i SA.

**Stan historyczny sprzed 12:17.** CC BY-SA (między innymi część zdjęć Mushroom Observer) jest odrzucone na obu ścieżkach. Testy w `training/tests/test_import_external.py` pilnują, że `CC BY-SA` nie jest mylone z `CC BY`. Od wariantu B z 12:17 CC BY-SA wolno użyć do treningu modelu wydawanego, a zdjęć nie pokazujemy. W kodzie na `main` obie ścieżki nadal odrzucają CC BY-SA. To jest stan sprzed decyzji, nie wybór z 12:17.

README DF20 mówi „non-commercial research purposes only”. Regulamin Svampeatlas wymaga bezpośredniego porozumienia z fotografem. Raport Zbierania to potwierdza. [Issue #51](https://github.com/lonwi/mushroom-recognition-app/issues/51) ma ten sam punkt: licencji per zdjęcie w DF20 nie ma. Od decyzji z 12:15 prośb o zgodę w sprawie DF20 nie wysyłamy. Szkice do grzybowykapelusz oraz autorów z Instagrama i YouTube są osobno w [0008](0008-prosby-o-zgode.md) i nadal czekają na decyzję.

## Opcje

Zakres licencji:

- **A.** Tylko CC0 i CC BY.
- **B.** Także CC BY-NC, wyłącznie do treningu.
- **C.** Także DF20 oraz CC BY-SA.

„Wyłącznie do treningu” i „tylko do treningu” znaczą tu jedno: tych zdjęć nie pokazujemy w aplikacji. Model wydawany w aplikacji może być na nich uczony.

CC BY-SA osobno, bo nie musi iść w parze z DF20 (na przykład Mushroom Observer):

- **SA-A.** Nadal odrzucone.
- **SA-B.** Dopuszczone do treningu modelu wydaniowego. Zdjęć na CC BY-SA nie pokazujemy.

## Rekomendacja

Boty wskazywały **A** (tylko CC0 i CC BY) oraz **SA-A** (CC BY-SA nadal odrzucone). Obowiązuje decyzja poniżej: **C**, a CC BY-SA jest dopuszczona do treningu modelu wydaniowego.

Tamta rekomendacja A była węższa niż notatka w `AGENTS.md` z 2026-10-16 i węższa niż importer z #68. Fetch GBIF i tekst ustawień są nadal przy samym CC0 i CC BY. To opis stanu kodu, nie wybór właściciela.

## Decyzja

**C**, z doprecyzowaniem DF20 z 12:15. Do treningu modelu wydawanego w aplikacji wolno użyć CC0, CC BY, CC BY-NC i CC BY-SA. DF20 jest w zestawie zdjęć treningowych tylko jako wariant B poniżej: treningi testowe, bez wydania.

„Tylko do treningu” przy CC BY-NC, DF20 i CC BY-SA oznacza, że tych zdjęć nie pokazujemy. Galeria, `site/` i porównania zostają przy CC0 albo CC BY. Model nauczony na zdjęciach CC BY-NC albo CC BY-SA może być modelem wydanym w aplikacji. Model z wierszem DF20 nie może.

**CC BY-SA, wariant B** (2026-10-23, 12:17). Status **Podjęta**, jako część tej decyzji, nie jako osobny plik. Przyjmujemy, że share-alike z CC BY-SA nie obejmuje wag modelu (TFLite), więc model trenowany na zdjęciach CC BY-SA można wydać publicznie. Zdjęć CC BY-SA nadal nie pokazujemy w aplikacji. W galerii, na `site/` i w porównaniach zostają CC0 i CC BY. To jest świadomie przyjęte ryzyko prawne.

**DF20, wariant B** (2026-10-23, 12:15). Tylko treningi testowe, bez wydania. Wiersz DF20 zawsze blokuje `shippable`. Prośb o zgodę fotografów DF20 nie wysyłamy. README DF20 („non-commercial research purposes only”), regulamin Svampeatlas (bezpośrednie porozumienie) i raport Zbierania zostają tłem tej decyzji, nie warunkiem późniejszego otwarcia bramki.

**Mushroom Observer, wariant A** (2026-10-23, 14:18). Zdjęcia CC BY-SA z Mushroom Observer zbieramy dla wszystkich gatunków z aplikacji. Tylko do treningu, nigdy do wyświetlania: model wydawany może być na nich uczony, tak jak w wariancie B z 12:17, a zdjęć nie pokazujemy. Trafiają do osobnych plików `_by_sa.csv`, z autorem i wersjonowanym `license_url`. Te zdjęcia mogą też służyć do dozbierania klas, które przekraczają limit udziału z [0001](0001-udzial-zbieracza.md), przy maksymalnie ok. 30 zdjęciach na autora na klasę.

Sformułowanie z 14:18 „SA tylko dla plików `_by_sa.csv`” jest **zastąpione** decyzją z 16:06. Zastąpione jest czytanie tego zdania jako ograniczenia źródła do plików Mushroom Observer.

**Zakres źródeł CC BY-SA, opcja A** (2026-10-23, 16:06). Zdjęcia CC BY-SA mogą pochodzić z dowolnego źródła, nie tylko z Mushroom Observer. Odrzucone **B**: tylko pliki MO `_by_sa.csv`. Konwencja plików zostaje: BY-SA tylko w `_by_sa.csv`, niezależnie od źródła. [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75) nie wymaga zmian.

**Merge [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75)** (2026-10-23, 16:30). Wojtek dał OK na merge. Squash na `main`: [`30165b7569307de4db3b160cdc6ef7dcefae31e6`](https://github.com/lonwi/mushroom-recognition-app/commit/30165b7569307de4db3b160cdc6ef7dcefae31e6). Head PR: `6fd8f8dca6b927f84c79438f87c6b3b2e4a543ae`. CI 4/4 zielone ([run 39953192460](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39953192460)): check, Code quality, python, End-to-end. Approve Quality i PR Review. Wydanie nadal czeka na [#77](https://github.com/lonwi/mushroom-recognition-app/issues/77).

CC BY-NC i CC BY-SA mogą wejść do modelu wydawanego. Zdjęć DF20, NC i SA nie pokazujemy. Źródło zdjęcia CC BY-SA nie otwiera go do wyświetlania.

## Data

Zestaw licencji (wariant C, z CC BY-SA do modelu wydawanego): 2026-10-23, 12:02 czasu polskiego.
DF20, wariant B: 2026-10-23, 12:15 czasu polskiego.
CC BY-SA, wariant B (share-alike nie obejmuje wag): 2026-10-23, 12:17 czasu polskiego.
Mushroom Observer, wariant A: 2026-10-23, 14:18 czasu polskiego.
Zakres źródeł CC BY-SA, opcja A: 2026-10-23, 16:06 czasu polskiego. Sformułowanie z 14:18 „SA tylko dla plików `_by_sa.csv`” zastąpione tą decyzją.
Merge #75: 2026-10-23, 16:30 czasu polskiego. Wydanie czeka na #77.

## Uzasadnienie

Właściciel wybrał CC0, CC BY, CC BY-NC i CC BY-SA do uczenia modelu wydawanego w aplikacji i zostawił przy CC0 albo CC BY tylko zdjęcia pokazywane użytkownikowi. DF20 zostawił przy treningach testowych.

Mushroom Observer, wariant A z 14:18: CC BY-SA z tego źródła jest zbiorem treningowym dla wszystkich gatunków z aplikacji i nie wchodzi do wyświetlania. Osobne pliki `_by_sa.csv` opisują ten zbiór. Przy dozbieraniu klas ponad próg z 0001 zostaje maksymalnie ok. 30 zdjęć na autora na klasę. Sformułowanie z 14:18 „SA tylko dla plików `_by_sa.csv`” jest zastąpione. Od 16:06, opcja A: CC BY-SA może pochodzić z dowolnego źródła, nie tylko z Mushroom Observer. Odrzucone B (tylko pliki MO `_by_sa.csv`). Konwencja plików zostaje: BY-SA tylko w `_by_sa.csv`, niezależnie od źródła. O 16:06 [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75) nie wymagał zmian. O 16:30 Wojtek dał OK na merge w tej postaci. Wydanie nadal czeka na [#77](https://github.com/lonwi/mushroom-recognition-app/issues/77).

Świadomie przyjęte ryzyka:

- CC BY-NC ogranicza komercyjne użycie aplikacji.
- Przy CC BY-SA, wariant B z 12:17: świadomie przyjęte ryzyko prawne. Przyjmujemy, że share-alike nie obejmuje wag modelu (TFLite). Model trenowany na tych zdjęciach można wydać publicznie. Zdjęć CC BY-SA nie pokazujemy.
- Przy DF20 wariant B: tylko treningi testowe, bez wydania. Wiersz DF20 zawsze blokuje `shippable`. Prośb o zgodę nie wysyłamy. README DF20 mówi „non-commercial research purposes only”, regulamin Svampeatlas wymaga bezpośredniego porozumienia, a raport Zbierania to stwierdza.

## Wdrożenie

Część jest na `main` od squashu [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75) (`30165b7`). Zostaje zbiór `_by_sa.csv` i wydanie, które czeka na [#77](https://github.com/lonwi/mushroom-recognition-app/issues/77).

- bramka wydania (`ship_gates`, atrybucja `training_only`), `AGENTS.md` i `settings.dataLicenseBody` weszły w `30165b7`: CC BY-NC i CC BY-SA mogą wejść do modelu wydawanego; DF20 zawsze blokuje `shippable` (wariant B: tylko treningi testowe, bez wydania; prośb o zgodę nie wysyłamy),
- zbiór zdjęć CC BY-SA dla wszystkich gatunków z aplikacji, z dowolnego źródła, nie tylko z Mushroom Observer: osobne pliki `_by_sa.csv` z autorem i wersjonowanym `license_url`; konwencja zostaje, że BY-SA jest tylko w tych plikach, niezależnie od źródła; zdjęć nie pokazujemy; przy dozbieraniu klas ponad limit z [0001](0001-udzial-zbieracza.md) maksymalnie ok. 30 zdjęć na autora na klasę. Tego zbioru w `30165b7` nie ma. Sformułowanie z 14:18 „SA tylko dla plików `_by_sa.csv`” jest zastąpione. O 16:06 #75 nie wymagał zmian pod zakres źródeł; o 16:30 wszedł na `main` bez dalszych zmian.

Na `main` po `30165b7` importer zewnętrznych CSV zapisuje wersjonowane CC BY-NC, CC BY-SA i DF20 jako `training_only`. CC BY-NC i CC BY-SA nie blokują wydania z powodu licencji. Wiersz DF20 zostawia `shippable` na false. Zdjęć NC, SA i DF20 nie pokazujemy. Fetch GBIF nadal przyjmuje tylko CC0 i CC BY. Zdanie, że CC BY-SA odpada i że każdy wiersz `training_only` blokuje `shippable`, opisuje `main` sprzed tego merge, też w [0002](0002-license-url-trening.md).

Przebieg z [0002](0002-license-url-trening.md) dalej idzie bez zewnętrznych CSV. Ta decyzja mówi, jakie licencje wolno wziąć do modelu wydawanego, gdy trening takie CSV obejmuje.

## Weryfikacja

Decyzja zapisana w tym wpisie. Zakres źródeł CC BY-SA nie jest już otwarty: od 16:06 wolno każde źródło, a BY-SA zostaje w `_by_sa.csv`. Merge #75 sprawdzony: squash `30165b7` na `main`, head `6fd8f8d`, CI 4/4 na [runie 39953192460](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39953192460). W `training/import_external.py` i `training/ship_gates.py` z tego commita wersjonowane CC BY-SA jest `training_only` i nie blokuje wydania z powodu licencji, a wiersz DF20 zostawia `shippable` na false. Approve Quality i PR Review są częścią OK z 16:30. Wydanie nadal czeka na [#77](https://github.com/lonwi/mushroom-recognition-app/issues/77). Plików `_by_sa.csv` w tym merge nie ma.
