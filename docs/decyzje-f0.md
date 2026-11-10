# Rozstrzygnięcia Fazy 0, których plan nie domykał

## Q12 — co zostaje z `ml/`

Trening jest poza tym repozytorium. Zostaje zamrożony kontrakt prototypu opisany w `ml/OUTDATED.md`: fixture'y, `ship_gates.py` i moduły, bez których ten plik się nie importuje, oraz `ml/tests/test_contract.py`.

Z testu wypadły ścieżki instalacji do `src/services/*` oraz wołania `fetch_gbif` i `prepare_data`. Logiki bramek nie przepisujemy. Liczby 54 wyjść, `not_a_mushroom`, `unknown_mushroom` i `class_cap` 2500 są oznaczone jako przestarzałe. Obowiązuje manifest v1: do 67 wyjść gatunkowych, bez klas zbiorczych, gatunki bez danych w `uncoveredSpecies`.

## Q13 — „bez API dostępnego wyłącznie na Androidzie”

Zakres reguły ESLint:

1. `Platform.OS` i `Platform.select` są dozwolone tylko w `src/infra/platform/`. To jedyny szew, w którym w Fazie 3 może wylądować odmontowanie `CameraView` po utracie fokusu. Ekran skanera tego nie robi.
2. Importy z `react-native`, które istnieją tylko na Androidzie albo tylko na iOS (`PermissionsAndroid`, `ToastAndroid`, `DrawerLayoutAndroid`, `ProgressBarAndroid`, `DatePickerAndroid`, `TimePickerAndroid`, `BackHandler`, `ActionSheetIOS`, `PushNotificationIOS`, `DynamicColorIOS`), są zakazane wszędzie, także w szwie. Zamiast nich jest moduł Expo (`expo-camera`, `expo-sharing`, `expo-sqlite`, `expo-file-system`).
3. Moduł Expo, który wewnątrz ma implementację na platformę, nie jest „API tylko dla Androida”. Wołamy jego publiczne API bez `if (android)`.
4. Buildu iOS w CI nie ma (D-02). Identyfikator pakietu iOS zostaje w `app.json`, żeby nie zgubić tożsamości aplikacji. Nagłówek ustawień to `Pressable` 48 dp, nie `Stack.Toolbar`, bo toolbar z Expo Router jest tylko na iOS.

## Q14 — gdzie leży dziennik diagnostyczny

Plik `diagnostics/log.txt` w katalogu dokumentów aplikacji (`expo-file-system`, `Paths.document`), nie wiersz w `kv-store`.

`kv-store` trzyma ustawienia i musi być odczytany synchronicznie przy starcie, zanim motywy migną. Dziennik jest dopisywanym tekstem, który użytkownik oddaje przez arkusz udostępniania. Mieszanie go z ustawieniami puchnie w SQLite i utrudnia eksport.

Limit: 256 KiB. Po przekroczeniu wypadają najstarsze linie. Linia z parą współrzędnych albo z `lat`/`lon` jest zastępowana znacznikiem, zanim trafi do pliku. Dziennik nie dostaje URI zdjęć.

## Q20 — nazwa trasy Pomocy

W Fazie 0 trasa to `help` (`src/app/(tabs)/help.tsx`), bo zakładka nazywa się Pomoc. D8 i D13 pisały `safety`. Zmiana nazwy przed Fazą 2 jest tania. Numery alarmowe nie są w tej wersji: mają mieć jedno źródło dopiero w fazie treści, po weryfikacji.
