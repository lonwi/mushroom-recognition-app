# 0004. Dopuszczalne licencje zdjęć w treningu

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

`is_publishable` (galeria atlasu, `site/`, zdjęcia porównań) nie przepuszcza CC BY-NC ani DF20. Bramka wydania nie oznacza modelu jako `shippable`, gdy w atrybucji są wiersze `training_only`. Wydanie komercyjne w `AGENTS.md` wymaga retreningu bez BY-NC i DF20.

`AGENTS.md` zapisuje decyzję właściciela z 2026-10-16: CC BY-NC (samo BY-NC, bez NC-ND i NC-SA) oraz DF20 są zatwierdzone **tylko do treningu**, nigdy do publikacji w aplikacji. Ta notatka nadal opisuje to jako „jeszcze nie wdrożone”. Importer z #68 już te dwie licencje przyjmuje jako `training_only`. Fetch GBIF ich nie przyjmuje. Tekst ustawień w `src/i18n/pl.ts` (`settings.dataLicenseBody`) mówi, że model wolno trenować tylko na CC0 albo CC-BY, bez NC i SA.

CC BY-SA (między innymi część zdjęć Mushroom Observer) jest odrzucone na obu ścieżkach. Testy w `training/tests/test_import_external.py` pilnują, że `CC BY-SA` nie jest mylone z `CC BY`.

[Issue #51](https://github.com/lonwi/mushroom-recognition-app/issues/51) nadal ma otwarty punkt: regulamin Svampeatlas wymaga zgody fotografów, a licencji per zdjęcie w DF20 nie ma. Zgody autorów spoza DF20 są w [0008](0008-prosby-o-zgode.md).

## Opcje

Zakres licencji:

- **A.** Tylko CC0 i CC BY.
- **B.** Także CC BY-NC, wyłącznie do treningu (nie do publikacji i nie do modelu wydaniowego).
- **C.** Także DF20 oraz CC BY-SA.

CC BY-SA osobno, bo nie musi iść w parze z DF20 (na przykład Mushroom Observer):

- **SA-A.** Nadal odrzucone.
- **SA-B.** Tylko do treningu, tak jak dziś CC BY-NC w importerze.

## Rekomendacja

Boty wskazywały **A** (tylko CC0 i CC BY) oraz **SA-A** (CC BY-SA nadal odrzucone). Obowiązuje decyzja poniżej: **C**, a CC BY-SA jest dopuszczona do treningu.

Tamta rekomendacja A była węższa niż notatka w `AGENTS.md` z 2026-10-16 i węższa niż importer z #68. Fetch GBIF i tekst ustawień są nadal przy samym CC0 i CC BY. To opis stanu kodu, nie wybór właściciela.

## Decyzja

**C.** Do treningu wolno użyć CC0, CC BY, CC BY-NC, DF20 i CC BY-SA. Zdjęcia wyświetlane w aplikacji zostają przy CC0 albo CC BY.

CC BY-SA (w tym wariant SA-B z listy opcji) ma status **Podjęta**: jest dopuszczona do treningu jako część tej decyzji, nie jako osobny plik. Nie wchodzi do galerii, strony ani zdjęć porównań.

Właściciel potwierdził wariant C świadomie po informacji, że DF20 wymaga zgody fotografów (regulamin Svampeatlas, brak licencji per zdjęcie). Zgoda nie jest jeszcze zebrana. Przygotowanie szkiców próśb, bez wysyłania, zostaje w [0008](0008-prosby-o-zgode.md) i nadal czeka na decyzję.

Notatka w `AGENTS.md` z 2026-10-16 (BY-NC i DF20 tylko do treningu) jest węższa od tego wyboru: doszło CC BY-SA, też tylko do treningu. Bramka wydania, która blokuje model z wierszami `training_only`, zostaje zgodna z tym, że do wyświetlenia i do wydania nie idą BY-NC, DF20 ani BY-SA. Ten wpis jej nie luzuje.

## Data

2026-10-23, 12:02 czasu polskiego.

## Uzasadnienie

Właściciel wybrał najszerszy wariant treningowy i został przy wąskim zestawie dla zdjęć pokazywanych użytkownikowi. DF20 wchodzi do treningu ze świadomością wymogu zgody fotografów, nie w miejsce tej zgody.

## Wdrożenie

W toku. Importer zewnętrznych CSV już traktuje wersjonowane CC BY-NC i DF20 jako `training_only` ([#68](https://github.com/lonwi/mushroom-recognition-app/pull/68), zacieśnienie w [0002](0002-license-url-trening.md)). CC BY-SA nadal odpada w `training/import_external.py` i w `training/licenses.py`. Fetch GBIF nadal przyjmuje tylko CC0 i CC BY. Tekst ustawień w `src/i18n/pl.ts` nadal mówi, że model wolno trenować tylko na CC0 albo CC-BY. Nie ma PR, który dopina BY-SA i wyrównuje te ścieżki do decyzji.

Pełny trening z [0002](0002-license-url-trening.md) idzie bez zewnętrznych CSV. Ta decyzja go nie rozszerza o BY-NC, DF20 ani BY-SA w tamtym przebiegu.

## Weryfikacja

Decyzja zapisana w tym wpisie. Kodu, który przyjmuje CC BY-SA do treningu, na `main` nie ma.
