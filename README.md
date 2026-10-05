# Grzybobranie AI 🍄📱
### Aplikacja mobilna na Android & iOS do rozpoznawania grzybów w trybie offline (On-Device AI)

Aplikacja stworzona z myślą o miłośnikach leśnych wypraw i zbierania grzybów w Polsce i Europie Środkowej. Działa w **100% offline** (w głębi lasu, bez dostępu do Internetu ani zasięgu GSM).

---

## 🌟 Kluczowe Funkcjonalności

1. **Skaner (aparat i galeria)**:
   - Zdjęcie z aparatu lub galerii nie jest dziś klasyfikowane. W repozytorium nie ma modelu, który czyta piksele: jest tylko `assets/models/labels.json`, a `react-native-fast-tflite` nie jest podłączony.
   - Wynik mówi wprost, że rozpoznawanie jest niedostępne. Aplikacja nie podaje gatunku ani procentu pewności i nie opisuje tego ekranu jako TFLite.
   - Błąd aparatu lub wyboru zdjęcia nie podstawia ilustracji zastępczej.
   - Skróty gatunków otwierają kartę w atlasie i są opisane jako przykłady z atlasu, a nie jako wynik skanowania.
   - Celownik z podpowiedziami kadrowania makro (kapelusz, spód, trzon) oraz latarka zostają na ekranie aparatu.

2. **Zaawansowany System Bezpieczeństwa & Alerty Sobowtórów**:
   - Wyraźne oznaczenia jadalności: 🟢 **Jadalny**, 🟡 **Niejadalny**, 🔴 **Trujący**, ☠️ **Śmiertelnie trujący**.
   - **Karta Zagrożeń i Sobowtórów**: Natychmiastowe ostrzeżenie przy gatunkach łatwych do pomylenia (np. *Czubajka kania vs. Muchomor sromotnikowy / zielonawy*, *Borowik vs. Goryczak żółciowy*, *Pieprznik jadalny vs. Lisówka pomarańczowa*).
   - Zestawienie kluczowych różnic anatomicznych (pierścień ruchomy, pochwa u nasady, kolor blaszek, sinienie rurek).

3. **Offline Atlas Grzybów**:
   - Kompletna baza taksonomiczna z opisami w języku polskim.
   - Wyszukiwarka po nazwach polskich, łacińskich i nazwach potocznych (np. "prawdziwek", "sowa", "kurka"). Borowik szatański nie jest w bazie; „szatan” nie jest nazwą goryczaka.
   - Filtrowanie po jadalności oraz typie hymenoforu (Rurki/"gąbka", Blaszki, Listewki, Inne).
   - Kalendarz miesięcy występowania oraz charakterystyka siedliska leśnego.

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

---

## Model na urządzeniu — jeszcze niepodłączony

Rozpoznawanie gatunku ze zdjęcia jest celowo wyłączone. W katalogu `assets/models/` jest tylko `labels.json` (lista klas). Nie ma pliku `mushrooms_model.tflite` i biblioteka `react-native-fast-tflite` nie jest zależnością tej aplikacji. Skaner nie buduje nietrenowanej sieci i nie zgaduje gatunku z adresu zdjęcia.

Podłączenie prawdziwego modelu (wagi, odczyt pikseli, ścieżka „nie wiem” / „to nie jest grzyb”) to osobna zmiana. Do tego czasu skaner odmawia odpowiedzi zamiast pokazywać pewność.

---

## ⚠️ Ostrzeżenie Prawne i Medyczne
Aplikacja ma charakter edukacyjny i pomocniczy. Nigdy nie należy spożywać dziko rosnących grzybów wyłącznie na podstawie wskazań algorytmu sztucznej inteligencji. W razie wątpliwości skonsultuj zebrane okazy z grzyboznawcą w stacji sanitarno-epidemiologicznej (Sanepid).
