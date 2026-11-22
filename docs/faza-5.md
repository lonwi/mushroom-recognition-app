# Faza 5: model docelowy, recenzja, publiczne wydanie

Źródło: faza dodana w KROK 4, bo załącznik D13 jej nie ma. Wynika z D-08, D-13 i „Harmonogramu wydań” w `krok3-decyzje.md`. D9, D10, D13 i `krok3-decyzje.md` są dokumentami poza tym repozytorium.

Podmiana modelu na docelowy przez nowe wydanie oraz zaliczenie bramki D-13.

## Zakres

1. Odbiór M5: `.tflite` + `model-manifest.json` z `calibrated: true`, `ood.*`, `perClassMetrics`, `shipGates` i `sha256`.
2. CI waliduje manifest i uruchamia P3 na Xiaomi Mi 11 Lite 5G (referencyjny). Na Huaweiu działa smoke bez awarii, a na S23 test GPU delegate.
3. Sprawdzenie `shipGates` (D-13):
   - zero pewnych pomyłek „trujący jako jadalny”;
   - wskaźnik groźnych par ≤0,05 (D9 l. 359);
   - osobno dla 8 klas śmiertelnych.
4. **Podpis recenzenta mykologa** na treści atlasu, tabeli statusów (D-12), `uncovered_look_alikes` (D-11) i `dangerousGenera` **[OTWARTE Q6]**.
5. Przegląd wersji bibliotek przed wydaniem, jeden raz (`krok3-decyzje.md`, „Harmonogram wydań”).
6. Polityka prywatności i sekcja danych w Play, przy założeniu „brak zbierania danych” (D-16). Strona `site/` powstaje w F2 (pkt 11); tu tylko przegląd i aktualizacja treści przed publicznym wydaniem.
7. **Publiczne wydanie Androida.**

## Kryteria wyjścia

- `shipGates` zaliczone.
- Podpis recenzenta.
- Karta modelu opublikowana w repo.
- Budżety zielone.

## Ścieżka awaryjna

Gdy model nie zaliczy `shipGates`, wydajemy Atlas + Pomoc ze skanerem `unavailable` (U4; D10 l. 215, 296), o ile się na to zgodzisz **[OTWARTE Q11]**.
