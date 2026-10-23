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

**Wysyp zarodników, wariant B** (2026-10-23, 14:16). Osobne zdjęcie wysypu na licencji CC0 albo CC BY. Zdjęcie 3 zostaje podpisem strefy pierścienia.

**Zdjęcie wysypu** (2026-10-23, 16:06). Właściciel wybrał **A**: [zdjęcie iNaturalist 170500861](https://www.inaturalist.org/photos/170500861), autorka Shirley Zundell, CC BY 4.0. Obserwacja ma numer [102041261](https://www.inaturalist.org/observations/102041261). Numer 170500861 jest numerem zdjęcia, nie obserwacji. To osobne zdjęcie wysypu. Zdjęcie 3 zostaje strefą pierścienia.

Odrzucone:

- **B.** [iNaturalist, obserwacja 457520866](https://www.inaturalist.org/observations/457520866), Ben Mitchell, CC BY 4.0.
- **C.** Szukamy dalej.

**Teksty cech, bez zmian** (2026-10-23, 16:07). Właściciel zaakceptował bez zmian teksty kolumny hełmówki z heada [`dfdf15f`](https://github.com/lonwi/mushroom-recognition-app/commit/dfdf15f0a803d6b98407254efe1a84a29edfc3d8) (`dfdf15f0a803d6b98407254efe1a84a29edfc3d8`): pierścień, blaszki, wysyp, kapelusz, trzon i drewno. Ten sam head: wysyp maślanki „Wysyp jest purpurowobrązowy.” Title i lead zostają otwarte.

Hełmówka, PL (`comparison.sulphurHoney.traits.*.galerina`):

- Pierścień: „Pierścień bywa cienki i błoniasty albo tylko włóknista strefa. Często jest białawy i rdzawo przyprószony zarodnikami, a z wiekiem może zniknąć.”
- Blaszki: „Blaszki są przyrośnięte albo lekko zbiegające. Zaczynają jako żółtawe do kremowo-ochrowych, a później stają się rdzawobrązowe.”
- Wysyp: „Wysyp jest rdzawobrązowy. Bez porównania łatwo pomylić go z purpurowobrązowym wysypem maślanki. Biały wysyp wskazuje opieńkę.”
- Kapelusz: „Kapelusz jest gładki, a wilgotny bywa lepki. Barwa od miodowożółtej do cynamonowej i rudobrązowej. Przy wysychaniu blednie, więc wygląda dwubarwnie. Brzeg czasem jest delikatnie prążkowany.”
- Trzon: „Trzon jest cienki i często wygięty. Poniżej pierścienia jest podłużnie włóknisty, z białawymi włókienkami, i ciemnieje od podstawy w górę.”
- Drewno: „Saprotrof na butwiejącym drewnie iglastym i liściastym, zwykle w kępkach. Samo drewno i kępka nie odróżniają jej od opieńki.”

Hełmówka, EN:

- Ring: "The ring may be a thin membrane or only a fibrous zone. It is often whitish and dusted rusty by spores, and it can disappear with age."
- Gills: "The gills are attached or slightly run down the stem. They start yellowish to cream-ochre and later turn rusty brown."
- Spore print: "The spore print is rusty brown. Without a comparison it is easy to mix up with the purple-brown print of sulphur tuft. A white print points to honey fungus."
- Cap: "The cap is smooth, and sticky when moist. Colour runs from honey yellow to cinnamon and red-brown. It pales as it dries, so it can look two-toned. The margin is sometimes faintly striate."
- Stem: "The stem is thin and often curved. Below the ring it is longitudinally fibrous, with whitish fibrils, and it darkens from the base upward."
- Wood: "A saprobe on rotting conifer and hardwood, usually in clumps. Wood and a clump alone do not separate it from honey fungus."

Wysyp maślanki (`comparison.sulphurHoney.traits.spore.hypholoma`): PL „Wysyp jest purpurowobrązowy.” EN "The spore print is purple-brown."

Title (`comparison.sulphurHoney.title`) i lead (`comparison.sulphurHoney.lead`) na tym headzie nie są tą decyzją. Zostają otwarte.

## Data

Kolumna ze zdjęciami: 2026-10-23, 11:56 czasu polskiego.
Teksty 1:1: 2026-10-23, 14:15 czasu polskiego.
Wysyp, wariant B: 2026-10-23, 14:16 czasu polskiego.
Zdjęcie wysypu, opcja A: 2026-10-23, 16:06 czasu polskiego. 170500861 to numer zdjęcia, obserwacja to 102041261.
Teksty cech hełmówki i wysyp maślanki: 2026-10-23, 16:07 czasu polskiego. Title i lead nadal otwarte.

## Uzasadnienie

Właściciel wybrał kolumnę ze zdjęciami zamiast jednego zdania (opcja A) i zamiast własnego tekstu bez zdjęć (opcja C). Licencja zdjęć w kolumnie jest węższa niż zakres treningu z [0004](0004-licencje-zdjec.md): do wyświetlenia w aplikacji zostają CC0 i CC BY. Teksty z 14:15 są przyjęte dosłownie. Wysyp ma być osobnym zdjęciem, nie zastępuje strefy pierścienia na zdjęciu 3. O 16:06 właściciel wybrał zdjęcie A (zdjęcie iNaturalist 170500861, obserwacja 102041261, Shirley Zundell, CC BY 4.0) i odrzucił B oraz dalsze szukanie. O 16:07 zaakceptował bez zmian teksty cech hełmówki i zdanie „Wysyp jest purpurowobrązowy.” z heada `dfdf15f`. Title i lead zostawił otwarte.

## Wdrożenie

W toku. [PR #71](https://github.com/lonwi/mushroom-recognition-app/pull/71) jest szkicem („Porównanie graficzne: maślanka, opieńka i hełmówka jadowita”). W gałęzi są już pliki `galerina-skupisko.webp`, `galerina-pierscien.webp`, `galerina-strefa.webp` i `galerina-kapelusz.webp`. Teksty z 14:15 oraz teksty cech hełmówki i wysyp maślanki z `dfdf15f` (decyzja 16:07) mają zostać bez zmian. Title i lead są nadal otwarte. Zdjęcie 3 zostaje strefą pierścienia. Grzybobranie dodaje osobne zdjęcie wysypu (zdjęcie iNaturalist 170500861, obserwacja 102041261, Shirley Zundell, CC BY 4.0) do #71. Jeszcze nie zrobione.

## Weryfikacja

Teksty z 14:15 oraz cechy hełmówki i wysyp maślanki z `dfdf15f` są zapisane jako zaakceptowane. Title i lead nie są. Zdjęcia wysypu (170500861, obserwacja 102041261) nie ma jeszcze w #71. Cztery pliki hełmówki na gałęzi to kępa, pierścień, strefa i kapelusz.
