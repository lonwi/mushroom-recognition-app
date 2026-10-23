# Grzybobranie AI 🍄📱
### Aplikacja mobilna na Android & iOS do rozpoznawania grzybów w trybie offline (On-Device AI)

Aplikacja stworzona z myślą o miłośnikach leśnych wypraw i zbierania grzybów w Polsce i Europie Środkowej. Działa w **100% offline** (w głębi lasu, bez dostępu do Internetu ani zasięgu GSM).

Decyzje właściciela (co wybrano, kiedy, dlaczego i czy jest już wdrożone) są w [rejestrze decyzji](docs/decisions/README.md).

---

## 🌟 Kluczowe Funkcjonalności

1. **Skaner (aparat i galeria)**:
   - Zdjęcie z aparatu lub galerii nie jest dziś klasyfikowane. `assets/models/labels.json` to kontrakt klas, nie sieć. Pliku `mushrooms_model.tflite` nie ma, bramka odrzuceń nie jest skalibrowana, a skaner zostaje przy „rozpoznawanie niedostępne”.
   - Potok treningu (MobileNetV3-Small na licencji Apache-2.0, eksport TFLite) jest w `training/`. Opis: `training/README.md`. Dziś kod przyjmuje tylko zdjęcia CC0 i CC-BY, a zatwierdzone BY-NC/DF20 tylko do treningu opisuje `AGENTS.md`.
   - Gdy skalibrowany model zostanie dołączony, skaner pokaże trzy kandydatury z pewnością, bez oceny jadalności. Rodzaj Amanita, Cortinarius, Galerina lub Gyromitra albo niska pewność wymuszają komunikat o grzyboznawcy i Sanepidzie. Zdjęcie kota albo inny wynik poza rozkładem nie dostaje nazwy gatunku.
   - Błąd aparatu lub wyboru zdjęcia nie podstawia ilustracji zastępczej.
   - Skróty gatunków otwierają kartę w atlasie i są opisane jako przykłady z atlasu, a nie jako wynik skanowania.
   - Celownik z podpowiedziami kadrowania makro (kapelusz, spód, trzon) oraz latarka zostają na ekranie aparatu.

2. **Zaawansowany System Bezpieczeństwa & Alerty Sobowtórów**:
   - Wyraźne oznaczenia jadalności: 🟢 **Jadalny**, 🟡 **Niejadalny**, 🔴 **Trujący**, ☠️ **Śmiertelnie trujący**.
   - **Karta Zagrożeń i Sobowtórów**: Natychmiastowe ostrzeżenie przy gatunkach łatwych do pomylenia (np. *Czubajka kania vs. Muchomor sromotnikowy / zielonawy*, *Borowik vs. Goryczak żółciowy*, *Pieprznik jadalny vs. Lisówka pomarańczowa*).
   - Zestawienie kluczowych różnic anatomicznych (pierścień ruchomy, pochwa u nasady, kolor blaszek, sinienie rurek).

3. **Offline Atlas Grzybów**:
   - Krótki zestaw kart z `src/data/mushrooms.ts`, a nie kompletny klucz do grzybów Polski. Nie zastępuje grzyboznawcy ani punktu kontroli grzybów w Sanepidzie. Liczba kart na ekranie bierze się z tej bazy.
   - Wyszukiwarka po nazwach polskich, łacińskich i nazwach potocznych (np. "prawdziwek", "sowa", "kurka"). Borowik szatański nie jest w bazie. Słowo „szatan” bywa ludową nazwą goryczaka, ale oznacza też inny gatunek, więc to wyszukiwanie nie otwiera karty goryczaka.
   - Filtrowanie po klasie jadalności (jadalne, niejadalne, trujące, śmiertelnie trujące) oraz po spodzie kapelusza (rurki, blaszki, kolce, listewki, inny spód). Filtry łączą się ze sobą i pokazują liczbę pasujących kart.
   - Kalendarz miesięcy występowania oraz charakterystyka siedliska leśnego.
   - Zielona sekcja „W kuchni” jest tylko przy dopracowanej karcie jadalnej. Niejadalne, trujące i śmiertelnie trujące jej nie dostają.

4. **Dziennik Leśnych Zbiorów (GPS Offline)**:
   - Zapisywanie znalezionych okazów ze zdjęciem, datą i czasem.
   - Zapis współrzędnych geograficznych GPS, by móc wrócić w ulubione grzybowe miejsca.

5. **Poradnik Bezpieczeństwa & Ośrodki Toksykologiczne**:
   - "Złote zasady grzybiarza".
   - Opis głównych zespołów zatruć (amatoksynowy, muskarynowy, gastryczny).
   - Bezpośrednie numery telefonów alarmowych (112 oraz całodobowe ośrodki toksykologiczne w Warszawie, Krakowie, Gdańsku, Poznaniu, Łodzi, Wrocławiu).

6. **Zmiana języka aplikacji**:
   - Umożliwia zmianę języka aplikacji pomiędzy językiem polskim a angielskim.
   - Domyślnym językiem jest język polski.
   - Ustawienia języka zapisywane są w pamięci podręcznej aplikacji (AsyncStorage).

7. **Poradnik jak przygotować grzyby do spożycia**
   - Poradnik pokazuje jak przygotować grzyby do spożycia.
   - Poradnik jak czyścić grzyby do spożycia.
   - Poradnik jak przechowywać grzyby do spożycia.

---

## 🚀 Uruchomienie Projektu

### Wymagania wstępne
- Zainstalowany **Node.js** (wersja 18+ / 24+).
- Zainstalowany menedżer pakietów **pnpm** (wersja 9+ / 12+).
- Zainstalowana aplikacja **Expo Go** na telefonie (Android lub iOS) lub skonfigurowany emulator.

### Krok 1: Instalacja zależności
```bash
pnpm install
```

### Krok 2: Uruchomienie deweloperskie
```bash
pnpm start
```
Zeskanuj wyświetlony kod QR za pomocą aplikacji **Expo Go** (Android) lub aplikacji **Aparat** (iOS).

### Krok 3: Uruchomienie testów jednostkowych i komponentowych (RTL + Jest)
```bash
pnpm test
```

### Krok 4: Uruchomienie katalogu komponentów Storybook
```bash
pnpm storybook
```
W celu zbudowania wersji produkcyjnej Storybook:
```bash
pnpm build-storybook
```

### Krok 5: Uruchomienie testów E2E (Playwright)
```bash
pnpm test:e2e
```

### Wydanie (EAS)

Sklepy i tag `vX.Y.Z` (równy `expo.version`) opisuje [docs/RELEASE.md](docs/RELEASE.md): `eas init`, sekret `EXPO_TOKEN` w środowiskach `release-build` i `production`, oraz rulesety na `main` i na tagi `v*`.

---

## Model na urządzeniu

Rozpoznawanie jest wyłączone, dopóki w repozytorium nie ma skalibrowanego `assets/models/mushrooms_model.tflite`. Sam `labels.json` nie jest modelem. `react-native-fast-tflite` jest zależnością pod przyszły plik; bez pliku skaner go nie ładuje i nie podaje gatunku ani procentu pewności.

Trening opisuje `training/README.md`. Wagi z ImageNet (Keras MobileNetV3-Small, Apache-2.0) służą tylko jako inicjalizacja. Kod dziś przyjmuje zdjęcia treningowe wyłącznie z CC0 i CC-BY. Zatwierdzoną zmianę (BY-NC i DF20 tylko do treningu, nigdy do publikacji) opisuje `AGENTS.md`, który jest dokumentem nadrzędnym. Fetch zapisuje atrybucję w `training/data/attributions.jsonl` (katalog roboczy, gitignore). Eksport, który przejdzie bramki, kopiuje ją do `assets/models/attributions.jsonl` obok modelu.

Na maszynie z GPU:

```bash
pip install -r training/requirements.txt
python training/run_pipeline.py all
```

Kopiowanie modelu do aplikacji (`export --install-into-app`) działa dopiero wtedy, gdy progi w `training/ship_gates.py` przejdą na zmierzonych liczbach. Tu ich nie ma. Kwantyzacja (`--also-export int8` albo `dynamic`) jest osobnym plikiem i trafia do aplikacji tylko z `--select-quantized`, gdy te same progi przejdzie.

Build deweloperski EAS (nie Expo Go) może zmierzyć delegata GPU na Androidzie i Core ML na iOS. Wersja produkcyjna używa delegata tylko wtedy, gdy manifest ma zaliczoną zgodność z CPU na tym modelu. W przeciwnym razie zostaje CPU. W buildzie deweloperskim skaner pokazuje czas samego `model.run` i pozwala zmierzyć ten sam kadr na delegacie albo na CPU. Czas zostaje na telefonie.

---

## ⚠️ Ostrzeżenie Prawne i Medyczne
Aplikacja ma charakter edukacyjny i pomocniczy. Nigdy nie należy spożywać dziko rosnących grzybów wyłącznie na podstawie wskazań algorytmu sztucznej inteligencji. W razie wątpliwości skonsultuj zebrane okazy z grzyboznawcą w stacji sanitarno-epidemiologicznej (Sanepid).
