# 0010. Drobne treści atlasu z #51

- **Status:** Oczekuje na decyzję
- **Data wpisu:** 2026-10-23

## Kontekst

[Issue #51](https://github.com/lonwi/mushroom-recognition-app/issues/51) zbiera luki w danych. Komentarz z 2026-10-22 opisuje cechy 44 gatunków. Do aplikacji weszły rekordy inne niż `do_weryfikacji` (`data/sources/ATLAS_CECHY.md`, `src/data/atlasFilterFacts.json`). Pochodzenie jest w `data/sources/atlas_cechy_20261022.json`. Ten wpis obejmuje cztery punkty poniżej, nie całą listę #51 (numery alarmowe, „dzwoń 112”, URPL zostają w issue).

Teksty książek są parafrazą z numerem strony. Cytatów się nie wkleja.

### Odbarwienie miąższu, 19 gatunków

Pole `flesh_discoloration` ma status `do_weryfikacji` i `value: null` u 19 gatunków. Do faktów w aplikacji to pole wtedy nie wchodzi. Notatka w pochodzeniu, skrót:

| Gatunek | Notatka w pochodzeniu |
|---|---|
| `amanita_excelsa` | GPL: szary pod skórką to barwa, nie przebarwienie |
| `amanita_muscaria` | GPL: miąższ biały, pod skórką żółty; brak danych o przebarwieniu |
| `amanita_phalloides` | brak danych w GPL i First Nature |
| `amanita_virosa` | brak danych |
| `calocybe_gambosa` | brak danych |
| `cantharellus_cibarius` | brak danych |
| `cortinarius_orellanus` | brak danych |
| `cortinarius_rubellus` | brak danych (First Nature) |
| `gyromitra_esculenta` | brak danych |
| `hygrophoropsis_aurantiaca` | brak danych |
| `hypholoma_fasciculare` | brak danych |
| `inocybe_erubescens` | GPL: miąższ czerwieniejący; First Nature: miąższ trzonu bez wyraźnej zmiany |
| `lactarius_torminosus` | brak danych |
| `morchella_esculenta` | brak danych |
| `russula_virescens` | GPL: może nieznacznie brązowieć; MushroomExpert: nie zmienia barwy |
| `suillus_bovinus` | brak danych o przebarwieniu (GPL: miąższ czerwonobrązowy) |
| `suillus_grevillei` | GPL: brudnoróżowo; MushroomExpert: nie zmienia barwy |
| `tylopilus_felleus` | GPL: nieznacznie się przebarwia; MushroomExpert: nie zmienia barwy |
| `xerocomus_subtomentosus` | GPL: nie zmienia barwy; MushroomExpert: w kapeluszu zwykle bladoniebieski; First Nature: bez zmian albo lekko czerwonawy |

Pięć ostatnich oraz `inocybe_erubescens` to sprzeczność albo propozycja, nie samo „brak danych”. Reszta czeka na drugie źródło książkowe.

### Sprzeczne opisy w źródłach

Poza miąższem `atlas_cechy_20261022.json` zostawia `do_weryfikacji` tam, gdzie źródła się rozmijają albo danych nie ma:

- Wysyp: `hygrophoropsis_aurantiaca` (GPL kremowy albo jasnożółty, First Nature i MushroomExpert biały), `suillus_grevillei` (żółtozielony, ochrowy, oliwkowobrązowy), `xerocomus_subtomentosus` (ciemnobrunatny kontra oliwkowobrązowy), `agaricus_xanthodermus` (odcień na granicy dwóch tokenów).
- Zapach: `amanita_virosa` (przyjemny kontra mdły), `inocybe_erubescens`, `tricholoma_equestre` (brak wyraźnego kontra mączny). `armillaria_mellea` ma trzy różne opisy i też jest `do_weryfikacji`.
- Smak nietrujących: `armillaria_mellea`, `suillus_bovinus`, `hydnum_repandum`. `macrolepiota_procera` i `suillus_variegatus` mają w pochodzeniu „brak danych”. Smak gatunków trujących i śmiertelnie trujących to token `nie_podaje_sie` i nie jest opisem smaku ([#67](https://github.com/lonwi/mushroom-recognition-app/pull/67)).
- Drzewa: `armillaria_mellea` (kompleks gatunków), `amanita_excelsa` (brak nazwanych drzew), `cantharellus_cibarius` (w filtrach już oznaczone do weryfikacji).

Komentarz w #51 dodaje, że karta *C. rubellus* w „Grzybach Polskich Lasów” na stronach PDF 449–450 opisuje inny gatunek; dla *C. rubellus* użyto tylko „Uwag” ze strony 451 i First Nature. Infobox Wikipedii bywa błędny (*C. orellanus* „ma pierścień”, *A. rubescens* bez pochwy) i nie jest jedynym źródłem żadnej wartości.

### Karta zasłonaka rudego

Karta `cortinarius_orellanus` jest w `src/data/mushrooms.ts`: status `DEADLY_POISONOUS`, zasnówka pajęczynowata opisana jako nie-pierścień, ostrzeżenie o orellaninie, sobowtóry rudawy, kurka i pieprznik trąbkowy. `warningNotes` mówi „Brak zdjęcia”. Pula zdjęć treningowych to osobny bloker: [0011](0011-orellanus-bloker.md). Tu chodzi o treść karty i o przebarwienie, którego pochodzenie nie potwierdza.

### „Nie sprawdzaj smakiem” na kartach jadalnych

W `src/data/mushrooms.ts` fraza „Nie sprawdzaj smakiem” jest na **14** kartach. Wszystkie mają status `EDIBLE`. Wcześniejsza lista mówiła o 10. W pliku na `main` jest czternaście:

`russula_virescens`, `agaricus_campestris`, `morchella_esculenta`, `hydnum_repandum`, `neoboletus_luridiformis`, `xerocomellus_chrysenteron`, `leccinum_aurantiacum`, `xerocomus_subtomentosus`, `suillus_grevillei`, `suillus_bovinus`, `suillus_variegatus`, `armillaria_mellea`, `kuehneromyces_mutabilis`, `amanita_rubescens`.

Złota zasada `rule_no_taste_test` w `src/data/safetyRules.ts` zostaje przy swoim tekście. Ten punkt dotyczy tylko zdań na kartach.

## Opcje

Cztery wybory, każdy osobno:

1. Odbarwienie 19 gatunków: uzupełnić z drugiego źródła albo zostawić lukę (`do_weryfikacji` poza aplikacją).
2. Sprzeczne opisy: wybrać token i źródło albo zostawić `do_weryfikacji`.
3. Karta `cortinarius_orellanus`: czy obecny tekst zostaje.
4. Zdanie na 14 kartach jadalnych: zamienić „Nie sprawdzaj smakiem” na zdanie neutralne albo zostawić tryb rozkazujący.

## Rekomendacja

Brak jednej rekomendacji botów dla całej czwórki. Punkt 4 jest sformułowany jako zamiana na zdanie neutralne; wybór nadal należy do właściciela. Bezpieczeństwo treści (jadalność, ostrzeżenia) i tak wymaga jego słowa.

## Decyzja

Brak.

## Data

—

## Uzasadnienie

—

## Wdrożenie

Brak nowego PR pod te cztery punkty. #67 już zdjął smak gatunków trujących z aplikacji. Luki `do_weryfikacji` są poza `atlasFilterFacts.json` celowo.

## Weryfikacja

—
