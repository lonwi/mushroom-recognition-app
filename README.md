# Grzybobranie AI 🍄📱
### Aplikacja mobilna na Android & iOS do rozpoznawania grzybów w trybie offline (On-Device AI)

Aplikacja stworzona z myślą o miłośnikach leśnych wypraw i zbierania grzybów w Polsce i Europie Środkowej. Działa w **100% offline** (w głębi lasu, bez dostępu do Internetu ani zasięgu GSM).

---

## 🌟 Kluczowe Funkcjonalności

1. **Lokalny Skaner AI (TensorFlow Lite / On-Device ML)**:
   - Natychmiastowe rozpoznawanie ze zdjęć z aparatu lub galerii.
   - Wyświetlanie stopnia pewności modelu (Confidence %) oraz alternatywnych hipotez.
   - Wskaźnik czasu inferencji tensora (np. ~120-140 ms na urządzeniu).
   - Celownik z podpowiedziami kadrowania makro (kapelusz, spód, trzon) oraz wbudowana latarka leśna.

2. **Zaawansowany System Bezpieczeństwa & Alerty Sobowtórów**:
   - Wyraźne oznaczenia jadalności: 🟢 **Jadalny**, 🟡 **Niejadalny**, 🔴 **Trujący**, ☠️ **Śmiertelnie trujący**.
   - **Karta Zagrożeń i Sobowtórów**: Natychmiastowe ostrzeżenie przy gatunkach łatwych do pomylenia (np. *Czubajka kania vs. Muchomor sromotnikowy / zielonawy*, *Borowik vs. Goryczak żółciowy*, *Pieprznik jadalny vs. Lisówka pomarańczowa*).
   - Zestawienie kluczowych różnic anatomicznych (pierścień ruchomy, pochwa u nasady, kolor blaszek, sinienie rurek).

3. **Offline Atlas Grzybów**:
   - Kompletna baza taksonomiczna z opisami w języku polskim.
   - Wyszukiwarka po nazwach polskich, łacińskich i nazwach potocznych (np. "prawdziwek", "sowa", "szatan").
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

## 🧠 Integracja z Własnym Modelem TFLite

W celu podmiany lub dotrenowania własnego modelu:
1. Skonwertuj model Keras/PyTorch do formatu `.tflite` z kwantyzacją (INT8/FP16) o wymiarach wejściowych `[1, 224, 224, 3]`.
2. Umieść plik modelu w katalogu `assets/models/mushrooms_model.tflite`.
3. Przy generowaniu natywnym (`pnpm expo run:android` / `pnpm expo run:ios`) model jest automatycznie obsługiwany przez `react-native-fast-tflite` z akceleracją sprzętową GPU/NPU.

---

## ⚠️ Ostrzeżenie Prawne i Medyczne
Aplikacja ma charakter edukacyjny i pomocniczy. Nigdy nie należy spożywać dziko rosnących grzybów wyłącznie na podstawie wskazań algorytmu sztucznej inteligencji. W razie wątpliwości skonsultuj zebrane okazy z grzyboznawcą w stacji sanitarno-epidemiologicznej (Sanepid).
