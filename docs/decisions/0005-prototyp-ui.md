# 0005. Prototyp UI

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

Osobnego prototypu UI nie ma w repozytorium. Poniżej jest zachowanie aplikacji na `main` przy każdym pytaniu. Żadne z nich nie ma tu rekomendacji botów. Właściciel wybiera kierunek prototypu; dopóki wpis jest otwarty, bot nie przebudowuje tych ekranów.

### GPS: tylko podczas „Wyjście do lasu” czy lokalizacja w tle

W kodzie nie ma trybu „Wyjście do lasu” ani lokalizacji w tle.

Współrzędne czyta `src/services/journalLocation.ts` (`readFindLocation`): zgoda na pierwszy plan (`requestForegroundPermissionsAsync`), odczyt z limitem 12 s, odmowa i timeout dają brak współrzędnych, nigdy współrzędną zastępczą. Zapis do dziennika pyta „Zapisać miejsce znalezienia?” i ma wybór „Użyj lokalizacji” albo „Bez lokalizacji” (`src/i18n/pl.ts`, `src/services/journalEntry.ts`).

`app.json` prosi o lokalizację w użyciu. Test `src/__tests__/permissionLocales.test.ts` wymaga `locationAlwaysPermission: false` oraz `locationAlwaysAndWhenInUsePermission: false`. Android ma `ACCESS_FINE_LOCATION` i `ACCESS_COARSE_LOCATION`, bez uprawnienia w tle.

- **A.** GPS tylko w czasie „Wyjście do lasu”.
- **B.** Lokalizacja w tle.

### Analiza: po jednym zdjęciu czy po trzech

Skaner robi jedno zdjęcie (`takePictureAndAnalyze` w `src/screens/ScannerScreen.tsx`) albo bierze jedno zdjęcie z galerii i woła `classifierService.classifyImage`. Nie ma sekwencji trzech kadrów. Bez pliku `assets/models/mushrooms_model.tflite` skaner zostaje przy „rozpoznawanie niedostępne” i nie podaje gatunku.

- **A.** Analiza po 1 zdjęciu.
- **B.** Analiza po 3 zdjęciach.

### Przyciski alarmowe: dialer czy połączenie od razu

Ekran pomocy (`src/screens/SafetyGuideScreen.tsx`) buduje `tel:` w `toTelUrl` (`src/data/safetyRules.ts`) i otwiera go przez `Linking.openURL`, gdy `canOpenURL` zwróci prawdę. To przekazanie numeru do aplikacji telefonicznej. Aplikacja nie ma własnego wywołania, które zestawia rozmowę z pominięciem systemu. Gdy schemat `tel:` nie działa, użytkownik widzi alert i numer do wybrania ręcznie ([#39](https://github.com/lonwi/mushroom-recognition-app/pull/39)). Numery są tylko w `safetyRules.ts`. Na ekranie są 112 i 999 oraz telefony ośrodków.

- **A.** Przycisk otwiera dialer (tak działa `tel:` dziś).
- **B.** Przycisk dzwoni od razu.

### Pogoda offline: ostatni odczyt z datą czy ukryta

W aplikacji nie ma pogody, ostatniego odczytu ani daty takiego odczytu. Open-Meteo pojawia się tylko jako przykład w [issue #58](https://github.com/lonwi/mushroom-recognition-app/issues/58). Komentarz przy tym issue zaznacza, że prognoza z sieci byłaby osobną decyzją, bo odstaje od „100% offline”. Samo #58 jest odłożone: [0012](0012-backend-58.md).

- **A.** Ostatni odczyt z datą, dostępny offline.
- **B.** Pogoda ukryta.

### Ustawienia pod zębatką w Profilu

Zębatka jest w nagłówku (`App.tsx`, znak ⚙️, etykieta `nav.settings`). Otwiera ekran Ustawienia: język, informacja o modelu offline, licencje zdjęć, autorzy. Ustawienia nie są zakładką na dolnym pasku. Pasek ma Skaner, Atlas, Dziennik i Pomoc. Ekranu Profil nie ma.

- **A.** Ustawienia pod zębatką w Profilu.
- **B.** Bez takiego układu.

### Punkt pierwszej pomocy: „Zabierz resztki grzybów…”

Tego zdania nie ma w `src/`, w `site/` ani w testach. Zasady w `src/data/safetyRules.ts` mówią co innego: grzyba z blaszkami wyjąć w całości, z bulwą i pochwą; grzybów, których się nie zabiera, nie niszczyć. Nie ma punktu pierwszej pomocy z tym sformułowaniem, więc w aplikacji nie ma czego usuwać. Zdanie żyje tylko w prototypie poza repozytorium.

- **A.** Zostać przy zdaniu i znaleźć źródło (parafraza z numerem strony, bez cytatu).
- **B.** Nie wprowadzać tego zdania.

## Opcje

Sześć par powyżej. Każda para jest osobnym wyborem. Jeden wpis trzyma je razem, bo pochodzą z jednego prototypu.

## Rekomendacja

Brak. Boty nie wskazały opcji przy tych pytaniach.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak.

## Weryfikacja

—
