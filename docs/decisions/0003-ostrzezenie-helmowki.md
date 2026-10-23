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

**B** (2026-10-23, 11:56). Trzecia kolumna ze zdjęciami hełmówki jadowitej (*Galerina marginata*). Zdjęcia w tej kolumnie tylko na licencji CC0 albo CC BY.

**Teksty kolumny, 1:1** (2026-10-23, 14:15). Właściciel zaakceptował nagłówek, cztery podpisy i uwagę. W tej postaci wchodzą do [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71).

Nagłówek:

- PL: „Hełmówka jadowita (Galerina marginata) – śmiertelnie trująca”
- EN: "Deadly Galerina (Galerina marginata) – deadly poisonous"

Podpisy:

1. PL: „Kępa na próchniejącym drewnie, jak u opieńki.” EN: "Cluster on rotting wood, like honey fungus."
2. PL: „Cienki, nietrwały pierścień; blaszki żółtawe do rdzawobrązowych.” EN: "Thin, fragile ring; yellowish to rusty-brown gills."
3. PL: „Strefa pierścienia często z rdzawym nalotem zarodników.” EN: "Ring zone often dusted with rusty spores."
4. PL: „Gładki kapelusz, wyraźnie jaśniejący przy wysychaniu.” EN: "Smooth cap that fades noticeably as it dries."

Uwaga:

- PL: „Zawiera amatoksyny. Żadna pojedyncza cecha, w tym pierścień, nie potwierdza opieńki.”
- EN: "Contains amatoxins. No single feature, including the ring, confirms honey fungus."

**Wysyp zarodników, wariant B** (2026-10-23, 14:16). Szukamy osobnego zdjęcia wysypu na licencji CC0 albo CC BY. Zdjęcie 3 zostaje podpisem strefy pierścienia. [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71) czeka na to zdjęcie i do tego czasu się nie merguje.

## Data

Kolumna ze zdjęciami: 2026-10-23, 11:56 czasu polskiego.
Teksty 1:1: 2026-10-23, 14:15 czasu polskiego.
Wysyp, wariant B: 2026-10-23, 14:16 czasu polskiego.

## Uzasadnienie

Właściciel wybrał kolumnę ze zdjęciami zamiast jednego zdania (opcja A) i zamiast własnego tekstu bez zdjęć (opcja C). Licencja zdjęć w kolumnie jest węższa niż zakres treningu z [0004](0004-licencje-zdjec.md): do wyświetlenia w aplikacji zostają CC0 i CC BY. Teksty z 14:15 są przyjęte dosłownie. Wysyp ma być osobnym zdjęciem, nie zastępuje strefy pierścienia na zdjęciu 3.

## Wdrożenie

W toku. [PR #71](https://github.com/lonwi/mushroom-recognition-app/pull/71) jest szkicem („Porównanie graficzne: maślanka, opieńka i hełmówka jadowita”). W gałęzi są już pliki `galerina-skupisko.webp`, `galerina-pierscien.webp`, `galerina-strefa.webp` i `galerina-kapelusz.webp`. Teksty z 14:15 mają wejść 1:1. Brakuje osobnego zdjęcia wysypu (CC0 albo CC BY). Zdjęcie 3 zostaje strefą pierścienia. Merge czeka na to zdjęcie.

## Weryfikacja

Teksty są zapisane w tym wpisie jako zaakceptowane. Nie sprawdzano, czy gałąź #71 ma już dokładnie te zdania. Zdjęcia wysypu w tym PR nie ma: cztery pliki hełmówki to kępa, pierścień, strefa i kapelusz.
