# 0003. Ostrzeżenie o hełmówce w porównaniu maślanki i opieńki

- **Status:** Podjęta (wdrożenie w toku)
- **Data wpisu:** 2026-10-23

## Kontekst

[PR #71](https://github.com/lonwi/mushroom-recognition-app/pull/71) jest otwarty jako szkic. Tytuł: „Porównanie graficzne: maślanka wiązkowa i opieńka miodowa”. CI na ostatnim przebiegu tego PR jest zielone (Actions [run 39929579877](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39929579877)). PR nie jest zmergowany. Na `main` nie ma `src/components/SulphurHoneyComparison.tsx` ani `src/data/sulphurHoneyComparison.ts`.

PR dokłada zestawienie zdjęć maślanki wiązkowej i opieńki miodowej (pierścień, blaszki, łuski) oraz podpowiedź przy chipie „Jest pierścień”. Opis PR mówi wprost, że sformułowania o hełmówce zostają bez zmian względem [#63](https://github.com/lonwi/mushroom-recognition-app/issues/63).

Karty na `main` już wspominają hełmówkę jadowitą (*Galerina marginata*):

- `hypholoma_fasciculare` w `warningNotes`: rośnie na pniakach razem z opieńkami, a hełmówka bywa na tym samym drewnie.
- `armillaria_mellea`: ryzyko pomyłki ze śmiertelnie trującą hełmówką, różnice odesłane na kartę hełmówki.
- Osobna karta `galerina_marginata` jest w atlasie.

Otwarta jest treść **w samym porównaniu** maślanka wiązkowa kontra opieńka, nie pytanie, czy hełmówka w ogóle jest w atlasie.

## Opcje

- **A.** Jedno zdanie po polsku i po angielsku oraz test.
- **B.** Trzecia kolumna ze zdjęciami hełmówki.
- **C.** Własny tekst właściciela.

## Rekomendacja

Boty wskazywały **A** (jedno zdanie i test). Obowiązuje decyzja poniżej: **B**.

## Decyzja

**B.** Trzecia kolumna ze zdjęciami hełmówki jadowitej (*Galerina marginata*). Zdjęcia w tej kolumnie tylko na licencji CC0 albo CC BY.

Podpisy i nagłówek zatwierdza właściciel przed merge. Bez tego zatwierdzenia PR się nie merguje.

## Data

2026-10-23, 11:56 czasu polskiego.

## Uzasadnienie

Właściciel wybrał kolumnę ze zdjęciami zamiast jednego zdania (opcja A) i zamiast własnego tekstu bez zdjęć (opcja C). Licencja zdjęć w kolumnie jest węższa niż zakres treningu z [0004](0004-licencje-zdjec.md): do wyświetlenia w aplikacji zostają CC0 i CC BY.

## Wdrożenie

W toku. Na GitHubie [PR #71](https://github.com/lonwi/mushroom-recognition-app/pull/71) nadal jest szkicem porównania maślanki i opieńki, bez trzeciej kolumny. Ostatnia aktualizacja tej gałęzi przed tą decyzją: 2026-10-23, 11:07 czasu polskiego, head `3b46580ae6ec89a6e0159affd7b74b9fb028a036`. Merge czeka na zatwierdzenie podpisów i nagłówka przez właściciela.

## Weryfikacja

Decyzja zapisana w tym wpisie. Trzeciej kolumny nie było na gałęzi #71 w chwili sprawdzenia (2026-10-23, około 12:03 czasu polskiego).
