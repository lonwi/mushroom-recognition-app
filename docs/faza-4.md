# Faza 4: stabilizacja terenowa, Maestro, zamknięta beta

Źródło: D13 l. 86–90; D9 §14 Faza 8 „Wydanie” l. 630. D9, D13, D8, D10 i `krok2-ocena.md` są dokumentami poza tym repozytorium.

Pełna ścieżka offline zweryfikowana na 3 telefonach. Zamknięta beta z grzybiarzami zbiera dane terenowe (D-13 C).

## Zakres

1. **Maestro smoke (D9 §13.1; D13 l. 88):**
   - `setAirplaneMode`;
   - wyszukiwanie z polskimi znakami;
   - karta → 50/50;
   - skan przez `addMedia` z 1, 2 i 3 zdjęciami, w tym zdjęcie „nie-grzyb” (oczekiwane odrzucenie) i para niezgodnych zdjęć;
   - Pomoc.
2. **Testy terenowe na 3 telefonach:**
   - **Xiaomi Mi 11 Lite 5G (referencyjny):** budżety D9 i sesja 3 zdjęć ≤5 s p95. Do tego zabijanie procesu przez MIUI w trakcie sesji skanu, a po powrocie brak „wiszącego” wyniku dzięki `runId` (D8 §4.4);
   - **Huawei P smart 2019:** pełna ścieżka offline działa wolniej, ale bez awarii, OOM i ANR;
   - **S23:** GPU delegate z raportem (D9 l. 327).
3. **Zamknięta beta** w Play (tor zamknięty) z grzybiarzami:
   - Play Console vitals (D-16);
   - lokalny dziennik diagnostyczny eksportowany ręcznie;
   - kanał zbierania zdjęć z terenu do bota zdjęciowego. Licencja i zgody uczestników to **[OTWARTE Q23]**. Jeśli kanałem ma być formularz na `site/`, najpierw decyzja Q27 i aktualizacja polityki prywatności. **[OTWARTE Q27]:** Czy i kiedy na `site/` pojawia się formularz uploadu zdjęć? Wymaga zmiany D-16 (zbieranie danych), zgód i licencji (por. Q23), miejsca przechowywania i nowej wersji polityki prywatności oraz sekcji danych w Play;
   - polityka prywatności z `site/` (F2) podpięta w Play Console przed startem toru zamkniętego.
4. **Huawei a GMS:** według GSMArena P smart 2019 ma Google Play Services, co trzeba potwierdzić w F0. Jeśli GMS nie ma, build trafia na urządzenie przez APK z `adb` (testy, Maestro) i nie dostarcza vitals **[OTWARTE Q3]**.
5. **Karta modelu (D-13):** `docs/model-card.md` z metrykami z manifestu, osobno dla 8 klas śmiertelnych i słabych klas (`krok2-ocena.md` §4 p. 9; D10 §7).
6. **Dokumentacja:** `AGENTS.md`, `docs/ARCHITECTURE.md` (D13 l. 89).

## Kryteria wyjścia

- Wszystkie joby CI i Maestro zielone.
- Zero awarii krytycznych w vitals przez uzgodniony okres bety **[OTWARTE Q24]**.
- Budżety D9 + 5 s p95 na Xiaomi Mi 11 Lite 5G.
- Huawei: zero awarii, OOM i ANR w pełnej ścieżce.
- Karta modelu dla kandydata M4.

## Zależności

F2, F3, M4 (kandydat modelu dla sensownej bety skanera), **wynik pilotażu B (D-17)**: decyzja, czy ilustracje ze zdjęć wchodzą do bety.

## Ryzyka

- Beta z modelem pośrednim może zebrać mylące opinie o trafności; mitygacja: znak „MODEL TESTOWY” i brief dla testerów.
- Ryzyko prawne zdjęć od testerów (Q23).
