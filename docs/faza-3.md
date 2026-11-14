# Faza 3: skaner i ekran wyników na modelach zastępczych

Źródło: D13 l. 60–84; D9 §8; U3. D9, D13, D8, D11 i `krok2-ocena.md` są dokumentami poza tym repozytorium.

Pełny potok skanera:

- 1–3 zdjęcia jednego okazu;
- bramka OOD na każdym zdjęciu przed fuzją;
- fuzja;
- procenty z degradacją;
- top-3;
- ostrzeżenia.

Działa i jest przetestowany na trzech warstwach modeli zastępczych (D-08), a podmiana modelu wymaga tylko plików `.tflite` + `model-manifest.json`.

## Zakres

1. **Ładowanie manifestu:**
   - `src/core/ai/model-manifest.ts` waliduje JSON Schema v1 (D-07);
   - sprawdza `sha256` pliku `.tflite` i `minAtlasVersion` względem `species.db` (D9 §9.4);
   - wylicza **flagi możliwości**: `canShowPercent`, `canFuse[2|3]`, `scannerAvailable` (reguły degradacji D-07; U4).
2. **Przechwytywanie** (`use-scan-session-store`):
   - maszyna stanów `capturing → analyzing → result | failed` z `runId`;
   - sesja trzyma tylko URI + logity (D8 §4.4; D9 K1, l. 292);
   - `expo-camera` + `expo-image-picker` (D9 l. 143);
   - odmontowanie `CameraView` po utracie fokusu na Androidzie (D9 l. 300). Czy to zachowanie łamie zasadę z D-02 C, to **[OTWARTE Q13]**.
3. **Potok obrazu:** `photo-decoder` (≥448 px) → `image-preprocessing.ts` wg sekcji `preprocessing` manifestu (rozmiar, kolejność kanałów, skala, filtr). **Wartości dostarcza bot trenujący (M0)** (U5). Kod nie zawiera stałych `(px/127.5)−1` (D9 K2) inaczej niż jako domyślny przypadek testowy.
4. **Inferencja:**
   - `model-runtime.ts` z singletonem i rozgrzewką na tensorze zerowym;
   - asynchroniczne `model.run`, CPU przez `delegates: []` (D9 §8.5; fast-tflite 3 API, `krok2-ocena.md` §0);
   - GPU delegate tylko dla S23 i tylko po raporcie z urządzenia dla danego `sha256` (D9 l. 327; D-15).
5. **Decyzja dla jednego zdjęcia:** energia `E = −T·logsumexp(z/T)` (D9 l. 333). Bez klas zbiorczych (U5) są tylko dwie reguły:
   - (1) `E > energyThreshold` daje `rejected/out_of_distribution`;
   - (2) `p_top1 < minTop1Prob` daje `rejected/unclear`;
   - w pozostałych przypadkach `candidates` (top-3) + `dangerous_genus` + `low_confidence`.

   Nazwy statusów odrzucenia do ustalenia w schemacie typów (D11 §6.1) **[OTWARTE Q22]**.

6. **Fuzja (D-09; D9 §8.7 l. 346–353):**
   - tylko zaakceptowane zdjęcia;
   - wagi `c_v = 1 − H_v/ln K`;
   - progi z `ood.fusion[m]`;
   - brak progu dla `m` daje decyzje pojedynczych zdjęć obok siebie;
   - `partial_evidence`, `views_disagree` (bez łącznego procentu);
   - R4 (`dangerous_genus` z dowolnego zdjęcia).
7. **Mapowanie wyniku:** `resolve-candidates.ts` łączy `classId` z `model_class_species` i gatunkami (grupa przy klasie wielogatunkowej) oraz ze statusem z `species.db` (U6; D8 §6.8; D-04).
8. **Ekran wyników `ResultSheet`:**
   - ostrzeżenie `dangerous_genus` **nad** wynikiem;
   - opis słowny pewności + procent wg D-10 (zaokrąglenie 5 pp, limit „>95%”);
   - stały komunikat `safety.notAVerdict` (D13 l. 69);
   - ostrzeżenia `uncovered_look_alikes` (D-11);
   - plakietki wg D-12;
   - etykieta „mało danych dla tego gatunku” z `perClassMetrics` (D-10);
   - przycisk do porównania 50/50;
   - informacja „model zna 67 gatunków” z linkiem (D-11).
9. **Modele zastępcze (D-08):**
   - warstwa 1: fake runtime z fixture'ami;
   - warstwa 2: `scripts/make-dummy-tflite.py` generuje atrapę o kształcie wejścia i wyjścia z manifestu testowego, z wariantami manifestu: pełny, bez kalibracji, bez progów fuzji, z niezgodnym `sha256`;
   - warstwa 3: checkpointy pośrednie od bota (M1–M3) w buildach testowych ze znakiem „MODEL TESTOWY” (D9 l. 329).

   Build produkcyjny odrzuca manifest testowy (D-08).

10. **Parytet:** P1 (preprocessing) i P2 (decyzja + fuzja) jako testy Jest na wspólnych fixture'ach z `ml/` (D9 §8.4). P3 ≥0,99 na urządzeniu dopiero z checkpointem od bota.

## Artefakty

- `src/core/ai/**`: manifest, preprocessing, runtime, energy-gate, logit-fusion, session-decision, resolve-candidates.
- Ekran skanera i `ResultSheet`.
- Atrapa `.tflite` i manifesty testowe.
- Fixture'y P1/P2.
- Raport autotestu na urządzeniu.

## Kryteria wyjścia

- 100% zgodności P1/P2 na fixture'ach.
- Wszystkie warianty degradacji przetestowane (Jest + RNTL).
- Na **Xiaomi Mi 11 (referencyjny)** (D9 §4.2; D-15):
  - skan 1 zdjęcia ≤2,0 s p95;
  - **sesja 3 zdjęć ≤5 s p95**;
  - blokada JS ≤100 ms;
  - pamięć ≤400 MB, wzrost ≤10 MB po 20 skanach.
- Na **Huaweiu P smart 2019** (najgorszy przypadek): sesja 1–3 zdjęć kończy się poprawnym `RecognitionDecision`:
  - bez OOM, ubicia procesu i ANR;
  - czasy p50/p95 raportowane bez progu blokującego;
  - opcjonalny próg awaryjny to **[OTWARTE Q4]**.
- Na **S23**: test GPU delegate. Wynik zgodny z CPU w tolerancji P2, z raportem per `sha256`.
- P3 ≥0,99 z checkpointem M1/M2, jeśli jest dostępny; inaczej przechodzi do F4.

## Zależności

- **M0 (manifest v1)** jest wymagane.
- M1 dla P3.
- F1 dla mapowania.
- F0 spike B.

## Ryzyka

- Preprocessing bota inny niż w D9: mitygacja przez manifest (U5).
- Brak zbioru OOD oznacza brak `energyThreshold`, więc skaner jest `unavailable` (D-07).
- Wydajność CPU na Huaweiu P smart 2019 (Kirin 710): może być znacznie wolniej, co jest akceptowane. Krytyczny jest tylko brak OOM i ANR.
- Wersja LiteRT eksportu niezgodna z LiteRT 2.1.3 w fast-tflite **[OTWARTE Q5]**.

## Ścieżka równoległa: pilotaż B ilustracji ze zdjęć (D-17)

Zakończony **przed zamkniętą betą**. `d17-obrazy.md` jest dokumentem poza tym repozytorium.

**Cel.** Sprawdzić, czy obraz główny i zbliżenia cech wygenerowane z prawdziwych zdjęć CC0/CC BY nie zmyślają cech, i wybrać model.

**Zakres.**

- 5 gatunków (`d17-obrazy.md` §6): _Imleria badia_, _Leccinum scabrum_, _Suillus luteus_, _Boletus edulis_, _Hydnum repandum_. Rezerwa: _Xerocomus subtomentosus_, _Suillus grevillei_.
- Test A/B: GPT-Image-2.6 Sunburst vs Qwen-Image-Edit-2511, szablon z §3.4.
- Recenzent ocenia obrazy wg checklisty z §3.6.

**Kryteria wyjścia.**

- Wybrany model.
- Odsetek obrazów `approved`, przy którym pilotaż B wchodzi do bety, ustalasz Ty [Q-D17-11].
- Obrazy odrzucone nie trafiają do APK.
- Jeśli pilotaż nie przejdzie, beta idzie tylko z rycinami (A).

**Zależności.** F1 (`generated_images`), F2 (UI etykiety), recenzent (Q6).
