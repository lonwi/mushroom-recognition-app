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

CC BY-SA (między innymi część zdjęć Mushroom Observer) jest odrzucone na obu ścieżkach. Testy w `training/tests/test_import_external.py` pilnują, że `CC BY-SA` nie jest mylone z `CC BY`.

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

CC BY-SA (wariant SA-B) ma status **Podjęta**: jest dopuszczona do treningu modelu wydaniowego jako część tej decyzji, nie jako osobny plik.

**DF20, wariant B** (2026-10-23, 12:15). Tylko treningi testowe, bez wydania. Wiersz DF20 zawsze blokuje `shippable`. Prośb o zgodę fotografów DF20 nie wysyłamy. README DF20 („non-commercial research purposes only”), regulamin Svampeatlas (bezpośrednie porozumienie) i raport Zbierania zostają tłem tej decyzji, nie warunkiem późniejszego otwarcia bramki.

CC BY-NC i CC BY-SA mogą wejść do modelu wydawanego. Zdjęć DF20, NC i SA nie pokazujemy.

## Data

Zestaw licencji (wariant C, z CC BY-SA do modelu wydawanego): 2026-10-23, 12:02 czasu polskiego.
DF20, wariant B: 2026-10-23, 12:15 czasu polskiego.

## Uzasadnienie

Właściciel wybrał najszerszy zestaw zdjęć do uczenia modelu wydawanego w aplikacji i zostawił przy CC0 albo CC BY tylko zdjęcia pokazywane użytkownikowi.

Świadomie przyjęte ryzyka:

- CC BY-NC ogranicza komercyjne użycie aplikacji.
- Przy CC BY-SA nie wiadomo, czy share-alike obejmuje wagi modelu.
- Przy DF20 wariant B: tylko treningi testowe, bez wydania. Wiersz DF20 zawsze blokuje `shippable`. Prośb o zgodę nie wysyłamy. README DF20 mówi „non-commercial research purposes only”, regulamin Svampeatlas wymaga bezpośredniego porozumienia, a raport Zbierania to stwierdza.

## Wdrożenie

W toku. Zostaje:

- zmiana bramki wydania (`ship_gates`, obsługa atrybucji `training_only`) przez PR Trenowania: CC BY-NC i CC BY-SA mogą wejść do modelu wydawanego; DF20 zawsze blokuje `shippable` (wariant B: tylko treningi testowe, bez wydania; prośb o zgodę nie wysyłamy),
- aktualizacja `AGENTS.md` (notatka o retreningu bez NC/DF20),
- aktualizacja `settings.dataLicenseBody`.

Na `main` importer zewnętrznych CSV już zapisuje wersjonowane CC BY-NC i DF20 jako `training_only`. CC BY-SA nadal odpada w `training/import_external.py` i w `training/licenses.py`. Fetch GBIF nadal przyjmuje tylko CC0 i CC BY. Bramka wydania nadal nie oznacza modelu jako `shippable`, gdy w atrybucji są wiersze `training_only`. To jest stan sprzed tej decyzji, opisany też w [0002](0002-license-url-trening.md).

Przebieg z [0002](0002-license-url-trening.md) dalej idzie bez zewnętrznych CSV. Ta decyzja mówi, jakie licencje wolno wziąć do modelu wydawanego, gdy trening takie CSV obejmuje.

## Weryfikacja

Decyzja zapisana w tym wpisie. Na `main` nie ma kodu, który przyjmuje CC BY-SA do treningu i puszcza przez bramkę wydania model z wierszami CC BY-NC albo CC BY-SA, przy tym że DF20 zawsze blokuje `shippable`.
