# Rejestr decyzji

Jedno miejsce na decyzje właściciela projektu (Wojciech). Bot koordynujący decyzje dopisuje i aktualizuje wpisy. Inne boty czytają rejestr przed pracą, która dotyka otwartego tematu, i nie wdrażają opcji, której tu jeszcze nie ma.

Wpisy opisują stan sprawdzony w kodzie, w pull requestach i w issue. Gdy kod i starsza notatka się rozmijają, wpis mówi o obu.

## Nazwy plików

`NNNN-krotki-slug.md`

- `NNNN` to cztery cyfry, od `0001`, bez dziur i bez zmiany numeru po nadaniu.
- Slug jest krótki, po polsku, małymi literami, bez ogonków, słowa łączone myślnikiem.
- Nowy temat dostaje następny numer. Nie edytuje się cudzego numeru po to, żeby „posprzątać” kolejność.
- Decyzja zastąpiona zostaje w starym pliku ze statusem **Zastąpiona** i linkiem do nowego numeru. Starego pliku się nie usuwa.

## Statusy

| Status | Kiedy |
|---|---|
| Oczekuje na decyzję | Właściciel jeszcze nie wybrał opcji. |
| Oczekuje na właściciela | Jedyny brakujący krok jest po stronie właściciela (ustawienie, którego bot nie klika). |
| Podjęta | Wybór jest zapisany, a zmiany w kodzie albo w ustawieniu jeszcze nie ma. Dopisek `(wdrożenie w toku)` oznacza, że praca już idzie, ale nie jest na `main`. |
| Wdrożona | Zmiana jest na `main` albo ustawienie już działa. Dopisek w nawiasie, gdy skutek jeszcze trwa, na przykład `Wdrożona (trening w toku)`. |
| Zweryfikowana | Wdrożenie zostało sprawdzone i temat jest zamknięty. |
| Zastąpiona | Nowszy wpis zastępuje ten. |
| Odrzucona | Tej opcji nie robimy. |
| Odłożona | Świadomie później. We wpisie jest warunek, jeśli właściciel go podał. |

## Szablon wpisu

```markdown
# NNNN. Tytuł

- **Status:** …
- **Data wpisu:** RRRR-MM-DD

## Kontekst

Co jest dziś w repozytorium, w PR albo w issue. Linki.

## Opcje

- **A.** …
- **B.** …

## Rekomendacja

Która opcja i czyja (boty / brak).

## Decyzja

Co wybrał właściciel. Przy braku wyboru: „Brak.”

## Data

Data i godzina decyzji (czas Polski). Przy braku: „—”.

## Uzasadnienie

Dlaczego tak. Przy braku: „—”.

## Wdrożenie

PR i commit albo „Brak.”

## Weryfikacja

Co sprawdzono i czego jeszcze nie. Przy braku: „—”.
```

## Indeks

Stan na 2026-10-31.

| Nr | Wpis | Status |
|---|---|---|
| 0001 | [Udział jednego zbieracza w klasie (20% czy 50%)](0001-udzial-zbieracza.md) | Oczekuje na decyzję (limit 0.20; #76 wstrzymany; liczby z runu 1e6f6e7, decyzja 14:17) |
| 0002 | [https `license_url`, surowsza licencja duplikatu i trening](0002-license-url-trening.md) | Wdrożona (trening w toku) |
| 0003 | [Ostrzeżenie o hełmówce w porównaniu maślanki i opieńki](0003-ostrzezenie-helmowki.md) | Podjęta (wdrożenie w toku; teksty 14:15; #71 czeka na wysyp) |
| 0004 | [Dopuszczalne licencje zdjęć w treningu, w tym CC BY-SA](0004-licencje-zdjec.md) | Podjęta (wdrożenie w toku; MO BY-SA 14:18; zakres BY-SA spoza MO otwarty) |
| 0005 | [Prototyp UI](0005-prototyp-ui.md) | Oczekuje na decyzję |
| 0006 | [GitHub Pages: źródło GitHub Actions](0006-github-pages.md) | Wdrożona |
| 0007 | [Własne zdjęcia Wojciecha w treningu](0007-wlasne-zdjecia.md) | Oczekuje na decyzję |
| 0008 | [Szkice próśb o zgodę autorów](0008-prosby-o-zgode.md) | Oczekuje na decyzję |
| 0009 | [Unsplash](0009-unsplash.md) | Oczekuje na decyzję |
| 0010 | [Drobne treści atlasu z #51](0010-drobne-atlas-51.md) | Oczekuje na decyzję |
| 0011 | [Cortinarius orellanus jako bloker wydania](0011-orellanus-bloker.md) | Oczekuje na decyzję |
| 0012 | [Backend i powiadomienia (#58)](0012-backend-58.md) | Odłożona |
| 0013 | [Timeout 15 s w testach ekranów (#54)](0013-timeout-testow-54.md) | Oczekuje na decyzję |
| 0014 | [Poniedziałkowe przeglądy SOLID/DRY i bezpieczeństwa](0014-przeglady-poniedzialkowe.md) | Oczekuje na decyzję |
| 0015 | [Własne zdjęcia Wojciecha w treningu: później](0015-wlasne-zdjecia-pozniej.md) | Odłożona |
| 0016 | [Proporcje train/val/test w training/split.py](0016-proporcje-splitu.md) | Podjęta |
| 0017 | [React Doctor](0017-react-doctor.md) | Zatwierdzona, czeka na wdrożenie |
| 0018 | [Limit autora i Wikimedia Commons](0018-limit-autora-commons.md) | Podjęta (wdrożenie w toku) |
| 0019 | [Adresy http z GBIF (#84)](0019-adresy-http-gbif.md) | Zatwierdzona, czeka na wdrożenie |
| 0020 | [Zdjęcia z kategorii Wikimedia Commons (`commons_category`)](0020-commons-category.md) | Zatwierdzona, czeka na wdrożenie |
