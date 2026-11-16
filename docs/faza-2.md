# Faza 2: Atlas, FTS5, filtry, porównanie 50/50 i Pomoc

Źródło: D13 l. 43–58; D9 §14 Faza 2 l. 624. D9, D13, D8, D5, D1/D2 i `krok2-ocena.md` są dokumentami poza tym repozytorium.

Atlas i Pomoc działają w 100% offline na `species.db`, gotowe do wewnętrznego toru Play. Przełączenie `rewrite/greenfield` na `main` (D-01).

## Zakres

1. **Wyszukiwanie:** `src/core/db/species-search.ts` z `foldForSearch` (z obsługą „ł”) i `buildSpeciesMatch` z bezpiecznym budowaniem zapytań prefiksowych (D8 §3.3, §5.5; D13 l. 49).
2. **Ekran Atlasu** `src/app/(tabs)/index.tsx`: pasek FTS5, chipy filtrów 48 dp, lista kart z `LIMIT 30` (D13 l. 50, 58).
3. **Karta gatunku** `src/app/species/[id].tsx`:
   - opis i zdjęcia z atrybucją;
   - sekcja sobowtórów;
   - ostrzeżenia z `uncovered_look_alikes` (D-11);
   - plakietka statusu wg D-12;
   - **sekcja „Budowa” z rycinami D-17.** Każdy obraz `generated_images` ma widoczną etykietę „ilustracja” i atrybucję bazy. Galeria pokazuje wyłącznie `species_photos`. Testy RNTL sprawdzają etykietę i rozdział galerii od rycin. SVG renderuje `react-native-svg`. Budżet mierzony na Xiaomi, sprawdzenie działania na Huaweiu [Q-D17-10];
   - oznaczenie „nierozpoznawany przez skaner”, gdy `in_model = false` (`krok2-ocena.md` §4 p. 9);
   - brak zielonej plakietki przy `incompleteCard` (D9 S7; D13 l. 51).
4. **Porównanie 50/50** `src/app/look-alikes/[pair-id].tsx`: sztywny podział, bez suwaka (D1/D2 §2.1; D13 l. 52).
5. **Pomoc** `src/app/(tabs)/help.tsx` (nazwa trasy **[OTWARTE Q20]**; rozstrzygnięte — trasa `help`, zob. [docs/decyzje-f0.md](decyzje-f0.md)):
   - statyczna, bez I/O (D9 l. 624; D13 l. 54);
   - numery alarmowe z `src/core/safety/emergency-contacts.ts` tylko po zweryfikowaniu źródła (Q19); bez zweryfikowanego źródła sekcja nie pokazuje numeru;
   - zasady bezpieczeństwa;
   - **lista 67 gatunków znanych modelowi** (D-11);
   - ekran atrybucji (D-06).
6. **Atomy UI w `src/ui/`:**
   - `EdibilityBadge` mapuje 5 statusów na 4 prezentacje + notkę (D-12);
   - `DeadlyBadge`;
   - `LatinBinomial`;
   - stany loading, empty i error (D5 §11).
7. **Storybook 10 (D-14 B):** dodany po rozstrzygnięciu spike'u A. Wariant on-device (`@storybook/react-native` 10.7.1) czy web (`@storybook/react-native-web-vite` 10.6.7) to **[OTWARTE Q21]**. Web nie ma FTS (D9 l. 152), więc Storybook obejmuje tylko `src/ui/`.
8. **Testy Jest:**
   - kontrast WCAG dla par tokenów w 3 motywach;
   - pola dotyku ≥48 dp;
   - jedno źródło numerów alarmowych;
   - mapowanie statusów bez zieleni (D-12; D9 §13.1).
9. **Przełączenie na `main`** jednym PR-em (D9 l. 166, zmienione przez D-01).
10. **Pierwszy build w wewnętrznym torze Play** (Atlas + Pomoc; skaner jako `unavailable` lub „MODEL TESTOWY”).
11. **Strona statyczna `site/`** (dopisane 2026-11-16 na prośbę Wojciecha; w prototypie `site/` w tagu `prototype-final`, usunięte w F0 przy PR #125, gdzie recenzja wpisała lokalizację polityki prywatności i licencji jako warunek przed przełączeniem na `main`):
    - przywrócenie `site/` z `prototype-final` jako punktu wyjścia (`index.html`, `icon.svg`, `css/`, `en/`, `prywatnosc/`, `licencje/`), z treścią zaktualizowaną do nowej aplikacji;
    - opis aplikacji (PL; EN za flagą jak w D-05);
    - polityka prywatności zgodna z D-16 (brak zbierania danych, brak telemetrii) pod stałym publicznym URL, wymaganym w Play Console;
    - licencje i atrybucja zdjęć CC0/CC BY (spójne z ekranem atrybucji z pkt 5, D-06);
    - materiały pod wymagania sklepu: treści do sekcji bezpieczeństwa danych, kontakt, ewentualnie strona usuwania danych (przy braku kont: deklaracja, że nie dotyczy);
    - hosting statyczny (np. GitHub Pages z katalogu `site/`), wybór **[OTWARTE Q26]**;
    - **formularz do uploadu zdjęć: poza MVP strony**. Zmienia założenie D-16 „brak zbierania danych”, więc wymaga osobnej decyzji (zgody, licencja, miejsce przechowywania, nowa wersja polityki), powiązanej z Q23 **[OTWARTE Q27]**.

**[OTWARTE Q19]:** Numery alarmowe pokazujemy tylko po zweryfikowaniu jednego źródła (`src/core/safety/emergency-contacts.ts`). Bez zweryfikowanego źródła sekcja nie pokazuje numeru.

**[OTWARTE Q26]:** Gdzie hostujemy stronę `site/` (GitHub Pages z repo, Cloudflare Pages, inny) i pod jaką domeną?

**[OTWARTE Q27]:** Czy i kiedy na `site/` pojawia się formularz uploadu zdjęć? Wymaga zmiany D-16 (zbieranie danych), zgód i licencji (por. Q23), miejsca przechowywania i nowej wersji polityki prywatności oraz sekcji danych w Play.

## Artefakty

- Ekrany Atlasu, karty, porównania i Pomocy.
- Storybook.
- Testy Jest.
- Build AAB w wewnętrznym torze Play.
- `site/` opublikowana pod publicznym URL (opis, polityka prywatności, licencje).

## Kryteria wyjścia

- Zapytania FTS <50 ms na **Xiaomi** (D13 l. 56).
- Zimny start do interaktywnego Atlasu ≤3,0 s na **Xiaomi** (D9 §4.2).
- Huawei: Atlas, wyszukiwanie, karta i 50/50 działają bez awarii i ANR; czasy raportowane.
- Bramka kontrastu i pól dotyku zielona (D9 l. 624).
- Atlas działa w trybie samolotowym na 3 telefonach.
- `main` = nowa aplikacja.
- Polityka prywatności i licencje dostępne pod publicznym URL przed przełączeniem na `main` (warunek z recenzji PR #125).

## Zależności

F0 (tokeny, styling), F1 (`species.db`).

## Ryzyka

- Przycięcia listy przy zdjęciach; mitygacja: paginacja, miniatury WebP, indeksy (D13 l. 58).
- Wydajność na Huaweiu P smart 2019 (najgorszy przypadek): akceptowalna wolniejsza praca, byle bez awarii.

## Q13 i Q20 już w repozytorium

Plan powyżej zostawia oba pytania otwarte. To nie jest nowe wymaganie. `docs/decyzje-f0.md` już je rozstrzyga.

- **Q20** (pkt 5, nazwa trasy Pomocy): „W Fazie 0 trasa to `help` (`src/app/(tabs)/help.tsx`), bo zakładka nazywa się Pomoc. D8 i D13 pisały `safety`. Zmiana nazwy przed Fazą 2 jest tania.”
- **Q13** (faza 3, odmontowanie `CameraView`): „`Platform.OS` i `Platform.select` są dozwolone tylko w `src/infra/platform/`. To jedyny szew, w którym w Fazie 3 może wylądować odmontowanie `CameraView` po utracie fokusu. Ekran skanera tego nie robi.”
