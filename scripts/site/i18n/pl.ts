export const pl = {
  common: {
    appName: 'Grzybobranie AI',
    tagline:
      'Atlas i rozpoznawanie grzybów na telefonie. Działa offline, bez konta i bez wysyłania zdjęć do sieci.',
    previewBadge: 'Wersja rozwojowa (Greenfield)',
    contactEmail: 'hello@astigmatic.dev',
    repoUrl: 'https://github.com/lonwi/mushroom-recognition-app',
    issuesUrl: 'https://github.com/lonwi/mushroom-recognition-app/issues',
    skipToContent: 'Przejdź do treści',
    copyright: '© 2026 Grzybobranie AI. Wszelkie prawa zastrzeżone.',
  },
  nav: {
    home: 'Start',
    privacy: 'Prywatność',
    dataDeletion: 'Usuwanie danych',
    licenses: 'Licencje',
  },
  meta: {
    home: {
      title: 'Grzybobranie AI — Atlas i rozpoznawanie grzybów offline',
      description:
        'Grzybobranie AI: aplikacja na telefon do rozpoznawania grzybów offline. Lokalny model na urządzeniu, atlas gatunków i pomoc. Nie zastępuje grzyboznawcy.',
    },
    privacy: {
      title: 'Polityka prywatności — Grzybobranie AI',
      description:
        'Polityka prywatności i bezpieczeństwo danych Grzybobranie AI. Rozpoznawanie na urządzeniu, brak konta, brak telemetrii i analityki.',
    },
    dataDeletion: {
      title: 'Usuwanie danych — Grzybobranie AI',
      description:
        'Zasady i procedura usuwania danych dla aplikacji Grzybobranie AI zgodnie z wymogami Google Play Store.',
    },
    licenses: {
      title: 'Licencje i atrybucje — Grzybobranie AI',
      description:
        'Atrybucje zdjęć CC0 i CC BY, licencja Apache-2.0 dla kodu bazowego Keras oraz prawa autorskie aplikacji Grzybobranie AI.',
    },
    notFound: {
      title: 'Nie znaleziono strony (404) — Grzybobranie AI',
      description: 'Żądana strona nie została znaleziona w serwisie Grzybobranie AI.',
    },
  },
  safety: {
    title: 'Ostrzeżenie o bezpieczeństwie',
    lead: 'Aplikacja nie zastępuje grzyboznawcy ani klasyfikatora grzybów.',
    neverEat:
      'Nigdy nie spożywaj grzyba wyłącznie na podstawie wskazań aplikacji lub modelu sztucznej inteligencji. Model może pomylić gatunek ze względu na oświetlenie, stopień dojrzałości, zanieczyszczenia lub uszkodzenia owocnika.',
    poisonSuspected:
      'W przypadku podejrzenia zatrucia grzybami należy natychmiast wezwać pomoc medyczną, dzwoniąc pod numer alarmowy lub zgłosić się do najbliższego szpitalnego oddziału ratunkowego / oddziału toksykologii. Wszyscy, którzy spożywali posiłek, powinni zgłosić się do lekarza, nawet jeśli nie wykazują objawów.',
    sanepidFree:
      'Bezpłatną ocenę zbioru robią grzyboznawcy i klasyfikatorzy w stacji sanitarno-epidemiologicznej (Sanepid). Jeśli masz jakąkolwiek wątpliwość, zostaw grzyba w lesie.',
    gisSourceLabel: 'Źródło zasad bezpieczeństwa:',
    gisSourceName: 'Główny Inspektorat Sanitarny (GIS), „Bezpieczne grzybobranie”',
    gisSourceUrl: 'https://www.gov.pl/web/gis/bezpieczne-grzybobranie',
    noVerdictNotice:
      'Aplikacja podpowiada prawdopodobną nazwę gatunku, ale NIGDY nie wydaje werdyktu o jadalności. Informacje o statusie gatunku pochodzą z weryfikowanej bazy wiedzy.',
  },
  home: {
    heroTitle: 'Grzybobranie AI',
    heroLead:
      'Nowoczesna aplikacja terenowa wspierająca oznaczanie grzybów w Polsce i Europie Środkowej. Działa w pełni offline, bez rejestracji i bez wysyłania zdjęć do chmury.',
    statusNotice:
      'Aplikacja w przygotowaniu do publikacji w Google Play na platformę Android. Kod i rozwój są prowadzone publicznie.',
    pillarsTitle: 'Trzy filary aplikacji',
    scannerTitle: 'Rozpoznawanie na urządzeniu',
    scannerDesc:
      'Model sieci neuronowej uruchamiany jest bezpośrednio na telefonie za pomocą TensorFlow Lite. Twoje zdjęcia nie trafiają na zewnętrzne serwery. W kompilacjach bez skalibrowanego modelu aplikacja uczciwie informuje: „rozpoznawanie niedostępne”.',
    atlasTitle: 'Atlas gatunków',
    atlasDesc:
      'Karty grzybów z polskimi i łacińskimi nazwami, kluczami cech (hymenofor, trzon, kapelusz), miesiącami owocowania oraz zestawieniem ryzykownych sobowtórów. Zawiera ostrzeżenia o gatunkach śmiertelnie trujących.',
    helpTitle: 'Pomoc i bezpieczeństwo',
    helpDesc:
      'Kompendium zasad bezpiecznego grzybobrania, wytyczne Głównego Inspektoratu Sanitarnego, wykaz procedur alarmowych oraz dostęp do atrybucji autorów zdjęć.',
    offlineFirstTitle: 'Prywatność i praca offline',
    offlineFirstDesc:
      'W lesie często nie ma zasięgu sieci komórkowej. Grzybobranie AI ma wszystkie niezbędne dane i model zaszyte w instalatorze aplikacji. Nie wymaga konta, nie zbiera danych telemetrycznych i szanuje Twoją prywatność.',
  },
  privacy: {
    title: 'Polityka prywatności',
    effectiveDate: 'Data wejścia w życie: 18 listopada 2026 roku (Wersja 1.0.0)',
    lead: 'Dokument określa zasady prywatności w aplikacji mobilnej Grzybobranie AI oraz na niniejszej stronie informacyjnej, zgodnie z RODO i wymaganiami Google Play Console.',
    adminTitle: 'Administrator danych',
    adminDesc:
      'Administratorem aplikacji i serwisu jest Wojciech Bubolka. Kontakt w sprawach związanych z prywatnością i działaniem aplikacji: hello@astigmatic.dev.',
    dataCollectionTitle: 'Brak gromadzenia danych osobowych',
    dataCollectionDesc:
      'Aplikacja Grzybobranie AI została zaprojektowana w architekturze „privacy by design” (zasada D-16 projektu):',
    dataCollectionPoints: [
      'Brak kont użytkowników: aplikacja nie wymaga logowania, podawania adresu e-mail ani numeru telefonu.',
      'Brak serwera w chmurze: zdjęcia z aparatu i galerii są przetwarzane wyłącznie lokalnie w pamięci urządzenia przez silnik inferencji.',
      'Brak zewnętrznej telemetrii i analityki: nie korzystamy z Google Analytics, Firebase, Facebook SDK ani innych bibliotek profilujących.',
      'Brak plików cookies: niniejsza strona WWW jest w pełni statyczna i nie zapisuje żadnych ciasteczek ani identyfikatorów śledzących.',
    ],
    permissionsTitle: 'Uprawnienia aplikacji na Androidzie',
    permissionsDesc: 'Aplikacja prosi wyłącznie o uprawnienia niezbędne do działania jej funkcji:',
    permissionCamera:
      'Aparat (CAMERA): umożliwia wykonanie zdjęcia grzyba w module Skanera. Zdjęcie trafia do lokalnego modelu i nie opuszcza telefonu.',
    permissionStorage:
      'Pamięć / Zdjęcia (READ_MEDIA_IMAGES): umożliwia wskazanie zapisanego zdjęcia z galerii w celu analizy na urządzeniu.',
    diagnosticsTitle: 'Lokalny dziennik diagnostyczny',
    diagnosticsDesc:
      'Aplikacja posiada lokalny bufor diagnostyczny o ograniczonym rozmiarze (maksymalnie 256 KiB) zapisywany wyłącznie w pamięci wewnętrznej telefonu. Służy wyłącznie rozwiązywaniu problemów technicznych. Dziennik nie zawiera współrzędnych geograficznych ani zdjęć. Eksport dziennika następuje WYŁĄCZNIE na jawne żądanie użytkownika (poprzez systemowy arkusz udostępniania na ekranie Ustawień). Jest to jedyny przypadek, w którym jakiekolwiek dane opuszczają telefon z woli użytkownika.',
    dataSafetyTitle: 'Bezpieczeństwo danych w Google Play (Data Safety)',
    dataSafetyLead:
      'Poniższe zestawienie stanowi oficjalną deklarację dla sekcji Data Safety w sklepie Google Play:',
    dataSafetyTable: {
      category: 'Kategoria',
      collected: 'Czy zbierane?',
      shared: 'Czy udostępniane podmiotom trzecim?',
      purpose: 'Cel',
      rowPersonal: 'Dane osobowe (imię, e-mail, telefon, ID)',
      rowPhotos: 'Zdjęcia i pliki multimedialne',
      rowLocation: 'Lokalizacja (dokładna lub przybliżona)',
      rowDiagnostics: 'Dzienniki diagnostyczne i awarie',
      no: 'NIE',
      noSharing: 'NIE',
      localOnly: 'Przetwarzanie wyłącznie lokalnie na urządzeniu (brak wysyłania)',
      optInShare: 'Opcjonalny ręczny eksport przez użytkownika w celach serwisowych',
    },
    dataDeletionLinkText:
      'Więcej informacji o usuwaniu danych znajdziesz na dedykowanej stronie Usuwanie danych.',
  },
  dataDeletion: {
    title: 'Procedura usuwania danych',
    lead: 'Zasady usuwania danych użytkownika aplikacji Grzybobranie AI zgodnie z wytycznymi Google Play.',
    noRemoteDataTitle: 'Brak danych na serwerach zewnętrznych',
    noRemoteDataDesc:
      'Aplikacja Grzybobranie AI nie wymaga zakładania konta i nie posiada chmurowej bazy danych użytkowników. W konsekwencji na serwerach dewelopera nie są przechowywane żadne dane, które wymagałyby zdalnego usunięcia.',
    howToDeleteTitle: 'Jak usunąć wszystkie dane z urządzenia?',
    howToDeleteDesc:
      'Wszystkie dane generowane przez aplikację (wybrany motyw, ustawienia, lokalny dziennik techniczny) znajdują się wyłącznie w chronionym katalogu aplikacji na Twoim smartfonie. Możesz je w każdej chwili bezpowrotnie usunąć na dwa sposoby:',
    stepClearData:
      '1. Wyczyszczenie pamięci podręcznej i danych: przejdź do Ustawienia telefonu → Aplikacje → Grzybobranie AI → Pamięć i pamięć podręczna → Wyczyść pamięć / Wyczyść dane.',
    stepUninstall:
      '2. Odinstalowanie aplikacji: usunięcie aplikacji z telefonu powoduje natychmiastowe i bezpowrotne usunięcie wszystkich powiązanych z nią plików i konfiguracji z pamięci urządzenia.',
    contactQuestion:
      'W przypadku pytań dotyczących prywatności lub zarządzania danymi skontaktuj się z nami pod adresem:',
  },
  licenses: {
    title: 'Licencje i atrybucje',
    lead: 'Informacje o prawach autorskich, licencjach kodu źródłowego, wag modelu oraz autorach wykorzystanych zdjęć.',
    codeTitle: 'Kod źródłowy i biblioteki bazowe',
    codeKerasDesc:
      'Fragmenty kodu potoku trenującego oraz architektura bazowa MobileNetV3 korzystają z kodu biblioteki Keras na licencji Apache License, Version 2.0 (Copyright © Keras team). Pełny tekst licencji: https://www.apache.org/licenses/LICENSE-2.0.',
    codeAppDesc:
      'Autorski kod aplikacji mobilnej Grzybobranie AI oraz skryptów pomocniczych w niniejszym repozytorium pozostaje chroniony prawem autorskim. Wszelkie prawa zastrzeżone przez właściciela repozytorium (Wojciech Bubolka).',
    modelWeightsTitle: 'Wagi modelu sztucznej inteligencji',
    modelWeightsDesc:
      'Wagi startowe modelu MobileNetV3 (wytrenowane na ImageNet) podlegają warunkom licencyjnym projektu ImageNet dla celów badawczo-edukacyjnych. Wagi finalne modelu Grzybobranie AI, wytrenowane przez twórców projektu, stanowią utwór autorski: wszelkie prawa zastrzeżone. Z wag modelu produkcyjnego wykluczone są dane Danish Fungi (DF20), dla których projekt nie posiada komercyjnych zgód fotografów.',
    photosTitle: 'Zdjęcia grzybów w aplikacji',
    photosDesc:
      'Wszystkie fotografie prezentowane w aplikacji (w kartach atlasu i modułach pomocniczych) pochodzą wyłącznie z licencjonowanego zbioru lonwi/grzybobranie-zdjecia na platformie Hugging Face, wyselekcjonowanego z baz iNaturalist oraz GBIF na licencjach:',
    photoLicensesList: [
      'Creative Commons CC0 (domena publiczna)',
      'Creative Commons Attribution (CC BY 4.0 oraz wcześniejsze wersje) — wymaga zachowania oznaczenia autorstwa i linku do licencji.',
    ],
    photosAttributionNote:
      'Aplikacja rygorystycznie odrzuca w widokach dla użytkownika licencje z ograniczeniem niekomercyjnym (CC BY-NC) oraz licencje Share-Alike (CC BY-SA). Poniżej znajduje się zestawienie autorów i licencji poszczególnych fotografii.',
    emptyAttributionsNotice:
      'W niniejszej kompilacji deweloperskiej baza zdjęć lokalnych jest w trakcie zasilania z repozytorium Hugging Face. Pełna lista atrybucji zostanie opublikowana przed wydaniem produkcyjnym.',
  },
  notFound: {
    title: '404 — Nie znaleziono strony',
    lead: 'Strona, której szukasz, nie istnieje lub została przeniesiona.',
    backHome: 'Wróć do strony głównej',
  },
} as const;
