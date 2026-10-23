# 0003. Ostrzeżenie o hełmówce w porównaniu maślanki i opieńki

- **Status:** Wdrożona
- **Data wpisu:** 2026-10-23

## Kontekst

[PR #71](https://github.com/lonwi/mushroom-recognition-app/pull/71) w chwili otwarcia tego wpisu był szkicem. Tytuł wtedy: „Porównanie graficzne: maślanka wiązkowa i opieńka miodowa”. CI na przebiegu [run 39929579877](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39929579877) było zielone. PR nie był wtedy zmergowany. Na `main` nie było `src/components/SulphurHoneyComparison.tsx` ani `src/data/sulphurHoneyComparison.ts`. Merge jest w decyzji z 16:57.

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

**Teksty cech, bez zmian** (2026-10-23, 16:07). Właściciel zaakceptował bez zmian teksty kolumny hełmówki z heada [`dfdf15f`](https://github.com/lonwi/mushroom-recognition-app/commit/dfdf15f0a803d6b98407254efe1a84a29edfc3d8) (`dfdf15f0a803d6b98407254efe1a84a29edfc3d8`): pierścień, blaszki, wysyp, kapelusz, trzon i drewno. Ten sam head: wysyp maślanki „Wysyp jest purpurowobrązowy.” Title i lead w tej decyzji zostają otwarte. Tytuł zamyka 16:18. Lead wtedy wybiera dopisek, a jego treść zamyka 16:31.

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

Title i lead nie wchodzą w decyzję z 16:07. Tytuł zamyka decyzja z 16:18. Lead z 16:18 wybiera dopisek. Treść dopisku zamyka 16:31.

**Tytuł** (2026-10-23, 16:18). PL bez zmian: „Maślanka wiązkowa, opieńka i hełmówka jadowita”. EN: "Sulphur tuft, honey fungus and Deadly Galerina". Odrzucone EN: "Sulphur tuft, honey fungus and funeral bell".

**Lead, opcja B** (2026-10-23, 16:18). Obecny lead PL zostaje: „Maślanka wiązkowa nie ma błoniastego pierścienia. Zostaje najwyżej słaba strefa włókien, przyciemniona zarodnikami, albo resztki na brzegu kapelusza. Opieńka miodowa zwykle ma wyraźny, błoniasty pierścień.” Na końcu dochodzi jedno zdanie o hełmówce jadowitej. Odrzucone wtedy **A**: lead bez zmian. Treść zdania jest w decyzji z 16:31.

**Dopisek leadu, wariant B** (2026-10-23, 16:31). Wojtek wybrał treść zdania dopisywanego na końcu leadu.

- PL: „Hełmówka jadowita też może mieć cienki, nietrwały pierścień, więc sam pierścień nie odróżnia jej od opieńki.”
- EN: "Deadly Galerina can also have a thin, short-lived ring, so a ring alone does not tell it apart from honey fungus."

Odrzucone **A**: bez „nietrwały”. Źródła, sprawdzone przez Zbieranie: [MushroomExpert, Galerina marginata](https://www.mushroomexpert.com/galerina_marginata.html) (`ME_GAL`) i [First Nature, Galerina marginata](https://www.first-nature.com/fungi/galerina-marginata.php). Wszystkie teksty [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71) są teraz zatwierdzone.

**Podpis zdjęcia wysypu** (2026-10-23, 16:19). Klucz `galerinaSpore` zaakceptowany bez zmian.

- PL: „Rdzawobrązowy wysyp zarodników hełmówki jadowitej (Galerina marginata).”
- EN: "Rusty-brown spore print of Galerina marginata."

Zdjęcie jest w [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71) na headzie [`58466fa`](https://github.com/lonwi/mushroom-recognition-app/commit/58466faef63d98a2de47bf11a061152fa3610e0e) (`58466faef63d98a2de47bf11a061152fa3610e0e`), plik `assets/gallery/porownanie/galerina-wysyp.webp`. Podpisy na tym headzie są takie, jak wyżej.

**Merge [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71)** (2026-10-23, 16:57). Wojtek zatwierdził merge. Squash na `main`: [`b6e38d1aab7eab59c4341f5551d5b45c240f2f95`](https://github.com/lonwi/mushroom-recognition-app/commit/b6e38d1aab7eab59c4341f5551d5b45c240f2f95). Czas tego commita to 17:10 czasu polskiego. Head PR: `92dbad10556b71ccf1fa1697a99bfdecc5ed9d3a`. To [`e0173d9`](https://github.com/lonwi/mushroom-recognition-app/commit/e0173d94e5e1f262df345673ff3c3c5dcac7b757) (`e0173d94e5e1f262df345673ff3c3c5dcac7b757`) plus aktualizacja do `main` [`f33bccf`](https://github.com/lonwi/mushroom-recognition-app/commit/f33bccf2bf4c32d78cd026abd9243af5729e4b16). CI 4/4 zielone na headzie `92dbad1` ([run 39974043685](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39974043685)): check, Code quality, python, End-to-end. Approve od PR Review i Quality na `e0173d9`. Ta poprawka układa kolumny przy 320 px przez `onLayout`. Teksty bez zmian względem tego, co zatwierdził Wojtek.

## Data

Kolumna ze zdjęciami: 2026-10-23, 11:56 czasu polskiego.
Teksty 1:1: 2026-10-23, 14:15 czasu polskiego.
Wysyp, wariant B: 2026-10-23, 14:16 czasu polskiego.
Zdjęcie wysypu, opcja A: 2026-10-23, 16:06 czasu polskiego. 170500861 to numer zdjęcia, obserwacja to 102041261.
Teksty cech hełmówki i wysyp maślanki: 2026-10-23, 16:07 czasu polskiego.
Tytuł PL bez zmian i EN „Deadly Galerina”: 2026-10-23, 16:18 czasu polskiego. Odrzucone „funeral bell”.
Lead, opcja B: 2026-10-23, 16:18 czasu polskiego.
Dopisek leadu, wariant B (z „nietrwały”): 2026-10-23, 16:31 czasu polskiego. Odrzucone A bez „nietrwały”. Wszystkie teksty #71 zatwierdzone.
Podpis `galerinaSpore`: 2026-10-23, 16:19 czasu polskiego. Zdjęcie na headzie `58466fa`.
Merge #71: 2026-10-23, 16:57 czasu polskiego. Squash `b6e38d1` na `main` o 17:10. Head `92dbad1` (`e0173d9` plus aktualizacja do `f33bccf`). Approve PR Review i Quality na `e0173d9`. Teksty bez zmian.

## Uzasadnienie

Właściciel wybrał kolumnę ze zdjęciami zamiast jednego zdania (opcja A) i zamiast własnego tekstu bez zdjęć (opcja C). Licencja zdjęć w kolumnie jest węższa niż zakres treningu z [0004](0004-licencje-zdjec.md): do wyświetlenia w aplikacji zostają CC0 i CC BY. Teksty z 14:15 są przyjęte dosłownie. Wysyp ma być osobnym zdjęciem, nie zastępuje strefy pierścienia na zdjęciu 3. O 16:06 właściciel wybrał zdjęcie A (zdjęcie iNaturalist 170500861, obserwacja 102041261, Shirley Zundell, CC BY 4.0) i odrzucił B oraz dalsze szukanie. O 16:07 zaakceptował bez zmian teksty cech hełmówki i zdanie „Wysyp jest purpurowobrązowy.” z heada `dfdf15f`. O 16:18 zamknął tytuł: PL bez zmian, EN „Sulphur tuft, honey fungus and Deadly Galerina” zamiast „funeral bell”, i wybrał lead B (obecny lead PL plus jedno zdanie o hełmówce). O 16:19 zaakceptował bez zmian podpis `galerinaSpore`. O 16:31 wybrał wariant B treści dopisku, ze słowem „nietrwały”, po sprawdzeniu źródeł przez Zbieranie. Odrzucił wariant A bez „nietrwały”. Tym samym wszystkie teksty #71 są zatwierdzone. O 16:57 zatwierdził merge #71. Teksty na squashu są bez zmian względem tych akceptacji. Poprawka układu przy 320 px przez `onLayout` jest na `e0173d9` i weszła w ten squash.

## Wdrożenie

Na `main` od squashu [#71](https://github.com/lonwi/mushroom-recognition-app/pull/71) (`b6e38d1`). Tytuł PR po merge: „Porównanie graficzne: maślanka, opieńka i hełmówka jadowita”. W squashu są `galerina-skupisko.webp`, `galerina-pierscien.webp`, `galerina-strefa.webp`, `galerina-kapelusz.webp` i `galerina-wysyp.webp`. Zdjęcie 3 zostaje strefą pierścienia. Osobne zdjęcie wysypu to zdjęcie iNaturalist 170500861 (obserwacja 102041261, Shirley Zundell, CC BY 4.0).

Na headzie `58466fa` tytuł EN był jeszcze odrzuconym „and funeral bell”, a dopisku leadu nie było. Późniejsze commity gałęzi #71 wniosły zatwierdzony tytuł EN, dopisek leadu i poprawkę `onLayout` (`e0173d9`). Head `92dbad1` dokłada do tego aktualizację do `main` `f33bccf`. Squash z 17:10 zawiera te zmiany.

## Weryfikacja

Squash `b6e38d1aab7eab59c4341f5551d5b45c240f2f95` jest na `main`. Rodzic: `f33bccf2bf4c32d78cd026abd9243af5729e4b16`. Head PR `92dbad10556b71ccf1fa1697a99bfdecc5ed9d3a` ma rodziców `e0173d94e5e1f262df345673ff3c3c5dcac7b757` i `f33bccf`. CI 4/4 na tym headzie: [run 39974043685](https://github.com/lonwi/mushroom-recognition-app/actions/runs/39974043685). Approve PR Review i Quality są częścią OK z 16:57 i dotyczą `e0173d9`. W `src/components/SulphurHoneyComparison.tsx` z squashu jest `onLayout`. Teksty porównania na squashu są takie, jak zatwierdził Wojtek: tytuł PL i EN, dopisek leadu z „nietrwały”, podpis `galerinaSpore` i adres zdjęcia 170500861. Słowo „funeral bell” zostaje w komentarzu `src/data/sulphurHoneyComparison.ts` i w nazwach testów e2e, nie w tytule porównania.
