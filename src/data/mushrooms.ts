import { type MushroomSpecies } from '../types/mushroom';

const STROPHARIACEAE = 'Pierścieniakowate (Strophariaceae)';

/** Poisoning symptoms only. No dose, no description of how the toxins act. */
export const FLY_AGARIC_POISONING_SYMPTOMS =
  'Objawy zatrucia: po 0,5–2 godz. pobudzenie i halucynacje, potem wymioty, ból głowy, kołatanie serca, rozszerzone źrenice, stan podobny do upojenia alkoholowego i długi, głęboki sen. U osób wrażliwych możliwa utrata przytomności i zatrzymanie akcji serca (Zarzyński, „Grzyby polskich lasów”, 2021, s. 36, 294).';

export const PANTHER_POISONING_SYMPTOMS =
  'Objawy zatrucia: przebieg podobny jak po muchomorze czerwonym, zwykle cięższy — dolegliwości żołądkowe, biegunka, halucynacje, drgawki (Zarzyński, „Grzyby polskich lasów”, 2021, s. 302).';

/** GIS first aid. Emergency numbers 112 and 999 only; no toxicology-centre list. */
export const GIS_MUSHROOM_FIRST_AID =
  'Przy objawach zatrucia po zjedzeniu grzybów: numer alarmowy 112 lub 999 albo transport do szpitala. Do lekarza zgłaszają się wszyscy, którzy jedli ten sam posiłek, także bez objawów. Osobie z objawami nie podaje się mleka ani alkoholu (GIS, „Bezpieczne grzybobranie”, 23.09.2022).';

/** Look-alike warning only. Not a card and not a guide to where these fungi grow. */
export const GALERINA_PSILOCYBE_WARNING =
  'Łysiczki (Psilocybe) nie mają karty. Hełmówka jadowita jest śmiertelnie trująca i łatwo pomylić ją z łysiczką. Stamets 1996, s. 31–33, 144–145, 192–193.';

export const MUSHROOMS_DATABASE: MushroomSpecies[] = [
  {
    id: 'boletus_edulis',
    namePl: 'Prawdziwki',
    nameEn: 'Penny bun group',
    nameLatin: 'Boletus edulis, Boletus reticulatus, Boletus pinophilus',
    commonNicknames: ['Borowik szlachetny', 'Prawdziwek', 'Borowik usiatkowany', 'Borowik sosnowy'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Grupa prawdziwków: borowik szlachetny najczęściej w lasach iglastych pod świerkiem i sosną, także pod brzozą; borowik usiatkowany pod dębem i bukiem; borowik sosnowy pod sosną. Zdjęcie nie rozdziela tych trzech gatunków.',
    capDescription: 'Średnica 6-25 cm. Za młodu półkulisty, potem wypukły do rozpostartego. Kolor od jasnobrązowego, przez orzechowy po ciemnokasztanowy. Brzeg gładki, często z wąską białą obwódką.',
    hymenophoreDescription: 'Rurki drobne, łatwo oddzielające się od miąższu. Początkowo białawe, z wiekiem żółtawozielone do oliwkowych. Po uciśnięciu NIE sinieją.',
    stemDescription: 'Wysokość 5-20 cm, grubość 2-6 cm. Masywny, u dołu pękaty, z wiekiem maczugowaty lub walcowaty. Na jasnobrązowym tle pokryty delikatną, białą siateczką (głównie w górnej części).',
    fleshDescription: 'Zwięzły, jędrny, biały, pod skórką kapelusza może być lekko brązowawy. Nie zmienia barwy po przekrojeniu.',
    tasteAndSmell: 'Przyjemny, orzechowy smak i charakterystyczny, szlachetny grzybowy aromat.',
    culinaryValue: 'Jeden z najwybitniejszych grzybów kulinarnych. Doskonały do suszenia, duszenia, zup i marynowania.',
    confusionRisks: [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Goryczak ma rurki brudnoróżowe (nie zielono-oliwkowe jak stary borowik)',
          'Goryczak posiada wyrazistą, ciemną, wypukłą siatkę na trzonie (borowik ma siatkę białą/jasną)',
          'Goryczak ma potwornie gorzki smak, który niszczy całą potrawę'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Ta karta obejmuje prawdziwki: borowika szlachetnego, usiatkowanego i sosnowego. Rozporządzenie MZ wymienia borowika szlachetnego jako wszystkie odmiany. Zwracaj uwagę na barwę rurek i siateczkę na trzonie, by nie pomylić z gorzkim goryczakiem. Borowik szatański (Rubroboletus satanas) to inny gatunek i ma osobną kartę.'
  },
  {
    id: 'amanita_phalloides',
    namePl: 'Muchomor sromotnikowy (zielonawy)',
    nameLatin: 'Amanita phalloides',
    commonNicknames: ['Muchomor zielonawy', 'Sromotnik'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Głównie lasy liściaste, zwłaszcza dąbrowy i buczyny, także lasy mieszane.',
    capDescription: 'Średnica 5-15 cm. Barwa oliwkowozielona, żółtawozielona, szarozielona, bladozielona albo prawie biała, ku brzegom jaśniejsza. Sam kolor nie rozstrzyga gatunku. Powierzchnia gładka, w stanie wilgotnym lepka, rzadko z nielicznymi białymi łatkami.',
    hymenophoreDescription: 'Blaszki ZAWSZE BIAŁE (u starych okazów lekko zielonkawe), gęste, wolne, nie dochodzą do trzonu. Nigdy nie różowieją ani nie brązowieją!',
    stemDescription: 'Wysokość do około 15 cm. Smukły, walcowaty, biały, oliwkowy lub lekko zielonawy, często z mniej lub bardziej wyraźnym zygzakowatym wzorem. U dołu bulwa w wyraźnej, luźnej, białej pochwie. Pod kapeluszem duży, przyrośnięty, zwieszający się, prążkowany pierścień.',
    fleshDescription: 'Biały, pod skórką kapelusza nieco zielonkawy, niezmienny po przełamaniu.',
    tasteAndSmell: 'Młode mają zapach słaby, starsze mdły, miodowo-duszący. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący. Może zabić jeden owocnik, a nawet jego część; dla dzieci dawka jest mniejsza. Objawy zwykle po 6–24 h, czasem później; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii. Po dobie bywa złudna poprawa, a potem wraca uszkodzenie wątroby.',
    confusionRisks: [
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kania ma pierścień wolny, który da się przesuwać wzdłuż trzonu. Pierścień muchomora jest przyrośnięty i zwykle zwisa',
          'Kania nie ma luźnej pochwy u nasady. Muchomor ma bulwę w białej, workowatej pochwie',
          'Zygzak na trzonie niczego nie rozstrzyga: muchomor sromotnikowy też może mieć zygzakowaty wzór'
        ],
        fatal: false
      },
      {
        confusedWithId: 'russula_virescens',
        confusedWithName: 'Gołąbek zielonawy',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Gołąbki NIGDY nie posiadają pierścienia ani pochwy u nasady trzonu',
          'Miąższ gołąbka jest kruchy i łamliwy jak kreda (nie ma włókien)',
          'Kapelusz gołąbka zielonawego pęka w charakterystyczne poletka'
        ],
        fatal: false
      },
      {
        confusedWithId: 'agaricus_campestris',
        confusedWithName: 'Pieczarka polna',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Pieczarka polna ma blaszki różowe, a z wiekiem ciemnobrązowe lub czekoladowe (muchomor ma zawsze czysto BIAŁE blaszki)',
          'Pieczarka nie posiada pochwy u dołu trzonu'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_citrina',
        confusedWithName: 'Muchomor cytrynowy',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Kolor kapelusza nie rozstrzyga. Sromotnikowy bywa bladozielony albo biały, nie tylko oliwkowy',
          'Rozstrzyga nasada: sromotnikowy ma bulwę w luźnej, workowatej pochwie. Cytrynowy ma bulwę z rąbkiem, bez workowatej pochwy',
          'Oba mają białe blaszki i pierścień. Blady albo żółty kapelusz nie czyni owocnika bezpiecznym'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Najgroźniejszy muchomor polskich lasów. Objawy zwykle po 6–24 h, czasem później; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii. Chwilowa poprawa nie oznacza, że wątroba jest bezpieczna. Nie zbieraj młodych, zamkniętych owocników „na oko”.'
  },
  {
    id: 'macrolepiota_procera',
    namePl: 'Czubajka kania',
    nameLatin: 'Macrolepiota procera',
    commonNicknames: ['Kania', 'Sowa', 'Parasolowiec', 'Czubajka wyniosła'],
    family: 'Pieczarkowate (Agaricaceae)',
    status: 'EDIBLE',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10, 11],
    habitat: 'Obrzeża lasów, polany leśne, zręby, parki, przydroża, lasy mieszane i liściaste.',
    capDescription: 'Średnica 10-30 cm (rekordowe do 40 cm). Za młodu jajowaty, potem dzwonkowaty, ostatecznie parasolowaty z wyraźnym, ciemniejszym czubkiem. Pokryty odstającymi, brunatnymi łuskami na jasnym tle.',
    hymenophoreDescription: 'Blaszki białe lub kremowe, gęste, szerokie, wolne (nie dotykają trzonu), oddzielone od trzonu chrzęstnym pierścieniem.',
    stemDescription: 'Wysokość 15-40 cm, smukły, pusty w środku, u dołu bulwiasto rozdęty. Pokryty poprzecznym, brązowawym pręgowaniem przypominającym skórę węża. Posiada gruby, podwójny, RUCHOMY pierścień!',
    fleshDescription: 'W kapeluszu miękki, watowaty, biały, nie zmienia barwy po uszkodzeniu. W trzonie zdrewniały i włóknisty (trzony się odrzuca).',
    tasteAndSmell: 'Wspaniały, orzechowy aromat i delikatny smak.',
    culinaryValue: 'Ceniony rarytas, tradycyjnie panierowany i smażony jak kotlet schabowy. Spożywa się wyłącznie kapelusze.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Pierścień kani jest ruchomy i daje się przesuwać. U muchomora jest przyrośnięty i zwykle zwisa',
          'Kania nie ma luźnej pochwy u nasady bulwy. Muchomor ją ma',
          'Zygzak na trzonie nie jest dowodem, że to kania: muchomor sromotnikowy też może mieć zygzakowaty wzór'
        ],
        fatal: true
      },
      {
        confusedWithId: 'amanita_virosa',
        confusedWithName: 'Muchomor jadowity',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor jadowity jest białawy, z pochwą u nasady i włóknistymi łuskami na trzonie',
          'Kania nie ma pochwy, a pierścień daje się przesuwać',
          'Młodych, zamkniętych owocników nie zbieraj'
        ],
        fatal: true
      },
      {
        confusedWithId: 'amanita_pantherina',
        confusedWithName: 'Muchomor plamisty',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Muchomor plamisty ma brązowy kapelusz z białymi łatkami, gładki pierścień i pochwę w postaci kołnierza na bulwie. Brzeg bywa prążkowany, ale forma górska ma brzeg gładki',
          'Pierścień muchomora jest przyrośnięty, a nie ruchomy',
          'Zapach muchomora plamistego bywa rzodkiewkowy'
        ],
        fatal: false
      },
      {
        confusedWithId: 'chlorophyllum_rhacodes',
        confusedWithName: 'Czubajnik czerwieniejący',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Czubajnik po uszkodzeniu czerwienieje, a na trzonie nie ma łuskowatego wzoru kani',
          'Czubajnik w tym atlasie jest trujący. Opis kani jako jadalnej na niego nie przechodzi'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Nie zbieraj młodych, nierozwiniętych kani w kształcie pałeczki. Wtedy najłatwiej pomylić je ze śmiertelnymi muchomorami. Do jedzenia bierze się tylko kapelusze, i tylko po pewnym oznaczeniu.'
  },
  {
    id: 'cantharellus_cibarius',
    namePl: 'Pieprznik jadalny (Kurka)',
    nameLatin: 'Cantharellus cibarius',
    commonNicknames: ['Kurka', 'Lisica', 'Pieprzyk'],
    family: 'Pieprznikowate (Cantharellaceae)',
    status: 'EDIBLE',
    hymenophore: 'FOLDS',
    months: [5, 6, 7, 8, 9, 10, 11],
    habitat: 'Lasy iglaste i liściaste, najczęściej pod sosną i świerkiem, także pod dębem i grabem, często w mchu.',
    capDescription: 'Średnica 2-10 cm. Początkowo wypukły, potem pępkowaty do lejkowatego z pofalowanym, nieregularnym brzegiem. Barwa od jasnożółtej do żółtopomarańczowej (jajeczna).',
    hymenophoreDescription: 'UWAGA: To NIE są blaszki, lecz fałdy/listewki (żyłki) zbiegające głęboko po trzonie, rozwidlone i połączone anastomozami.',
    stemDescription: 'Wysokość 3-7 cm, zwężający się ku dołowi, płynnie przechodzący w kapelusz, pełny, barwy kapelusza.',
    fleshDescription: 'Białawy do bladożółtego, twardy i mięsisty. Owocniki rzadko bywają robaczywe.',
    tasteAndSmell: 'Owocowy aromat przypominający morele, smak lekko pikantny, pieprzny.',
    culinaryValue: 'Klasyk polskiej kuchni: jajecznica z kurkami, sosy śmietanowe, zupy kurkowe, marynowanie.',
    confusionRisks: [
      {
        confusedWithId: 'hygrophoropsis_aurantiaca',
        confusedWithName: 'Lisówka pomarańczowa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Lisówka ma cienkie, gęste, prawdziwe blaszki. Kurka ma grube, zbiegające listewki',
          'Trzon lisówki bywa węższy i u podstawy przyciemniony. Miąższ kurki jest białawy',
          'W tym atlasie lisówka nie jest grzybem do jedzenia'
        ],
        fatal: false
      },
      {
        confusedWithId: 'inocybe_erubescens',
        confusedWithName: 'Strzępiak ceglasty',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Młody strzępiak ma prawdziwe blaszki, początkowo białe, a nie grube żółte listewki kurki',
          'Po uszkodzeniu strzępiak czerwienieje i z wiekiem staje się ceglasty',
          'Strzępiak ceglasty jest śmiertelnie trujący. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      }
    ],
    warningNotes: 'Listewki kurki nie są blaszkami. Młode owocniki łatwiej pomylić ze śmiertelnym strzępiakiem ceglastym.'
  },
  {
    id: 'imleria_badia',
    namePl: 'Podgrzybek brunatny',
    nameLatin: 'Imleria badia',
    commonNicknames: ['Podgrzybek', 'Czarny łepek', 'Borowik brunatny'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [7, 8, 9, 10, 11],
    habitat: 'Lasy iglaste i mieszane, pod sosną i świerkiem, często w mchu i przy pniakach.',
    capDescription: 'Średnica 4-15 cm. Barwa ciemnobrązowa, kasztanowa do czekoladowej. Za młodu półkulisty z podwiniętym brzegiem, później poduszkowaty. W czasie deszczu śliski.',
    hymenophoreDescription: 'Rurki żółtozielone do oliwkowych. Po uciśnięciu sinieją, często na zielononiebiesko. Miąższ sinieje słabiej niż pory. Trzon nie ma siateczki.',
    stemDescription: 'Wysokość 4-12 cm, cylindryczny lub lekko wygięty, podłużnie włóknisty, żółto-brunatny bez wyraźnej siateczki.',
    fleshDescription: 'Białawy lub kremowy, w kapeluszu po przełamaniu lekko błękitnieje, w trzonie brązowieje.',
    tasteAndSmell: 'Łagodny, przyjemny grzybowy aromat.',
    culinaryValue: 'Bardzo smaczny grzyb powszechnego zbioru. Wyśmienity do suszenia, marynowania i duszenia.',
    confusionRisks: [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Rurki podgrzybka po naciśnięciu sinieją na niebiesko (rurki goryczaka różowieją lub brudnieją)',
          'Goryczak ma grubą, ciemną siatkę na trzonie'
        ],
        fatal: false
      }
    ]
  },
  {
    id: 'suillus_luteus',
    namePl: 'Maślak zwyczajny i ziarnisty',
    nameEn: 'Slippery jack and granulated bolete',
    nameLatin: 'Suillus luteus, Suillus granulatus',
    commonNicknames: ['Maślak', 'Maślak ziarnisty', 'Maślarz'],
    family: 'Maślakowate (Suillaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [5, 6, 7, 8, 9, 10, 11, 12],
    habitat: 'Wyłącznie pod sosnami (mikoryza z sosną dwuigielną), na glebach piaszczystych, młodnikach.',
    capDescription: 'Średnica 4-12 cm. Ciemnobrązowy, czekoladowy. Pokryty grubą, bardzo śliską, lepką skórką, którą łatwo zdjąć palcami.',
    hymenophoreDescription: 'Rurki drobne, za młodu cytrynowożółte, zakryte białawą błoną łączącą brzeg kapelusza z trzonem, później oliwkowożółte.',
    stemDescription: 'Wysokość do około 11 cm, walcowaty. Maślak zwyczajny ma u młodych owocników białą błonę, czasem z fioletowym odcieniem, a potem pierścień. Maślak ziarnisty pierścienia nie ma, a górę trzonu pokrywają kropelki i ziarenka. Na zdjęciu z góry tych dwóch nie rozdzielisz.',
    fleshDescription: 'Miękki, białożółtawy, niezmienny, w kapeluszu wodnisty.',
    tasteAndSmell: 'Łagodny, kwaskowaty smak i słaby grzybowy zapach.',
    culinaryValue: 'Smaczny do duszenia, zup i marynat. Śliską skórkę warto zdjąć: jest kwaśna, a bez niej łatwiej usunąć piasek. Suszenie się nie sprawdza. U części osób, zwłaszcza przy pierwszym razie, opisywano biegunkę i wymioty.',
    confusionRisks: [
      {
        confusedWithId: 'suillus_grevillei',
        confusedWithName: 'Maślak żółty',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślak żółty rośnie pod modrzewiem i ma złocisty, lepki kapelusz',
          'Maślak zwyczajny i ziarnisty rosną pod sosną',
          'Samo zdjęcie kapelusza z góry nie rozdziela maślaka zwyczajnego od ziarnistego'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Ta karta łączy maślaka zwyczajnego (z pierścieniem) i ziarnistego (bez pierścienia). Zdjęcie z góry ich nie rozdziela. Pusta lista sobowtórów nie jest zgodą na zbiór, a ta lista też nie jest.'
  },
  {
    id: 'leccinum_scabrum',
    namePl: 'Koźlarz babka',
    nameLatin: 'Leccinum scabrum',
    commonNicknames: ['Kozak', 'Babka', 'Brzózka'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Ściśle związany z brzozą (lasy brzozowe, mieszane, zadrzewienia śródpolne).',
    capDescription: 'Średnica 5-15 cm. Barwa od szarobrązowej do orzechowej. Powierzchnia gładka, matowa, sucha.',
    hymenophoreDescription: 'Rurki długie, białawe, z wiekiem szare do poduszkowato wybrzuszonych. Łatwo oddzielają się od kapelusza.',
    stemDescription: 'Wysokość 8-18 cm, smukły, pokryty licznymi czarnymi lub ciemnobrunatnymi łuseczkami.',
    fleshDescription: 'Biały, miękki w kapeluszu, twardy i włóknisty w trzonie. Po przekrojeniu nie zmienia barwy. Koźlarz grabowy, którego ta karta nie opisuje, po przecięciu różowieje lub czernieje.',
    tasteAndSmell: 'Łagodny, przyjemny grzybowy zapach.',
    culinaryValue: 'Dobry grzyb jadalny. Młode kapelusze nadają się do marynowania, zup i sosów. Przed jedzeniem zeskrob czarne kosmki z trzonu.',
    warningNotes: 'Rośnie przy brzozie, a miąższ po przekrojeniu nie zmienia barwy. Koźlarz grabowy, który czernieje, to inny gatunek i nie ma go na tej karcie.',
    confusionRisks: [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Koźlarz ma trzon pokryty czarnymi łuseczkami, goryczak ma trzon z wypukłą siateczką',
          'Rurki koźlarza są szare, goryczaka brudnoróżowe'
        ],
        fatal: false
      }
    ]
  },
  {
    id: 'tylopilus_felleus',
    namePl: 'Goryczak żółciowy',
    nameLatin: 'Tylopilus felleus',
    commonNicknames: ['Gorzkowik', 'Grzyb żółciowy'],
    family: 'Borowikowate (Boletaceae)',
    status: 'INEDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy iglaste i mieszane, często na kwaśnych glebach i próchniejących pniakach sosnowych/świerkowych.',
    capDescription: 'Średnica 5-15 cm. Barwa jasnobrązowa, orzechowa, żółtobrązowa. Bardzo podobny z wierzchu do borowika szlachetnego.',
    hymenophoreDescription: 'Początkowo białawe, ale z wiekiem wyraźnie RÓŻOWIEJĄCE (brudnoróżowe). Po uciśnięciu brązowieją.',
    stemDescription: 'Wysokość 7-14 cm, maczugowaty, barwy żółtobrązowej z BARDZO WYRAŹNĄ, ciemnobrązową, wypukłą siatką o szerokich oczkach.',
    fleshDescription: 'Biały, po przełamaniu może lekko różowieć.',
    tasteAndSmell: 'POTWORNIE GORZKI SMAK! Jeden mały kawałek w garnku czyni cały sos lub zupę niezjadliwą. Gotowanie wzmaga gorycz.',
    culinaryValue: 'Niejadalny. Smak jest odpychająco gorzki i psuje potrawę już w małej ilości. Większa porcja mogłaby podrażnić żołądek, ale gorycz zwykle nie pozwala jej zjeść. Ta karta nie podaje moczenia ani gotowania, które miałoby gorycz usunąć.',
    confusionRisks: [
      {
        confusedWithId: 'boletus_edulis',
        confusedWithName: 'Prawdziwki',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Rurki goryczaka są różowe u rozwiniętych okazów (borowik ma żółtooliwkowe)',
          'Siatka na trzonie goryczaka jest ciemniejsza od tła (u borowika siatka jest biała/jaśniejsza)'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Sprawdź siatkę na trzonie i kolor rurek. W części przekazów ludowych goryczaka też nazywano „szatanem”, ale to samo słowo oznacza borowika szatańskiego (Rubroboletus satanas), który ma osobną kartę i nie jest goryczakiem. Nie próbuj smaku, żeby „upewnić się” co do gatunku.'
  },
  {
    id: 'amanita_muscaria',
    namePl: 'Muchomor czerwony',
    nameLatin: 'Amanita muscaria',
    commonNicknames: ['Muchomór', 'Bedłka muchomor'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Lasy iglaste i liściaste, najczęściej pod brzozami i świerkami.',
    capDescription: 'Średnica 8-20 cm. Jaskrawoczerwony, szkarłatny, pokryty licznymi białymi lub żółtawymi łatkami (pozostałości osłony).',
    hymenophoreDescription: 'Blaszki czysto białe, gęste, wolne.',
    stemDescription: 'Wysokość 10-20 cm, biały, z wyraźnym wiszącym białym pierścieniem i bulwiastą podstawą otoczoną rzędami brodawek.',
    fleshDescription: 'Biały, pod skórką kapelusza żółtopomarańczowy.',
    tasteAndSmell: 'Bez wyraźnego zapachu. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trujący. Zawiera kwas ibotenowy i muscymol; muskaryna występuje tylko śladowo. Po spożyciu: halucynacje, pobudzenie, wymioty, silne bicie serca. W skrajnych przypadkach opisywano utratę przytomności.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_caesarea',
        confusedWithName: 'Muchomor cesarski',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
        keyDifferences: [
          'Blaszki i trzon intensywnie żółte, u muchomora czerwonego białe do kremowych',
          'U nasady wyraźna, biała, workowata pochwa. U czerwonego bulwa z brodawkowatymi wałeczkami, pochwa niewyraźna',
          'Kapelusz zwykle bez białych łatek, brzeg prążkowany, pierścień żółty',
          'W Polsce stwierdzony raz (1959), na Czerwonej liście jako wymarły. W praktyce pomyłka grozi głównie poza krajem, przy okazach muchomora czerwonego pozbawionych łatek'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_rubescens',
        confusedWithName: 'Muchomor czerwieniejący (młode owocniki)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kapelusz różowawy do czerwonobrązowego, nie jaskrawoczerwony. Łatki białawe do szarawych',
          'Miąższ i uszkodzone miejsca, zwłaszcza u nasady trzonu i ślady żerowania, czerwienieją. U muchomora czerwonego miąższ biały, pod skórką żółtawy, i nie czerwienieje',
          'Pierścień wyraźnie prążkowany. U czerwonego pierścień nieprążkowany',
          'Młode, kuliste owocniki o czerwonawym odcieniu i ze zmytymi łatkami mogą przypominać młody muchomor czerwony. Rozstrzyga reakcja czerwienienia'
        ],
        fatal: false
      }
    ],
    warningNotes: `TRUJĄCY. Nie jedz i nie próbuj usuwać toksyn w domu. ${FLY_AGARIC_POISONING_SYMPTOMS} ${GIS_MUSHROOM_FIRST_AID}`
  },
  {
    id: 'lactarius_deliciosus',
    namePl: 'Rydze',
    nameEn: 'Saffron milkcaps',
    nameLatin: 'Lactarius deliciosus, Lactarius deterrimus',
    commonNicknames: ['Rydz', 'Rydz świerkowy', 'Ryżyk'],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'EDIBLE',
    hymenophore: 'GILLS',
    months: [8, 9, 10, 11],
    habitat: 'Rydz (Lactarius deliciosus) głównie pod sosnami na glebach piaszczystych. Rydz świerkowy (Lactarius deterrimus) pod świerkiem. Zdjęcie prawie ich nie rozdziela, dlatego to jedna karta.',
    capDescription: 'Średnica 4-12 cm. Pomarańczowo-rudy z ciemniejszymi, koncentrycznymi kręgami. Z wiekiem zieleniejący.',
    hymenophoreDescription: 'Blaszki pomarańczowożółte, gęste, lekko zbiegające na trzon. Po uszkodzeniu powoli zielenieją.',
    stemDescription: 'Wysokość 3-7 cm, cylindryczny, pomarańczowy z ciemniejszymi jamkami.',
    fleshDescription: 'Kruchy, bladopomarańczowy. Wydziela pomarańczowe albo marchewkowe mleczko. U rydza świerkowego mleczko po czasie czerwienieje, a uszkodzone miejsca mocniej zielenieją. Ta karta nie rozdziela rydza jodłowego ani modrzewiowego.',
    tasteAndSmell: 'Przyjemny, żywiczny zapach i łagodny, lekko pikantny smak.',
    culinaryValue: 'Wybitny grzyb kulinarny: smażony na maśle, kiszony lub marynowany.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_torminosus',
        confusedWithName: 'Mleczaj wełnianka',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Wełnianka ma kapelusz z wełnisto owłosionym brzegiem',
          'Mleczko wełnianki jest BIAŁE (rydz ma mleczko pomarańczowe)',
          'Wełnianka rośnie wyłącznie pod brzozami'
        ],
        fatal: false
      },
      {
        confusedWithId: 'paxillus_involutus',
        confusedWithName: 'Krowiak podwinięty (Olszówka)',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Krowiak nie wydziela mleczka. Rydz po uszkodzeniu daje pomarańczowe mleczko',
          'Krowiak ma oliwkowobrązowy, podwinięty kapelusz, a blaszki ciemnieją po dotknięciu',
          'Krowiak jest śmiertelnie trujący. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      }
    ],
    warningNotes: 'Ta karta to rydze: sosnowy i świerkowy. Groźnym sobowtórem zostaje wełnianka, z białym mleczkiem i wełnistym brzegiem, pod brzozą. Przy modrzewiu i przy białym mleczku to nie jest ta karta.'
  },
  {
    id: 'gyromitra_esculenta',
    namePl: 'Piestrzenica kasztanowata',
    nameLatin: 'Gyromitra esculenta',
    commonNicknames: ['Babie uszy', 'Fałszywy smardz'],
    family: 'Kiestrzenicowate (Discinaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'OTHER',
    months: [3, 4, 5],
    habitat: 'Wiosną w lasach sosnowych na piaszczystych glebach, zrębach, przydrożach.',
    capDescription: 'Średnica 4-12 cm. Mózgowato pofałdowana główka barwy kasztanowobrązowej do czekoladowej.',
    hymenophoreDescription: 'Zewnętrzna pofałdowana powierzchnia główki pełni rolę hymenium.',
    stemDescription: 'Krótki, białawy, z bruzdami.',
    fleshDescription: 'Biały, woskowaty. Młode owocniki bywają w środku pełne, starsze puste. To nie jest jedna gładka komora jak u smardza.',
    tasteAndSmell: 'Zapach grzybowy. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący. Zawiera gyromitrynę, substancję lotną. Suszenie i gotowanie nie są sposobem na bezpieczne danie. W Polsce tego grzyba się nie je.',
    confusionRisks: [
      {
        confusedWithId: 'morchella_esculenta',
        confusedWithName: 'Smardz jadalny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Smardz ma główkę żebrowato-plastrowatą (jak plaster miodu), piestrzenica pofałdowaną mózgowato',
          'Smardz jest w środku pusty i tworzy jedną komorę. Młoda piestrzenica bywa w środku pełna, a główka jest mózgowato pofałdowana'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Zabójczy grzyb wiosenny. Dawniej błędnie gotowany, powoduje śmiertelne zatrucia o opóźnionym działaniu.'
  },
  {
    id: 'paxillus_involutus',
    namePl: 'Krowiak podwinięty (Olszówka)',
    nameLatin: 'Paxillus involutus',
    commonNicknames: ['Olszówka', 'Krowiak'],
    family: 'Krowiakowate (Paxillaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Bardzo pospolity pod brzozami, olchami, w lasach iglastych i mieszanych.',
    capDescription: 'Średnica 5-15 cm. Oliwkowobrunatny, z mocno, trwale podwiniętym filcowatym brzegiem.',
    hymenophoreDescription: 'Blaszki żółtawe do ochrowych, po dotknięciu natychmiast ciemnobrązowieją.',
    stemDescription: 'Krótki, cylindryczny, barwy kapelusza.',
    fleshDescription: 'Żółtawy, brązowiejący po przekrojeniu.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący przy wielokrotnym spożyciu. Dawniej uchodził za jadalny po obgotowaniu. Może wywołać rozpad własnych krwinek i niewydolność nerek. Obgotowanie tego nie załatwia.',
    warningNotes: 'NIGDY NIE ZBIERAJ OLSZÓWEK. Dawniej uchodził za jadalny. Zatrucie wiąże się z wielokrotnym spożyciem: może dojść do rozpadu krwinek i niewydolności nerek, także ze skutkiem śmiertelnym.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_deliciosus',
        confusedWithName: 'Rydze',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Rydz po uszkodzeniu wydziela pomarańczowe mleczko. Krowiak mleczka nie ma',
          'Rydz rośnie pod sosnami i ma ceglastopomarańczowy, strefowany kapelusz',
          'Brak mleczka przy „rydzu” traktuj jak powód, żeby grzyba nie brać'
        ],
        fatal: false
      }
    ]
  },
  {
    id: 'russula_virescens',
    namePl: 'Gołąbek zielonawy',
    nameEn: 'Greencracked brittlegill',
    nameLatin: 'Russula virescens',
    commonNicknames: ['Surowiatka', 'Surojadka zielonawa', 'Siwek'],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10],
    habitat: 'Od czerwca do października w lasach liściastych i mieszanych, najczęściej pod dębem, bukiem i brzozą.',
    capDescription: 'Kapelusz szarozielony, zielononiebieski lub oliwkowy, szybko pękający w kostkowate poletka. Ta skrócona karta nie opisuje innych zielonych gołąbków.',
    hymenophoreDescription: 'Blaszki jasne i kruche. Brak pierścienia.',
    stemDescription: 'Trzon bez pierścienia i bez pochwy u nasady. Brak tych osłon nie wystarcza, by wykluczyć pomyłkę, jeśli owocnik jest młody albo uszkodzony.',
    fleshDescription: 'Miąższ kruchy, łamliwy, bez włókien typowych dla muchomora.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze świeżo przekrojone młode owocniki pachną słabo, owocowo-orzechowo; starsze mają zapach przypominający ser.',
    culinaryValue: 'W literaturze do gotowania, duszenia i marynowania; na surowo niezalecany. Główne ryzyko: pomylenie ze śmiertelnie trującym muchomorem zielonawym. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor sromotnikowy ma pierścień i luźną pochwę u nasady; gołąbek zielonawy nie ma ani pierścienia, ani pochwy',
          'Miąższ gołąbka jest kruchy i łamliwy; muchomor ma miąższ włóknisty',
          'Gładki zielony kapelusz z białymi blaszkami traktuj jak muchomora, dopóki grzyboznawca nie powie inaczej'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Zielony kapelusz trzeba odróżnić od muchomora sromotnikowego. Brak zdjęcia. Innych zielonych gołąbków ta karta nie oznacza. Potwierdź oznaczenie u grzyboznawcy lub w Sanepidzie.'
  },
  {
    id: 'agaricus_campestris',
    namePl: 'Pieczarka polna',
    nameEn: 'Field mushroom',
    nameLatin: 'Agaricus campestris',
    commonNicknames: [],
    family: 'Pieczarkowate (Agaricaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9, 10, 11],
    habitat: 'Łąki, pastwiska, pola i ogrody, miejsca zasobne w azot. Nie jest typowym grzybem cienistego lasu. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz jasny, białawy. Ta karta nie opisuje pieczarek silnie żółknących.',
    hymenophoreDescription: 'Blaszki dojrzałych owocników różowe, potem ciemnobrązowe. Białe blaszki nie pasują do dojrzałej pieczarki polnej.',
    stemDescription: 'Krótki trzon z pierścieniem. Brak pochwy u nasady.',
    fleshDescription: 'Miąższ jasny. Silne, chromowe żółknięcie u nasady trzonu i zapach karbolu wskazują na pieczarkę żółtawą, nie na tę kartę.',
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
    culinaryValue: 'W literaturze (rozporządzenie MZ z 17.05.2011 (Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258, zał. nr 1)) pieczarka polna jest na wykazie grzybów dopuszczonych do obrotu, z wyjątkiem zbyt młodych egzemplarzy ze stanu naturalnego, których blaszki jeszcze nie poróżowiały. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Pieczarka polna ma blaszki różowe, a z wiekiem ciemnobrązowe; muchomor sromotnikowy ma blaszki białe',
          'Pieczarka polna nie ma pochwy u nasady trzonu; muchomor ją ma',
          'Owocnik z wciąż białymi blaszkami nie jest bezpieczną pieczarką — nie zbieraj go na podstawie tej karty'
        ],
        fatal: true
      },
      {
        confusedWithId: 'amanita_virosa',
        confusedWithName: 'Muchomor jadowity',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor jadowity ma białe blaszki i pochwę u nasady trzonu',
          'Pieczarka polna nie ma pochwy, a blaszki dojrzałych owocników ciemnieją',
          'Młode owocniki z jasnymi blaszkami zostaw'
        ],
        fatal: true
      },
      {
        confusedWithId: 'agaricus_xanthodermus',
        confusedWithName: 'Pieczarka żółtawa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Pieczarka żółtawa żółknie chromowo po potarciu, zwłaszcza u nasady trzonu, i pachnie fenolem, karbolowo albo atramentem',
          'Pieczarka polna tak nie żółknie i nie pachnie karbolowo',
          'Silne żółknięcie wyklucza tę kartę'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Białe blaszki i pochwa u nasady wskazują na muchomora, nie na pieczarkę. Młode owocniki z jeszcze jasnymi blaszkami są szczególnie ryzykowne. Pieczarek silnie żółknących o zapachu karbolu ta karta nie opisuje.'
  },
  {
    id: 'chlorophyllum_rhacodes',
    namePl: 'Czubajnik czerwieniejący',
    nameLatin: 'Chlorophyllum rhacodes',
    commonNicknames: ['Czubajka czerwieniejąca'],
    family: 'Pieczarkowate (Agaricaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Obrzeża lasów, polany, przy drogach, na glebie bogatej w materię organiczną. Czasem w czarcich kręgach. Pora jest orientacyjna.',
    capDescription: 'Do około 15 cm. Najpierw prawie kulisty, potem parasolowaty, z odstającymi, ciemnobrązowymi łuskami na szarobrązowym tle.',
    hymenophoreDescription: 'Blaszki białe lub kremowe, wolne. Po uszkodzeniu czerwienieją.',
    stemDescription: 'Do około 15 cm, u dołu z wyraźną bulwą. Pierścień jest ruchomy, nieprzyrośnięty do trzonu. Na trzonie nie ma łusek wężowej skóry kani.',
    fleshDescription: 'Miąższ białawy. Po uszkodzeniu przebarwia się na żółtopomarańczowo, a trzon szybko czerwienieje. Czerwienienie nie jest dowodem bezpieczeństwa.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'W części źródeł nadal opisywany jako jadalny; u części osób powoduje poważne dolegliwości żołądkowo-jelitowe; łatwo pomylić z trującymi czubajnikami o podobnych łuskach i czerwieniejącym miąższu. Ta karta nie podaje sposobu przyrządzania i nie zaleca spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Czubajnik po uszkodzeniu czerwienieje, a na trzonie nie ma łuskowatego wzoru kani',
          'Opis kani jako jadalnej nie przenosi się na czubajnika'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor sromotnikowy ma luźną pochwę u nasady i nie czerwienieje po przekrojeniu',
          'Młode, zamknięte owocniki są najłatwiejsze do pomylenia — nie zbieraj ich'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Młode owocniki łatwo pomylić ze śmiertelnymi muchomorami. Podobnych czerwieniejących czubajników ta karta nie rozdziela.'
  },
  {
    id: 'hygrophoropsis_aurantiaca',
    namePl: 'Lisówka pomarańczowa',
    nameLatin: 'Hygrophoropsis aurantiaca',
    commonNicknames: ['Fałszywa kurka'],
    family: 'Lisówkowate (Hygrophoropsidaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [9, 10, 11],
    habitat: 'Lasy iglaste, często na ściółce i martwym drewnie. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz jaskrawo pomarańczowy, często lejkowaty, o cienkim miąższu.',
    hymenophoreDescription: 'Prawdziwe blaszki: cienkie, gęste, wiotkie, często rozwidlone. To nie są grube listewki kurki.',
    stemDescription: 'Trzon w barwie kapelusza, zwykle smukły.',
    fleshDescription: 'Miąższ cienki, wiotki, bez morelowego zapachu kurki.',
    tasteAndSmell: 'Brak wyraźnego owocowego zapachu kurki. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Nie jedz. Opracowania nie są zgodne: bywa nazywana niejadalną albo lekko trującą. Owocniki zawierają arabitol, który u części osób wywołuje zaburzenia trawienne. Ta karta nie podaje przepisu.',
    confusionRisks: [
      {
        confusedWithId: 'cantharellus_cibarius',
        confusedWithName: 'Pieprznik jadalny (Kurka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kurka ma grube, zbiegające fałdy (listewki), lisówka ma cienkie prawdziwe blaszki',
          'Kurka jest żółta, jajeczna; lisówka bywa jaskrawo pomarańczowa',
          'Kurka pachnie morelowo; lisówka nie'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. To nie jest kurka. W tym atlasie lisówka jest trująca, bo część osób źle znosi jej spożycie. Nie jest to muchomor, ale nie jest też grzybem do koszyka.'
  },
  {
    id: 'lactarius_torminosus',
    namePl: 'Mleczaj wełnianka',
    nameLatin: 'Lactarius torminosus',
    commonNicknames: ['Wełnianka'],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10, 11],
    habitat: 'Wyłącznie pod brzozami, w lasach, parkach i zaroślach. Pora jest orientacyjna.',
    capDescription: 'Kapelusz różowawy do czerwonobrązowego, u starszych bardziej pomarańczowożółty, z ciemniejszymi kręgami. Brzeg mocno podwinięty i wełnisto owłosiony.',
    hymenophoreDescription: 'Blaszki jasne, ściekające mleczkiem po uszkodzeniu.',
    stemDescription: 'Trzon jasny, kruchy, bez pierścienia.',
    fleshDescription: 'Wydziela białe mleczko. Mleczko rydza jest marchewkowo-pomarańczowe.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Nie jedz. W tej bazie gatunek jest trujący. Ta karta nie podaje obróbki, która miałaby go przygotować do spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_deliciosus',
        confusedWithName: 'Rydze',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Wełnianka ma wełnisty brzeg kapelusza i białe mleczko',
          'Rydz ma mleczko pomarańczowe i rośnie głównie pod sosnami',
          'Wełnianka rośnie pod brzozami'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Białe mleczko i wełnisty brzeg odróżniają ją od rydza. Ta karta nie podaje sposobu „odtruwania”.',
  },
  {
    id: 'morchella_esculenta',
    namePl: 'Smardz jadalny',
    nameEn: 'Common morel',
    nameLatin: 'Morchella esculenta',
    commonNicknames: ['Smardz', 'Murchel majowy'],
    family: 'Smardzowate (Morchellaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'OTHER',
    months: [4, 5],
    habitat: 'Wiosną, w lasach i zadrzewieniach liściastych oraz w sadach. Sam termin nie rozstrzyga gatunku. Siedlisko bywa różne u smardzów.',
    capDescription: 'Główka żebrowato-plasterkowata, jak plaster miodu, a nie pofałdowana mózgowato.',
    hymenophoreDescription: 'Warstwa rodzajna na żeberkowanej powierzchni główki.',
    stemDescription: 'Trzon jasny, połączony z główką. Cały owocnik jest w środku pusty i tworzy jedną komorę.',
    fleshDescription: 'Cienki, woskowaty. Wnętrze puste i tworzy jedną komorę. Piestrzenica jest pofałdowana mózgowato, a młode owocniki bywają w środku pełne.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze owocniki są kruche, woskowate, o korzennym zapachu.',
    culinaryValue: 'W literaturze wyłącznie po obróbce termicznej. Surowe i niedogotowane są trujące. Miąższ bywa łykowaty. W Polsce pod ochroną częściową: zbiór dziko rosnących tylko za zezwoleniem RDOŚ/GDOŚ; do obrotu dopuszczony wyłącznie z upraw/terenów zieleni lub spoza Polski. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'gyromitra_esculenta',
        confusedWithName: 'Piestrzenica kasztanowata',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Smardz ma główkę żebrowato-plasterkowatą; piestrzenica jest pofałdowana mózgowato',
          'Smardz jest w środku pusty i tworzy jedną komorę',
          'Piestrzenica kasztanowata jest śmiertelnie trująca. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Surowe i niedogotowane smardze są trujące. Piestrzenica kasztanowata jest śmiertelnie groźnym sobowtórem. Rozporządzenie Ministra Środowiska z dnia 9 października 2014 r. w sprawie ochrony gatunkowej grzybów (Dz.U. poz. 1408), załącznik nr 2: ochrona częściowa obejmuje okazy smardza jadalnego rosnące poza terenem ogrodów, upraw ogrodniczych, szkółek leśnych oraz poza terenami zieleni. § 6 ust. 2 pkt 4 zakazuje zbioru dziko występujących grzybów objętych ochroną częściową. Załącznik nr 3 wskazuje ręczny zbiór owocników, a § 7 pkt 2 uzależnia pozyskanie gatunków z tego załącznika od zezwolenia regionalnego dyrektora ochrony środowiska albo Generalnego Dyrektora Ochrony Środowiska. Ta karta nie jest takim zezwoleniem.'
  },
  {
    id: 'hydnum_repandum',
    namePl: 'Kolczak obłączasty',
    nameEn: 'Wood hedgehog',
    nameLatin: 'Hydnum repandum',
    commonNicknames: ['Kolczak'],
    family: 'Kolczakowate (Hydnaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'SPINES',
    months: [7, 8, 9, 10, 11],
    habitat: 'Lasy liściaste i iglaste, często pod bukiem i świerkiem, na glebach zasobnych w wapń. Owocniki nierzadko zrastają się w kępy.',
    capDescription: 'Do około 10–15 cm, nieregularny, wklęsły, kremowy do bladopomarańczowego. Brzeg za młodu podwinięty. Starsze owocniki gorzknieją.',
    hymenophoreDescription: 'Zamiast blaszek i rurek są gęste, łamliwe kolce, u młodych bladożółte, później białawe lub pomarańczowe. Mogą schodzić na trzon.',
    stemDescription: 'Krótki, dość gruby, często asymetryczny, kremowy do jasnobrązowego, bez pierścienia i bez pochwy.',
    fleshDescription: 'Miąższ białawy, po uszkodzeniu żółknie. Jest twardy. Jeść tylko po obróbce termicznej.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. Starsze owocniki, z długimi kolcami, bywają gorzkie.',
    culinaryValue: 'Według Zarzyńskiego (2021) na surowo lekko trujący, jeść tylko po obróbce termicznej. W literaturze młode owocniki po obróbce cieplnej bywają podawane jako jadalne i dopuszczone do obrotu. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'cantharellus_cibarius',
        confusedWithName: 'Pieprznik jadalny (Kurka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kurka ma grube listewki, kolczak ma kolce',
          'Młode owocniki i tak trzeba obejrzeć od spodu',
          'Sarniak dachówkowaty też ma kolce, ale łuskowaty kapelusz, i nie ma go w tym atlasie'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. W literaturze jadalny tylko po obróbce termicznej. Brak zdjęcia. Sarniak dachówkowaty (Sarcodon imbricatus) ma kolce i odstające łuski na kapeluszu; nie ma go w atlasie. Nazwa „sarniak” bywa też ludową nazwą kolczaka i nie rozstrzyga gatunku. Ludowe „sarna” zwykle oznacza sarniaka, nie ten gatunek.'
  },
  {
    id: 'amanita_pantherina',
    namePl: 'Muchomor plamisty',
    nameLatin: 'Amanita pantherina',
    commonNicknames: ['Muchomor panterowy'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy iglaste i liściaste, na suchszych, piaszczystych glebach, pod sosnami, świerkami, dębami i bukami.',
    capDescription: 'Do około 12 cm. Najpierw półkulisty, potem rozpostarty. Brązowawy, z białymi łatkami, które deszcz może zmyć. Brzeg zwykle krótko prążkowany, ale forma górska (A. pantherina f. abietum), w górach, pod jodłami i świerkami, ma brzeg gładki albo tylko słabo prążkowany u starych owocników. Prążkowanie brzegu nie rozstrzyga gatunku.',
    hymenophoreDescription: 'Blaszki białe, gęste, wolne.',
    stemDescription: 'Smukły, biały, gładki, z przyrośniętym, gładkim pierścieniem. Nasada bulwiasta, z pochwą w postaci równego kołnierza i często dodatkowych wałeczków.',
    fleshDescription: 'Biały, kruchy, nie zmienia barwy po uszkodzeniu.',
    tasteAndSmell: 'Zapach rzodkiewki. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Silnie trujący. Zawiera kwas ibotenowy i muscymol. Zatrucie przypomina muchomora czerwonego, ale bywa cięższe: wymioty, biegunka, halucynacje, drgawki. Nie jedz.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_rubescens',
        confusedWithName: 'Muchomor czerwieniejący',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Muchomor plamisty ma pierścień gładki, nie prążkowany. Czerwieniejący ma pierścień z prążkami',
          'Miąższ plamistego nie czerwienieje. U czerwieniejącego uszkodzony miąższ różowieje albo czerwienieje',
          'Bulwa plamistego ma odstający rąbek. Brzeg kapelusza nie jest pewną różnicą: typowy plamisty bywa prążkowany, ale forma górska ma brzeg bez prążków'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_excelsa',
        confusedWithName: 'Muchomor twardawy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Twardawy ma pierścień prążkowany od góry. Plamisty ma pierścień gładki',
          'Bulwa twardawego nie ma wyraźnego rąbka. U plamistego pochwa tworzy kołnierz na bulwie',
          'Brzeg kapelusza nie rozstrzyga. Forma górska plamistego (A. pantherina f. abietum), w górach, pod jodłami i świerkami, ma brzeg gładki, a u twardawego prążkowanie brzegu też nie jest stałe',
          'Żaden z tych dwóch nie czerwienieje. Czerwienienie wskazuje raczej na muchomora czerwieniejącego, nie na bezpieczeństwo'
        ],
        fatal: false
      },
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kania ma ruchomy pierścień i nie ma pochwy. Muchomor plamisty ma pierścień przyrośnięty i kołnierz na bulwie',
          'Brzeg kapelusza muchomora plamistego bywa prążkowany, ale forma górska ma brzeg gładki. Pewniejsze są przyrośnięty pierścień i kołnierz na bulwie',
          'Białe łatki na brązowym kapeluszu nie czynią grzyba kanią'
        ],
        fatal: false
      }
    ],
    warningNotes: `NIE JEDZ. Silnie trujący. Łatki może zmyć deszcz, więc gładki brązowy kapelusz nadal może być tym muchomorem. ${PANTHER_POISONING_SYMPTOMS} ${GIS_MUSHROOM_FIRST_AID}`
  },
  {
    id: 'amanita_virosa',
    namePl: 'Muchomor jadowity',
    nameLatin: 'Amanita virosa',
    commonNicknames: ['Muchomor biały'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10, 11],
    habitat: 'Raczej nieliczny. Lasy iglaste, zwłaszcza górskie, pod świerkami, sosnami i bukami, także wilgotne miejsca z brzozą.',
    capDescription: 'Do około 10 cm. Najpierw jajowaty, potem dzwonkowaty i lekko wypukły. Biały, na środku czasem żółtawy, w wilgoci lepki. Brzeg gładki, bez prążków. Resztki osłony w postaci łat w deszczu znikają.',
    hymenophoreDescription: 'Blaszki białe, gęste, wolne. Nie różowieją.',
    stemDescription: 'Biały, z włóknistymi łuskami i bulwiastą nasadą w postrzępionej pochwie. Pierścień przyrośnięty, u starszych owocników może zanikać.',
    fleshDescription: 'Biały, kruchy.',
    tasteAndSmell: 'Zapach bywa przyjemny albo rzodkiewkowy. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący, z tej samej grupy co muchomor sromotnikowy. Objawy zwykle po 6–24 h, czasem później; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii. Nie ma kuchennego sposobu, żeby go „odtruć”.',
    confusionRisks: [
      {
        confusedWithId: 'agaricus_campestris',
        confusedWithName: 'Pieczarka polna',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Pieczarka polna nie ma pochwy, a blaszki dojrzałych owocników są różowe, potem ciemnobrązowe',
          'Muchomor jadowity ma białe blaszki i pochwę u nasady',
          'Młode, jeszcze jasne owocniki zostaw'
        ],
        fatal: false
      },
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kania ma ruchomy pierścień i nie ma pochwy',
          'Muchomor jadowity ma pochwę i włókniste łuski na trzonie',
          'Biały kapelusz z pochwą nie jest kanią'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Śmiertelnie trujący. Biały kapelusz, białe blaszki i pochwa u nasady to powód, żeby owocnik zostawić. Brak zdjęcia.'
  },
  {
    id: 'agaricus_xanthodermus',
    namePl: 'Pieczarka żółtawa',
    nameEn: 'Yellow stainer',
    nameLatin: 'Agaricus xanthodermus',
    commonNicknames: ['Pieczarka karbolowa', 'Pieczarka cuchnąca'],
    family: 'Pieczarkowate (Agaricaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9, 10],
    habitat: 'Lasy liściaste, parki, pobocza dróg i trawniki, miejsca żyzne. Często w czarcich kręgach.',
    capDescription: 'Półkulisty do rozpostartego, białawy, kremowy lub szarobrązowy. Potarty brzeg kapelusza żółknie.',
    hymenophoreDescription: 'Blaszki różowoszare, z wiekiem ciemniejsze. To nie są trwale białe blaszki muchomora.',
    stemDescription: 'Białawy, z szerokim, wyraźnym, zwisającym pierścieniem i bulwiastą podstawą. Brak pochwy.',
    fleshDescription: 'Miąższ biały. Po potarciu, a najmocniej po nacięciu nasady trzonu, szybko żółknie chromowo.',
    tasteAndSmell: 'Zapach fenolu, karbolu albo atramentu, najmocniejszy przy naciętej nasadzie i przy podgrzaniu. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trująca. Żółknięcie i zapach karbolu nie znikają od „dobrego przepisu”. Nie jedz.',
    confusionRisks: [
      {
        confusedWithId: 'agaricus_campestris',
        confusedWithName: 'Pieczarka polna',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Pieczarka polna nie żółknie chromowo u nasady i nie pachnie fenolem ani atramentem',
          'Pieczarka żółtawa ma szeroki, wyraźny pierścień. Po potarciu, zwłaszcza u nasady trzonu, żółknie chromowo',
          'Karta pieczarki polnej nie obejmuje pieczarek silnie żółknących'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_virosa',
        confusedWithName: 'Muchomor jadowity',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor jadowity ma białe blaszki i pochwę. Pieczarka żółtawa pochwy nie ma, a blaszki różowieją',
          'Żółknięcie u nasady nie wyklucza muchomora, jeśli są białe blaszki i pochwa',
          'Przy białych blaszkach i pochwie zostaw owocnik'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ. Trująca. Chromowe żółknięcie u nasady trzonu i zapach karbolu odróżniają ją od pieczarki polnej. Brak zdjęcia.'
  },
  {
    id: 'inocybe_erubescens',
    namePl: 'Strzępiak ceglasty',
    nameLatin: 'Inosperma erubescens (syn. Inocybe erubescens)',
    commonNicknames: ['Włókniak ceglasty'],
    family: 'Strzępiakowate (Inocybaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9],
    habitat: 'Prześwietlone lasy liściaste, zarośla i stare parki, pod dębami, bukami, grabami i lipami. Późna jesień jest rzadka.',
    capDescription: 'Najpierw dzwonkowaty z podwiniętym brzegiem, potem płaski z garbkiem. Promieniście popękany, od białawego przez żółtawy do ceglastobrązowego.',
    hymenophoreDescription: 'Prawdziwe blaszki, najpierw białe, potem brązowawe, gęste. Po uszkodzeniu czerwienieją. To nie są grube listewki kurki.',
    stemDescription: 'Biały, z wiekiem ceglasty, walcowaty, pełny, często krzywy i zgrubiały u nasady. Bez pierścienia i bez pochwy.',
    fleshDescription: 'Mięsisty. Po przekrojeniu czerwienieje.',
    tasteAndSmell: 'Zapach bywa słodkawy, owocowy. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący. Zawiera dużo muskaryny. Nie ma obróbki, która robi z niego grzyb do jedzenia.',
    confusionRisks: [
      {
        confusedWithId: 'calocybe_gambosa',
        confusedWithName: 'Gęśnica wiosenna (majówka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Gęśnica wiosenna nie czerwienieje. Strzępiak po uszkodzeniu czerwienieje i z wiekiem staje się ceglasty',
          'Gęśnica pachnie mącznie i ma gładki, mięsisty kapelusz. Strzępiak ma kapelusz promieniście popękany',
          'Oba wyrastają wiosną w podobnych miejscach. Czerwienienie wyklucza majówkę'
        ],
        fatal: false
      },
      {
        confusedWithId: 'cantharellus_cibarius',
        confusedWithName: 'Pieprznik jadalny (Kurka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kurka ma grube, zbiegające listewki. Strzępiak ma cienkie blaszki, które czerwienieją',
          'Młody, jeszcze jasny strzępiak jest najłatwiejszy do pomylenia',
          'Czerwienienie i ceglasty kolor nie są cechą kurki'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Śmiertelnie trujący. Młode owocniki bywają brane za gęśnicę wiosenną (majówkę) i za kurki. Brak zdjęcia. Gęśnica wiosenna ma osobną kartę. Płachetki zwyczajnej nie ma w tym atlasie.'
  },
  {
    id: 'hypholoma_fasciculare',
    namePl: 'Maślanka wiązkowa',
    nameEn: 'Sulphur tuft',
    nameLatin: 'Hypholoma fasciculare',
    commonNicknames: ['Maślanka trująca'],
    family: STROPHARIACEAE,
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [4, 5, 6, 7, 8, 9, 10, 11],
    habitat: 'Kępami na pniakach i martwym drewnie drzew liściastych i iglastych, często obok opieńek i łuskwiaka zmiennego.',
    capDescription: 'Średnica 2–7 cm. Siarkowożółty, na środku często pomarańczowobrązowy. Brzeg za młodu podwinięty, z resztkami osłony.',
    hymenophoreDescription: 'Blaszki gęste, najpierw siarkowożółte, potem zielonkawe, na końcu ciemnobrązowe od zarodników. Nie są cynamonowobrązowe jak u hełmówki.',
    stemDescription: 'Cienki, siarkowożółty, bez trwałego pierścienia. Owocniki zrastają się trzonami w wiązkę.',
    fleshDescription: 'Cienki, żółty.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trująca. Powoduje dolegliwości żołądkowo-jelitowe. Nie jedz.',
    confusionRisks: [
      {
        confusedWithId: 'armillaria_mellea',
        confusedWithName: 'Opieńki',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Opieńki mają wyraźniejszy pierścień i kapelusz miodowy, nie siarkowożółty',
          'Maślanka wiązkowa ma blaszki zielonkawożółte, potem ciemne',
          'Na jednym pniaku mogą rosnąć obok siebie. Żółte blaszki to powód, żeby wiązkę zostawić'
        ],
        fatal: false
      },
      {
        confusedWithId: 'kuehneromyces_mutabilis',
        confusedWithName: 'Łuskwiak zmienny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Łuskwiak zmienny ma cynamonowobrązowe blaszki i wyraźny pierścień',
          'Maślanka wiązkowa jest siarkowożółta i nie ma trwałego pierścienia',
          'Młode wiązki na pniaku zostaw, jeśli nie widzisz blaszek'
        ],
        fatal: false
      },
      {
        confusedWithId: 'galerina_marginata',
        confusedWithName: 'Hełmówka jadowita',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Hełmówka ma cynamonowobrązowe blaszki i często cienki pierścień',
          'Maślanka wiązkowa ma blaszki żółtozielonkawe',
          'Hełmówka jadowita jest śmiertelnie trująca. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      },
      {
        confusedWithId: 'hypholoma_capnoides',
        confusedWithName: 'Maślanka łagodna',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślanka łagodna ma blaszki szare, nie siarkowożółte ani zielonkawe',
          'Rośnie na drewnie iglastym. Maślanka wiązkowa bywa na liściastym i iglastym',
          'Maślanka łagodna ma kartę. Żółte albo zielonkawe blaszki to nie ta karta'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Trująca. Rośnie na pniakach razem z opieńkami i łuskwiakiem, a hełmówka jadowita bywa na tym samym drewnie. Maślanka łagodna (Hypholoma capnoides) ma szare blaszki i osobną kartę. Brak zdjęcia.'
  },
  {
    id: 'tricholoma_equestre',
    namePl: 'Gąska zielonka',
    nameEn: 'Yellow knight',
    nameLatin: 'Tricholoma equestre (syn. T. flavovirens, T. auratum)',
    commonNicknames: ['Zielonka', 'Gąska zielona'],
    family: 'Gąskowate (Tricholomataceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [9, 10, 11],
    habitat: 'Piaszczyste bory sosnowe, często częściowo zagrzebana w mchu i piasku.',
    capDescription: 'Średnica 5–12 cm. Żółtozielony, oliwkowy, na środku brązowawy. Skórka lepka, z wrośniętymi włókienkami.',
    hymenophoreDescription: 'Blaszki siarkowożółte, gęste, wycięte ząbkiem. Nie są białe jak u muchomora.',
    stemDescription: 'Żółty, pełny, bez pierścienia i bez pochwy. Nasada nie ma bulwy w pochwie.',
    fleshDescription: 'Biały albo żółtawy, pod skórką kapelusza żółty.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'W tej aplikacji trująca. Opisywano rabdomiolizę po wielokrotnym spożyciu. Francja zakazała sprzedaży w 2005 r. W Polsce gatunek jest wciąż na wykazie grzybów dopuszczonych do obrotu (rozporządzenie MZ, tekst jednolity Dz.U. 2026 poz. 258). Ta karta nie jest zgodą na zbiór ani sprzedaż.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy (zielonawy)',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Muchomor sromotnikowy ma białe blaszki, pierścień i pochwę u nasady',
          'Gąska zielonka ma żółte blaszki i nie ma pochwy ani pierścienia',
          'Zielonkawy kapelusz bez obejrzenia blaszek i nasady trzonu nie rozstrzyga gatunku'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ. Aplikacja traktuje gąskę zielonkę jako trującą z powodu ryzyka rabdomiolizy, mimo że rozporządzenie MZ nadal dopuszcza ją do obrotu. Muchomor sromotnikowy bywa z nią mylony. Brak zdjęcia. Gąski siarkowej nie ma na osobnej karcie.'
  },
  {
    id: 'neoboletus_luridiformis',
    namePl: 'Borowik ceglastopory',
    nameEn: 'Scarletina bolete',
    nameLatin: 'Neoboletus luridiformis, Neoboletus erythropus',
    commonNicknames: ['Borowik ceglasty'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy iglaste i liściaste, pod świerkiem, bukiem i dębem. Dwie nazwy GBIF opisują ten sam grzyb w praktyce zbioru: zdjęcie ich nie rozdziela.',
    capDescription: 'Średnica do około 20 cm. Ciemnobrązowy, filcowaty, suchy. Po uciśnięciu miąższ i pory szybko sinieją.',
    hymenophoreDescription: 'Rurki i pory ceglastoczerwone albo pomarańczowoczerwone. Po dotknięciu natychmiast sinieją. To nie są różowe rurki goryczaka.',
    stemDescription: 'Żółty do czerwonawego, pokryty drobnymi czerwonymi punkcikami, bez wyraźnej siateczki. Po uszkodzeniu sinieje.',
    fleshDescription: 'Żółty, po przekrojeniu szybko niebiesko-czarny.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze miąższ żółty, zapach opisywany jako przyjemny.',
    culinaryValue: 'W literaturze jadalny wyłącznie po obróbce termicznej. Surowy i niedogotowany jest trujący. W literaturze podawany po obgotowaniu i odlaniu wody. Nie ma go na wykazie MZ grzybów dopuszczonych do obrotu. Łatwo pomylić z trującymi borowikami o czerwonych porach. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Goryczak ma brudnoróżowe rurki i ciemną, wypukłą siatkę na trzonie',
          'Ceglastopory ma czerwone pory i trzon w czerwonych punkcikach, a miąższ sinieje',
          'Goryczak nie sinieje na niebiesko'
        ],
        fatal: false
      },
      {
        confusedWithId: 'suillellus_luridus',
        confusedWithName: 'Borowik ponury',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Borowik ponury ma na trzonie siateczkę, ceglastopory ma czerwone punkciki',
          'Oba sinieją. Objawy zatrucia ponurego jego karta podaje tylko ogólnie',
          'Porównanie jest na karcie borowika ponurego'
        ],
        fatal: false
      },
      {
        confusedWithId: 'rubroboletus_satanas',
        confusedWithName: 'Borowik szatański',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Borowik szatański ma jasny kapelusz i trzon z wyraźną czerwoną siatką',
          'Jest trujący i w Polsce ściśle chroniony. Ma osobną kartę',
          'Czerwone pory nie rozstrzygają, czy to ceglastopory'
        ],
        fatal: false
      },
      {
        confusedWithId: 'imperator_rhodopurpureus',
        confusedWithName: 'Borowik purpurowy',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Imperator rhodopurpureus ma kapelusz z różowopurpurowym odcieniem i trzon z czerwoną siatką',
          'Ceglastopory ma ciemnobrązowy kapelusz i trzon w czerwonych punkcikach, bez siatki',
          'Oba silnie sinieją. Purpurowy odcień kapelusza to powód, żeby owocnik zostawić'
        ],
        fatal: false
      },
      {
        confusedWithId: 'imperator_torosus',
        confusedWithName: 'Borowik żółtopory',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Imperator torosus ma żółte pory, które z wiekiem czerwienieją, i trzon z siatką',
          'Ceglastopory ma pory ceglastoczerwone od młodości i trzon w punkcikach',
          'Żółte pory, które sinieją, nie są ceglastoporym'
        ],
        fatal: false
      },
      {
        confusedWithId: 'rubroboletus_other',
        confusedWithName: 'Inne borowiki z rodzaju Rubroboletus',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Rubroboletus legaliae, R. rhodoxanthus i pokrewne mają czerwone pory i często siatkę na trzonie',
          'Są trujące. Czerwone pory nie rozstrzygają gatunku',
          'Ceglastopory nie ma wyraźnej siatki. Siatka na trzonie to powód, żeby owocnik zostawić'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. W literaturze jadalny tylko po obróbce termicznej. Borowik szatański (Rubroboletus satanas) jest trujący i ściśle chroniony. Imperator rhodopurpureus, Imperator torosus i inne Rubroboletus też są trujące i nie mają kart. Brak zdjęcia.'
  },
  {
    id: 'xerocomellus_chrysenteron',
    namePl: 'Podgrzybek złotawy',
    nameEn: 'Red cracking bolete',
    nameLatin: 'Xerocomellus chrysenteron',
    commonNicknames: ['Podgrzybek złotopory', 'Xerocomellus pascuus'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy liściaste i mieszane, często pod bukiem, dębem i świerkiem.',
    capDescription: 'Średnica 4–10 cm. Brązowawy, suchy, pękający na poletka, w pęknięciach różowawy albo czerwonawy.',
    hymenophoreDescription: 'Rurki żółte, potem oliwkowe, szerokie. Po uciśnięciu powoli sinieją.',
    stemDescription: 'Smukły, żółtawy, często z czerwonawym nalotem, bez pierścienia i bez siateczki.',
    fleshDescription: 'Miękki, żółtawy, w kapeluszu po przekrojeniu słabo sinieje.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. Łagodny smak nie rozstrzyga gatunku.',
    culinaryValue: 'W literaturze powszechnie zbierany i dopuszczony do obrotu. Owocniki łatwo robaczywieją i pleśnieją. W literaturze podawany do suszenia, marynowania, duszenia i gotowania, najlepiej jako dodatek do innych grzybów. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'imleria_badia',
        confusedWithName: 'Podgrzybek brunatny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Podgrzybek brunatny ma ciemniejszy, niepękający kapelusz i mocniej siniejące pory',
          'Złotawy pęka na różowawe poletka',
          'Żaden z tych opisów nie zastępuje obejrzenia całego owocnika'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Stare, spleśniałe albo rozmiękłe owocniki zostaw. Pleśń i rozkład nie są cechą gatunku. Brak zdjęcia. Pękający kapelusz z różem w szczelinach odróżnia go od podgrzybka brunatnego tylko razem z resztą owocnika. W źródłach bywa jako Xerocomellus pascuus; identyfikator karty zostaje xerocomellus_chrysenteron.'
  },
  {
    id: 'leccinum_aurantiacum',
    namePl: 'Koźlarze czerwone',
    nameEn: 'Orange-capped scaber stalks',
    nameLatin: 'Leccinum aurantiacum, Leccinum versipelle',
    commonNicknames: ['Koźlarz czerwony', 'Koźlarz pomarańczowożółty', 'Kozak'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Koźlarz czerwony pod osiką i innymi topolami, także pod dębem. Koźlarz pomarańczowożółty pod brzozą. Drzewo-gospodarz rozdziela je pewniej niż zdjęcie, dlatego to jedna karta.',
    capDescription: 'Średnica 6–20 cm. Ceglastopomarańczowy, rudy albo pomarańczowożółty. Skórka sucha, filcowata, zwisa z brzegu kapelusza.',
    hymenophoreDescription: 'Rurki drobne, białawe, z wiekiem szarobrązowe. Nie są różowe.',
    stemDescription: 'Wysoki, pokryty czarniawymi albo rudymi kosmkami. Bez siateczki i bez pierścienia.',
    fleshDescription: 'Biały, po przekrojeniu szarzeje, fioletowieje albo czernieje. Koźlarz babka po przekrojeniu barwy nie zmienia.',
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
    culinaryValue: 'W literaturze powszechnie zbierany. W literaturze podawany do marynowania, gotowania, duszenia i suszenia. Rzadko bywa robaczywy. Ciemnienie miąższu po obróbce ogranicza dodatek octu do wody. Koźlarz czerwony (L. aurantiacum, w wykazie MZ jako L. rufum) jest dopuszczony do obrotu, koźlarz pomarańczowożółty (L. versipelle) nie. W literaturze jadalne tylko po obróbce termicznej. Surowe i niedogotowane powodują dolegliwości żołądkowo-jelitowe. W literaturze kosmki z trzonu zeskrobuje się przed jedzeniem. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'leccinum_scabrum',
        confusedWithName: 'Koźlarz babka',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Babka ma kapelusz szarobrązowy, nie ceglastopomarańczowy',
          'Miąższ babki po przekrojeniu nie zmienia barwy. Koźlarze czerwone ciemnieją',
          'Czerwony kapelusz pod brzozą to nie babka'
        ],
        fatal: false
      },
      {
        confusedWithId: 'tylopilus_felleus',
        confusedWithName: 'Goryczak żółciowy',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Goryczak ma ciemną siatkę na trzonie i różowiejące rurki',
          'Koźlarz ma kosmki na trzonie, nie siatkę',
          'Gorzki smak goryczaka psuje potrawę, ale smaku nie używaj do oznaczania'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Surowe i niedogotowane owocniki powodują dolegliwości żołądkowo-jelitowe. Koźlarz pomarańczowożółty nie jest dopuszczony do obrotu. Brak zdjęcia. Karta łączy koźlarza czerwonego i pomarańczowożółtego, bo zdjęcie ich nie rozdziela. Koźlarz grabowy, który czernieje pod grabem, nie jest na tej karcie.'
  },
  {
    id: 'xerocomus_subtomentosus',
    namePl: 'Podgrzybek zamszowy',
    nameEn: 'Suede bolete',
    nameLatin: 'Xerocomus subtomentosus',
    commonNicknames: ['Zajączek', 'Podgrzybek zajączek'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy liściaste i iglaste, przy drogach i na obrzeżach, pod dębem, bukiem, świerkiem i sosną.',
    capDescription: 'Średnica 4–12 cm. Oliwkowobrązowy, zamszowy, matowy. Pęknięcia nie pokazują różowego miąższu.',
    hymenophoreDescription: 'Rurki żółte, szerokie, kanciaste. Po uciśnięciu słabo sinieją albo nie sinieją.',
    stemDescription: 'Smukły, żółtawy, czasem z podłużnymi żeberkami, bez pierścienia.',
    fleshDescription: 'Białożółty, w kapeluszu miękki. Po przekrojeniu prawie nie sinieje.',
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
    culinaryValue: 'W literaturze chętnie zbierany i dopuszczony do obrotu. Łatwo robaczywieje i źle znosi transport. W literaturze podawany do suszenia, marynowania, duszenia i gotowania. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'imleria_badia',
        confusedWithName: 'Podgrzybek brunatny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Podgrzybek brunatny ma ciemniejszy, lepki w deszczu kapelusz i wyraźnie siniejące pory',
          'Zamszowy jest matowy i oliwkowy, a pory ma jaskrawożółte',
          'Maślaczek pieprzowy (Chalciporus piperatus) nie ma w atlasie: ma cynamonowe pory i piekący smak'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Brak zdjęcia. Maślaczek pieprzowy (Chalciporus piperatus) nie ma karty. Brak karty nie oznacza, że grzyb jest jadalny.'
  },
  {
    id: 'suillus_grevillei',
    namePl: 'Maślak żółty',
    nameEn: 'Larch bolete',
    nameLatin: 'Suillus grevillei',
    commonNicknames: ['Maślak modrzewiowy'],
    family: 'Maślakowate (Suillaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Wyłącznie pod modrzewiem, w parkach i w lesie.',
    capDescription: 'Średnica 4–12 cm. Złocistożółty do pomarańczowego, bardzo lepki. Skórka ściąga się łatwo.',
    hymenophoreDescription: 'Rurki żółte, zakryte u młodych białożółtą błoną. Po uciśnięciu brązowieją.',
    stemDescription: 'Żółty, z pierścieniem, który u starszych owocników przywiera do trzonu. Nad pierścieniem często jest siateczkowaty.',
    fleshDescription: 'Jasnożółty, w kapeluszu miękki. Po przekrojeniu barwi się na brudnoróżowo.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze (Zarzyński, 2021) jasnożółty miąższ ma słaby zapach kojarzący się z owocami.',
    culinaryValue: 'W literaturze chętnie zbierany i dopuszczony do obrotu. W literaturze przed przyrządzeniem zdejmuje się skórkę z kapelusza. W literaturze podawany do marynowania, duszenia, suszenia, gotowania i smażenia. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'suillus_luteus',
        confusedWithName: 'Maślak zwyczajny i ziarnisty',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślak żółty rośnie pod modrzewiem i ma złocisty kapelusz',
          'Maślak zwyczajny rośnie pod sosną i ma czekoladowy kapelusz',
          'Drzewo obok owocnika jest tu ważniejsze niż odcień kapelusza na zdjęciu'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Brak zdjęcia. Rośnie pod modrzewiem. Bez modrzewia to nie jest ta karta.'
  },
  {
    id: 'suillus_bovinus',
    namePl: 'Maślak sitarz',
    nameEn: 'Jersey cow bolete',
    nameLatin: 'Suillus bovinus',
    commonNicknames: ['Sitarz'],
    family: 'Maślakowate (Suillaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [7, 8, 9, 10, 11],
    habitat: 'Pod sosnami, na ubogich, piaszczystych glebach, często gromadnie.',
    capDescription: 'Średnica 3–10 cm. Żółtobrązowy, cielisty, lepki, z falistym brzegiem.',
    hymenophoreDescription: 'Rurki szerokie, kanciaste, oliwkowożółte, zbiegające na trzon. Wyglądają jak sitko. Nie ma błony ani pierścienia.',
    stemDescription: 'Krótki, barwy kapelusza, bez pierścienia, często zwężony u nasady.',
    fleshDescription: 'Miękki, żółtawy albo różowawy. Elastyczny, nie kruchy.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze po przyrządzeniu smak bywa lekko kwaskowaty.',
    culinaryValue: 'W literaturze zbierany głównie z powodu masowego występowania. W literaturze podawany do gotowania, duszenia i marynowania, najlepiej jako dodatek do innych grzybów. Po ugotowaniu barwi się na czerwonofioletowo, co jest normalne. Na wykazie MZ. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'suillus_luteus',
        confusedWithName: 'Maślak zwyczajny i ziarnisty',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Sitarz nie ma pierścienia, a rurki ma szerokie, jak sitko',
          'Maślak zwyczajny ma pierścień i drobne rurki',
          'Maślak ziarnisty też nie ma pierścienia, ale rurki ma drobniejsze i trzon ziarnisty'
        ],
        fatal: false
      },
      {
        confusedWithId: 'imleria_badia',
        confusedWithName: 'Podgrzybek brunatny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Podgrzybek brunatny ma ciemniejszy kapelusz i pory, które sinieją',
          'Sitarz jest cielistożółty, lepki i nie sinieje',
          'Szerokie, zbiegające rurki wskazują na sitarza'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Brak zdjęcia. Szerokie rurki jak sitko i brak pierścienia odróżniają go od maślaka zwyczajnego.'
  },
  {
    id: 'suillus_variegatus',
    namePl: 'Maślak pstry',
    nameEn: 'Variegated bolete',
    nameLatin: 'Suillus variegatus',
    commonNicknames: ['Bagniak', 'Maślak piaskowy'],
    family: 'Maślakowate (Suillaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'TUBES',
    months: [7, 8, 9, 10],
    habitat: 'Bory sosnowe, często na piasku i w wilgotnym mchu. Nie jest tak lepki jak inne maślaki.',
    capDescription: 'Średnica 6–15 cm. Żółtobrązowy, pokryty drobnymi, przylegającymi łuseczkami. W deszczu tylko słabo lepki.',
    hymenophoreDescription: 'Rurki drobne, oliwkowobrązowe. Po uciśnięciu sinieją albo brązowieją.',
    stemDescription: 'Walcowaty, żółtawy, bez pierścienia, gładki albo drobno kosmkowaty.',
    fleshDescription: 'Żółtawy, po przekrojeniu słabo niebieskieje, zwłaszcza w trzonie. Zapach bywa chlorowy albo kwaskowaty.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze zapach słaby, chlorowy lub metaliczny; bywa też opisywany jako przypominający igliwie.',
    culinaryValue: 'W literaturze twardszy od innych maślaków; lokalnie zbierany przy masowych wysypach. W literaturze podawany do suszenia i długiego duszenia. Na wykazie MZ. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'imleria_badia',
        confusedWithName: 'Podgrzybek brunatny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślak pstry ma łuseczkowaty, piaskowy kapelusz i często chemiczny zapach',
          'Podgrzybek brunatny ma gładki, kasztanowy kapelusz',
          'Oba mogą sinieć. Łuseczki na kapeluszu wskazują na maślaka pstrego'
        ],
        fatal: false
      },
      {
        confusedWithId: 'suillus_luteus',
        confusedWithName: 'Maślak zwyczajny i ziarnisty',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślak zwyczajny jest bardzo lepki i ma pierścień',
          'Maślak pstry jest matowy, łuseczkowaty i pierścienia nie ma',
          'Kapelusz maślaka pstrego nie ściąga się tak łatwo jak u zwyczajnego'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Brak zdjęcia. Matowy, łuseczkowaty kapelusz odróżnia go od lepkiego maślaka zwyczajnego.'
  },
  {
    id: 'armillaria_mellea',
    namePl: 'Opieńki',
    nameEn: 'Honey fungi',
    nameLatin: 'Armillaria mellea, Armillaria ostoyae, Armillaria gallica',
    commonNicknames: ['Opieńka miodowa', 'Opieńka ciemna', 'Opieńka żółtawa', 'Podpienka'],
    family: 'Obrzękowcowate (Physalacriaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [8, 9, 10, 11],
    habitat: 'Kępami na pniakach i u podstawy żywych drzew, liściastych i iglastych. Grzybiarze nie rozdzielają opieńki miodowej, ciemnej i żółtawej na zdjęciu, dlatego to jedna karta.',
    capDescription: 'Średnica 3–12 cm. Miodowożółty, brązowy albo oliwkowy, z drobnymi, ciemniejszymi łuseczkami, które deszcz zmywa. Brzeg prążkowany u starszych owocników.',
    hymenophoreDescription: 'Blaszki białawe, potem kremowe z brązowymi plamkami. Nie są siarkowożółte ani zielonkawe.',
    stemDescription: 'Włóknisty, z błoniastym pierścieniem. U opieńki żółtawej pierścień bywa delikatniejszy. Nie ma pochwy.',
    fleshDescription: 'Biały, w trzonie łykowaty.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze zapach grzybowy; po przyrządzeniu smak korzenny.',
    culinaryValue: 'W literaturze jadalne są kapelusze młodych owocników. Trzony bywają łykowate. Surowy i niedogotowany jest trujący. W literaturze podawane po obgotowaniu (ok. 5 min) i odlaniu wody; oparów z gotowania nie wdycha się (u wrażliwych osób bóle głowy, wymioty). W literaturze podawane potem do marynowania, duszenia, zup i sosów. Na wykazie MZ. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'hypholoma_fasciculare',
        confusedWithName: 'Maślanka wiązkowa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Maślanka wiązkowa ma siarkowożółte, potem zielonkawe blaszki i nie ma trwałego pierścienia',
          'Opieńki mają jaśniejsze blaszki i pierścień',
          'Żółte blaszki na pniaku to powód, żeby wiązkę zostawić'
        ],
        fatal: false
      },
      {
        confusedWithId: 'galerina_marginata',
        confusedWithName: 'Hełmówka jadowita',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Hełmówka jest mniejsza, ma cynamonowobrązowe blaszki i cienki pierścień',
          'Opieńki rosną w większych kępach i mają jaśniejsze blaszki',
          'Hełmówka jadowita jest śmiertelnie trująca. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Jadalne tylko po obróbce termicznej. Hełmówka jadowita rośnie na tym samym drewnie i jest śmiertelnie trująca. Brak zdjęcia. Armillaria mellea w szerokim sensie obejmuje też owocniki spoza Europy, których ta karta nie rozdziela.'
  },
  {
    id: 'kuehneromyces_mutabilis',
    namePl: 'Łuskwiak zmienny',
    nameEn: 'Sheathed woodtuft',
    nameLatin: 'Kuehneromyces mutabilis',
    commonNicknames: ['Łuszczak zmienny'],
    family: STROPHARIACEAE,
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9, 10, 11],
    habitat: 'Gęstymi kępami na pniakach drzew liściastych, rzadziej iglastych.',
    capDescription: 'Średnica 3–8 cm. Dwubarwny: środek cynamonowy, brzeg jaśniejszy, gdy kapelusz jest wilgotny. Z wiekiem wyrównuje barwę.',
    hymenophoreDescription: 'Blaszki jasne, potem cynamonowobrązowe. Nie są siarkowożółte.',
    stemDescription: 'Pod pierścieniem łuseczkowaty, nad pierścieniem gładki. Pierścień jest wyraźny. Nie ma pochwy.',
    fleshDescription: 'Cienki, bladobrązowy. Surowe owocniki nie są do jedzenia.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. W literaturze miąższ kapelusza ma niezbyt silny zapach.',
    culinaryValue: 'W literaturze rzadko zbierany; można go uprawiać na drewnie. W literaturze podawany do duszenia i gotowania; zdrewniałe trzony się odcina. Na wykazie MZ wyłącznie z uprawy lub spoza Polski. Dziko rosnące nie są na tym wykazie. Łatwo pomylić ze śmiertelnie trującą hełmówką jadowitą. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'galerina_marginata',
        confusedWithName: 'Hełmówka jadowita',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Hełmówka ma trzon pod pierścieniem włóknisty, bez odstających łuseczek',
          'Łuskwiak zmienny ma pod pierścieniem łuseczkowaty trzon',
          'Hełmówka jadowita jest śmiertelnie trująca. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      },
      {
        confusedWithId: 'hypholoma_fasciculare',
        confusedWithName: 'Maślanka wiązkowa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Maślanka wiązkowa jest siarkowożółta i nie ma trwałego pierścienia',
          'Łuskwiak ma cynamonowe blaszki i pierścień',
          'Żółte blaszki wykluczają łuskwiaka'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Na wykazie Ministerstwa Zdrowia tylko z uprawy, nie dziko rosnący. Hełmówka jadowita jest śmiertelnym sobowtórem na tym samym drewnie. Brak zdjęcia.'
  },
  {
    id: 'galerina_marginata',
    namePl: 'Hełmówka jadowita',
    nameEn: 'Funeral bell',
    nameLatin: 'Galerina marginata',
    commonNicknames: ['Hełmówka obrzeżona'],
    family: 'Podziemniczkowate (Hymenogastraceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9, 10, 11],
    habitat: 'Na martwym drewnie iglastym i liściastym, pojedynczo albo w małych grupkach, także tam, gdzie rosną opieńki i łuskwiak.',
    capDescription: 'Średnica 1–6 cm. Miodowobrązowy, higrofaniczny, z prążkowanym brzegiem, gdy jest wilgotny.',
    hymenophoreDescription: 'Blaszki cynamonowobrązowe, dość rzadkie.',
    stemDescription: 'Cienki, z wąskim, często zanikającym pierścieniem. Pod pierścieniem włóknisty, bez odstających łuseczek. Nie ma pochwy.',
    fleshDescription: 'Cienki, brązowy. Zawiera amatoksyny, jak muchomor sromotnikowy.',
    tasteAndSmell: 'Zapach bywa mączny. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trująca. Objawy zwykle po 6–24 h, czasem później; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii. Nie ma kuchennego sposobu, żeby ją „odtruć”.',
    confusionRisks: [
      {
        confusedWithId: 'kuehneromyces_mutabilis',
        confusedWithName: 'Łuskwiak zmienny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Łuskwiak zmienny ma pod pierścieniem odstające łuseczki',
          'Hełmówka ma trzon włóknisty',
          'Na pniaku zostaw owocnik, jeśli łuseczek nie widzisz'
        ],
        fatal: false
      },
      {
        confusedWithId: 'armillaria_mellea',
        confusedWithName: 'Opieńki',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Opieńki rosną w dużych kępach i mają jaśniejsze blaszki',
          'Hełmówka jest mniejsza, a blaszki ma cynamonowe',
          'Wspólne drewno nie czyni opieńki bezpieczną, jeśli owocnik jest mały i brązowy'
        ],
        fatal: false
      },
      {
        confusedWithId: 'hypholoma_capnoides',
        confusedWithName: 'Maślanka łagodna (Hypholoma capnoides)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Maślanka łagodna ma blaszki szare do fioletowobrązowych. Hełmówka ma blaszki cynamonowobrązowe',
          'Hełmówka ma wąski pierścień, a trzon pod pierścieniem włóknisty',
          'Karta maślanki łagodnej odsyła tutaj po różnice. Same szare blaszki nie dowodzą, że to maślanka łagodna.'
        ],
        fatal: false
      },
      {
        confusedWithId: 'psilocybe',
        confusedWithName: 'Łysiczki (Psilocybe)',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
        keyDifferences: [GALERINA_PSILOCYBE_WARNING],
        fatal: false
      }
    ],
    warningNotes: `NIE JEDZ. Śmiertelnie trująca. Małe brązowe owocniki na drewnie zostaw. Brak zdjęcia. Maślanka łagodna ma osobną kartę i porównuje się z tą. ${GALERINA_PSILOCYBE_WARNING}`
  },
  {
    id: 'amanita_rubescens',
    namePl: 'Muchomor czerwieniejący',
    nameEn: 'Blusher',
    nameLatin: 'Amanita rubescens',
    commonNicknames: ['Muchomor czerwonawy'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy iglaste i liściaste, pod sosną, świerkiem, dębem i bukiem.',
    capDescription: 'Średnica 5–15 cm. Brudnoróżowy do brązowawego, z szarawymi łatkami, które deszcz może zmyć. Brzeg nie jest prążkowany.',
    hymenophoreDescription: 'Blaszki białe, gęste, wolne. Z wiekiem i po uszkodzeniu pojawiają się na nich czerwonawe plamy.',
    stemDescription: 'Biały, z pierścieniem prążkowanym od góry. Nasada bulwiasta, bez workowatej pochwy.',
    fleshDescription: 'Biały. Uszkodzony miąższ różowieje albo czerwienieje, zwłaszcza w trzonie i przy bulwie. Nie jeść na surowo ani niedogotowanego. Zawiera hemolizyny, które rozkłada dopiero kilkunastominutowe gotowanie.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. Czerwienienie nie jest dowodem, że grzyb jest jadalny.',
    culinaryValue: 'W literaturze w Polsce rzadko zbierany; do gotowania, smażenia, duszenia i marynowania, często robaczywy. Nie jeść na surowo ani niedogotowanego. Zawiera hemolizyny, które rozkłada dopiero kilkunastominutowe gotowanie. Silnie trujący sobowtór: muchomor plamisty. Nie ma go na wykazie MZ. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_pantherina',
        confusedWithName: 'Muchomor plamisty',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Plamisty ma pierścień gładki i nie czerwienieje. Czerwieniejący ma pierścień prążkowany, a miąższ i blaszki różowieją po uszkodzeniu',
          'Plamisty ma brzeg prążkowany i czysto białe łatki. Czerwieniejący ma brzeg gładki, a łatki szarawe',
          'Bulwa plamistego ma odstający rąbek. Zmyte łatki nie rozstrzygają gatunku'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_excelsa',
        confusedWithName: 'Muchomor twardawy (Amanita excelsa)',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Twardawy nie czerwienieje na blaszkach ani w miąższu',
          'Czerwieniejący różowieje po uszkodzeniu. Gładki brzeg nie rozstrzyga: twardawy też ma brzeg gładki',
          'Twardawy ma osobną kartę. Brak czerwienienia nie oznacza, że grzyb jest jadalny'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Nie jeść na surowo ani niedogotowanego. Zawiera hemolizyny, które rozkłada dopiero kilkunastominutowe gotowanie. Blaszki z wiekiem i po uszkodzeniu dostają czerwonawych plam. Muchomor plamisty ma brzeg prążkowany i czysto białe łatki, a nie czerwienieje. Brak zdjęcia.'
  },
  {
    id: 'amanita_citrina',
    namePl: 'Muchomor cytrynowy',
    nameEn: 'False death cap',
    nameLatin: 'Amanita citrina',
    commonNicknames: ['Muchomor cytrynowy'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [8, 9, 10, 11],
    habitat: 'Lasy iglaste i liściaste, często na kwaśnej glebie, pod sosną, świerkiem i bukiem.',
    capDescription: 'Średnica 4–10 cm. Blady, cytrynowożółty albo prawie biały, z płatami osłony. Brzeg gładki.',
    hymenophoreDescription: 'Blaszki białe albo blade, gęste, wolne. Nie różowieją.',
    stemDescription: 'Biały albo żółtawy, z pierścieniem. Nasada bulwiasta, z rąbkiem, nie z luźną workowatą pochwą.',
    fleshDescription: 'Biały, pod skórką żółtawy. Zapach bywa surowy, ziemniaczany.',
    tasteAndSmell: 'Zapach surowych ziemniaków. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trujący. Nie jedz. Kolor kapelusza nie rozstrzyga: muchomor sromotnikowy bywa bladozielony albo biały i jest śmiertelny.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_phalloides',
        confusedWithName: 'Muchomor sromotnikowy (zielonawy)',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Kolor kapelusza nie rozstrzyga. Sromotnikowy bywa bladozielony albo biały, nie tylko oliwkowy',
          'Rozstrzyga nasada: sromotnikowy ma bulwę w luźnej, workowatej pochwie. Cytrynowy ma bulwę z rąbkiem',
          'Białe blaszki i pierścień mają oba. W razie wątpliwości nie zbieraj'
        ],
        fatal: true
      }
    ],
    warningNotes: 'NIE JEDZ. Trujący. Muchomor sromotnikowy jest śmiertelnym sobowtórem. Rozstrzyga pochwa i bulwa, nie kolor kapelusza. Brak zdjęcia.'
  },
  {
    id: 'cortinarius_orellanus',
    namePl: 'Zasłonak rudy',
    nameEn: 'Fool’s webcap',
    nameLatin: 'Cortinarius orellanus',
    commonNicknames: [],
    family: 'Zasłonakowate (Cortinariaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [8, 9, 10, 11],
    habitat: 'Lasy liściaste, mieszane i bory sosnowe, pod dębem, bukiem i sosną. VIII–XI.',
    capDescription: 'Średnica 3–8 cm. Rudopomarańczowy, suchy, filcowaty. Brzeg nie jest prążkowany.',
    hymenophoreDescription: 'Blaszki rdzawe, dość rzadkie. U młodych owocników zasnówka pajęczynowata, nie pierścień.',
    stemDescription: 'Żółtawy do rdzawego, włóknisty, bez pierścienia i bez pochwy. Nasada zwężona.',
    fleshDescription: 'Żółtawy. Zawiera orellaninę. Objawy mogą przyjść po kilku dniach albo tygodniach.',
    tasteAndSmell: 'Zapach bywa rzodkiewkowy. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący. Uszkodzenie nerek. Objawy późne; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii.',
    confusionRisks: [
      {
        confusedWithId: 'cortinarius_rubellus',
        confusedWithName: 'Zasłonak rudawy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Rudawy (spiczasty) ma stożkowaty kapelusz i rośnie w borach świerkowych',
          'Rudy ma bardziej rozpostarty, filcowaty kapelusz i rośnie też pod sosną oraz w lesie mieszanym',
          'Oba są śmiertelnie trujące. Zasnówka pajęczynowata to powód, żeby owocnik zostawić'
        ],
        fatal: true
      },
      {
        confusedWithId: 'cantharellus_cibarius',
        confusedWithName: 'Pieprznik jadalny (Kurka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kurka ma grube, zbiegające listewki, nie rdzawe blaszki i nie pajęczynowatą zasnówkę',
          'Zasłonak rudy ma suche, filcowate, rudopomarańczowe owocniki i blaszki, nie żółte fałdy',
          'Pomarańczowy kolor nie rozstrzyga. Zasnówka albo rdzawe blaszki: owocnik zostaw'
        ],
        fatal: false
      },
      {
        confusedWithId: 'craterellus_tubaeformis',
        confusedWithName: 'Pieprznik trąbkowy',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
        keyDifferences: [
          'Pieprznik trąbkowy ma zbiegające listewki i lejkowaty, cieńszy owocnik',
          'Zasłonak ma rdzawe blaszki i u młodych owocników pajęczynowatą zasnówkę',
          'Pieprznik trąbkowy nie ma karty w tym atlasie. Brak karty nie oznacza, że grzyb jest jadalny'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Śmiertelnie trujący. Orellanina. Objawy bywają po wielu dniach. Brak zdjęcia.'
  },
  {
    id: 'cortinarius_rubellus',
    namePl: 'Zasłonak rudawy',
    nameEn: 'Deadly webcap',
    nameLatin: 'Cortinarius rubellus',
    commonNicknames: ['Zasłonak spiczasty'],
    family: 'Zasłonakowate (Cortinariaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [8, 9, 10],
    habitat: 'Wilgotne bory świerkowe, w mchu.',
    capDescription: 'Średnica 3–8 cm. Pomarańczowordzawy, stożkowaty albo z garbkiem, suchy.',
    hymenophoreDescription: 'Blaszki rdzawe. Młode owocniki łączy z trzonem żółtawa zasnówka, nie pierścień.',
    stemDescription: 'Żółtopomarańczowy, z jaśniejszymi włókienkami, bez pierścienia i bez pochwy.',
    fleshDescription: 'Żółtawy. Zawiera orellaninę. Uszkodzenie nerek może ujawnić się po tygodniach.',
    tasteAndSmell: 'Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Śmiertelnie trujący. Objawy późne; nie czekaj na objawy, dzwoń 112 lub do ośrodka toksykologii.',
    confusionRisks: [
      {
        confusedWithId: 'cortinarius_orellanus',
        confusedWithName: 'Zasłonak rudy',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Rudy rośnie też pod sosną i w lesie mieszanym i ma bardziej filcowaty kapelusz',
          'Rudawy (spiczasty) rośnie w borze świerkowym i ma stożkowaty kapelusz',
          'Oba są śmiertelnie trujące. Siedlisko ich nie rozdziela na tyle, żeby któryś zebrać'
        ],
        fatal: true
      },
      {
        confusedWithId: 'cantharellus_cibarius',
        confusedWithName: 'Pieprznik jadalny (Kurka)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kurka ma grube, zbiegające listewki, nie rdzawe blaszki i nie pajęczynowatą zasnówkę',
          'Zasłonak rudawy ma stożkowaty kapelusz i rdzawe blaszki',
          'Pomarańczowy kolor nie rozstrzyga. Zasnówka albo rdzawe blaszki: owocnik zostaw'
        ],
        fatal: false
      },
      {
        confusedWithId: 'craterellus_tubaeformis',
        confusedWithName: 'Pieprznik trąbkowy',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
        keyDifferences: [
          'Pieprznik trąbkowy ma zbiegające listewki i lejkowaty, cieńszy owocnik',
          'Zasłonak ma rdzawe blaszki i u młodych owocników pajęczynowatą zasnówkę',
          'Pieprznik trąbkowy nie ma karty w tym atlasie. Brak karty nie oznacza, że grzyb jest jadalny'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Śmiertelnie trujący. Orellanina. Brak zdjęcia. Nazwy Cortinarius speciosissimus i C. orellanoides są synonimami.'
  },
  {
    id: 'amanita_excelsa',
    namePl: 'Muchomor twardawy',
    nameLatin: 'Amanita excelsa (syn. Amanita spissa)',
    commonNicknames: ['Bedłka silna'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'INEDIBLE',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Lasy iglaste i mieszane, rzadziej liściaste. Owocniki zwykle w grupach. Europa i Ameryka Północna; w Polsce pospolity.',
    capDescription: 'Do około 15 cm, szarobrunatny, początkowo półkulisty, potem płaski. Brzeg bez prążkowania. Na wierzchu białe łatki, które deszcz może zmyć. Klucz: szarobrunatny kapelusz z białymi łatkami i prążkowany pierścień.',
    hymenophoreDescription: 'Blaszki białe, gęste, wolne. Wysyp zarodników biały.',
    stemDescription: 'Wysoki, do około 20 cm, białawy, z dużym, zwisającym, karbowanym pierścieniem. Nasada bulwiasta, z brodawkowatymi obwódkami, bez wyraźnej pochwy.',
    fleshDescription: 'Biały, pod skórką szarawy.',
    tasteAndSmell: 'Zapach ziemisty. Smaku ta karta nie podaje.',
    culinaryValue: 'W literaturze (Zarzyński 2021) bywa opisywany jako jadalny, wraz z wyraźnym zaleceniem odstąpienia od zbioru, bo łatwo pomylić go z trującymi muchomorami, zwłaszcza plamistym. Nie figuruje w wykazie grzybów dopuszczonych do obrotu (rozporządzenie MZ z 17.05.2011, Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258). W tej karcie gatunek jest niejadalny. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_pantherina',
        confusedWithName: 'Muchomor plamisty',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Plamisty ma wyraźną, gładką, odstającą pochwę u nasady, nad nią pierścieniowate kołnierzyki, a pierścień nieprążkowany',
          'Brzeg kapelusza plamistego często bywa prążkowany, ale forma górska ma brzeg gładki. Prążkowanie nie rozstrzyga',
          'Twardawy ma karbowany pierścień i bulwę bez odstającej pochwy'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_porphyria',
        confusedWithName: 'Muchomor porfirowy',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Porfirowy ma pochwę u nasady, postrzępioną, i blaszki różnej długości',
          'Twardawy nie ma wyraźnej pochwy',
          'Muchomor porfirowy nie ma karty w tym atlasie. Brak karty nie oznacza, że grzyb jest jadalny'
        ],
        fatal: false
      },
      {
        confusedWithId: 'amanita_rubescens',
        confusedWithName: 'Muchomor czerwieniejący (Amanita rubescens)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Uszkodzone blaszki i miąższ czerwieniejącego szybko czerwienieją',
          'Twardawy nie czerwienieje',
          'Czerwienienie nie jest dowodem, że grzyb nadaje się do spożycia'
        ],
        fatal: false
      }
    ],
    warningNotes: 'W tej karcie niejadalny. Niechroniony: nie figuruje w Dz.U. 2014 poz. 1408. Drzew żywicielskich źródło nie podaje, więc karta ich nie wymienia.'
  },
  {
    id: 'calocybe_gambosa',
    namePl: 'Gęśnica wiosenna',
    nameLatin: 'Calocybe gambosa (syn. Tricholoma gambosum)',
    commonNicknames: ['Majówka wiosenna', 'Gąska majowa'],
    family: 'Kępkowcowate (Lyophyllaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [4, 5, 6, 7],
    habitat: 'Saprotrof. Skraje lasów liściastych, łąki, pastwiska, zarośla, parki i ogrody, często w kręgach. Europa, także Ameryka Północna i Japonia. W Polsce dość pospolita, liczniejsza na pogórzu.',
    capDescription: 'Do około 12 cm, mięsisty, biały do kremowego, matowy. Brzeg podwinięty. Klucz: wiosna, biały mięsisty owocnik o mącznym zapachu, często w kręgach.',
    hymenophoreDescription: 'Blaszki cienkie, gęste, białawe, z wiekiem lekko żółtawe, przy trzonie wycięte ząbkiem. Wysyp zarodników biały.',
    stemDescription: 'Biały do kremowego, pełny, bez pierścienia i bez pochwy.',
    fleshDescription: 'Biały, twardy.',
    tasteAndSmell: 'Zapach mączny. Smaku ta karta nie podaje.',
    culinaryValue: 'W literaturze (Zarzyński 2021; Bielawska 2016) opisywana jako jadalna. Nie figuruje w wykazie grzybów dopuszczonych do obrotu (rozporządzenie MZ z 17.05.2011, Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258, zał. nr 1); w wykazie jest tylko uprawiana gęśnica indyjska. Ryzyko pomyłki z wieruszką zatokowatą i strzępiakiem ceglastym, które rosną w tych samych miejscach i porze. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'entoloma_sinuatum',
        confusedWithName: 'Wieruszka zatokowata',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Starsze okazy wieruszki mają różowe do czerwonawych blaszek i różowy wysyp',
          'Młode owocniki są bardzo podobne',
          'Wieruszka zatokowata nie ma karty w tym atlasie. Brak karty nie oznacza, że grzyb jest jadalny'
        ],
        fatal: false
      },
      {
        confusedWithId: 'inocybe_erubescens',
        confusedWithName: 'Strzępiak ceglasty (Inocybe erubescens)',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Strzępiak ma kapelusz stożkowaty i włóknisty. Miąższ oraz owocnik czerwienieją przy uszkodzeniu',
          'Gęśnica nie czerwienieje i pachnie mącznie',
          'Oba wyrastają w tej samej porze. Strzępiak ceglasty jest śmiertelnie trujący'
        ],
        fatal: true
      },
      {
        confusedWithId: 'amanita_virosa',
        confusedWithName: 'Muchomor jadowity',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Białe muchomory mają pierścień i bulwę w pochwie. Gęśnica nie ma ani pierścienia, ani pochwy',
          'Muchomor jadowity ma białe blaszki i pochwę u nasady',
          'Muchomor wiosenny (Amanita verna) jest podobny i nie ma osobnej karty. Brak karty nie oznacza, że biały owocnik jest gęśnicą'
        ],
        fatal: true
      }
    ],
    warningNotes: 'Wiosenny biały owocnik o mącznym zapachu trzeba odróżnić od strzępiaka ceglastego i od białych muchomorów. Niechroniona: nie figuruje w Dz.U. 2014 poz. 1408.'
  },
  {
    id: 'suillellus_luridus',
    namePl: 'Borowik ponury',
    nameLatin: 'Suillellus luridus (syn. Boletus luridus)',
    commonNicknames: ['Goryczak (nazwa ludowa)'],
    family: 'Borowikowate (Boletaceae)',
    status: 'POISONOUS',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10],
    habitat: 'Mykoryza z dębem, bukiem i jodłą, także z lipą w parkach. Miejsca ciepłe i nasłonecznione. Europa, Ameryka Północna i Japonia. W Polsce w całym kraju, ale niezbyt pospolity.',
    capDescription: 'Do około 20 cm, płowy do brązowego z oliwkowym odcieniem, zamszowy, potem gładki. Po dotknięciu szybko ciemnieje, niemal do czarnego. Klucz: czerwonawe pory, siateczka na trzonie i silne sinienie.',
    hymenophoreDescription: 'Rurki żółtawe, pory pomarańczowe do czerwonych. Mocno sinieją. Wysyp zarodników oliwkowy.',
    stemDescription: 'Baryłkowaty, potem wydłużony, żółtawy do czerwonawego, z wyraźną brązowawą do czerwonej siateczką o podłużnych oczkach.',
    fleshDescription: 'Żółtawy, u nasady trzonu czerwonawy. Po przekrojeniu szybko sinieje.',
    tasteAndSmell: 'Zapach niewyraźny. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trujący. W źródłach są tylko ogólne dolegliwości żołądkowo-jelitowe. Nie figuruje w wykazie grzybów dopuszczonych do obrotu (rozporządzenie MZ z 17.05.2011, Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258). Nazwa ludowa „goryczak” nie oznacza goryczaka żółciowego. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'neoboletus_luridiformis',
        confusedWithName: 'Borowik ceglastopory',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Ceglastopory nie ma siateczki. Trzon pokrywają drobne czerwone łuseczki, jak kropki',
          'Ponury ma wyraźną siateczkę na trzonie',
          'Czerwone pory nie rozstrzygają gatunku'
        ],
        fatal: false
      },
      {
        confusedWithId: 'rubroboletus_satanas',
        confusedWithName: 'Borowik szatański (Rubroboletus satanas)',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Szatański ma białawy do szarego kapelusz i czerwoną siateczkę na baryłkowatym trzonie',
          'Miąższ szatańskiego sinieje słabiej',
          'Szatański jest trujący i w Polsce pod ochroną ścisłą'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Trujący. Objawy w źródle są tylko ogólne, jako dolegliwości żołądkowo-jelitowe. Poza wykazem MZ. Niechroniony: nie figuruje w Dz.U. 2014 poz. 1408. Źródła są rozbieżne (Zarzyński 2021: niejadalny; Poradnik grzybiarza: trujący); karta przyjmuje wersję ostrożniejszą.'
  },
  {
    id: 'hypholoma_capnoides',
    namePl: 'Maślanka łagodna',
    nameLatin: 'Hypholoma capnoides (syn. Psilocybe capnoides)',
    commonNicknames: ['Łysiczka łagodna'],
    family: STROPHARIACEAE,
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    habitat: 'Saprotrof na silnie rozłożonym drewnie drzew iglastych, zwłaszcza świerka. Gromadnie w kępach. Półkula północna; w Polsce pospolita. Owocniki przez cały rok, głównie latem i jesienią.',
    capDescription: 'Do około 7 cm, ciemnożółty do musztardowego, środek rdzawy. Na brzegu młodych owocników resztki białawej, pajęczynowatej osłony. Klucz: kępy na pniakach drzew iglastych, blaszki szare do fioletowobrązowych, bez zieleni.',
    hymenophoreDescription: 'Blaszki szarawe, z wiekiem fioletowobrązowe, nigdy zielonkawe. Wysyp zarodników fioletowobrązowy do czerwonobrązowego.',
    stemDescription: 'Cienki, wygięty, pusty. U góry jasny, niżej rdzawobrązowy. U młodych słaby, szybko znikający ślad pierścienia.',
    fleshDescription: 'Żółtawy, w trzonie ciemniejszy.',
    tasteAndSmell: 'Zapach przyjemny. Smaku ta karta nie podaje.',
    culinaryValue: 'W literaturze (Zarzyński 2021) opisywana jako jadalna i rzadko zbierana. Nie figuruje w wykazie grzybów dopuszczonych do obrotu (rozporządzenie MZ z 17.05.2011, Dz.U. 2011 nr 115 poz. 672; t.j. Dz.U. 2026 poz. 258). Ryzyko pomyłki z trującą maślanką wiązkową i ze śmiertelnie trującą hełmówką jadowitą. Różnice są na karcie hełmówki jadowitej. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'hypholoma_fasciculare',
        confusedWithName: 'Maślanka wiązkowa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Wiązkowa ma zielonkawożółte blaszki i siarkowożółty kapelusz',
          'Łagodna ma blaszki szare do fioletowobrązowych, bez zieleni',
          'Wiązkowa rośnie na drewnie różnych drzew'
        ],
        fatal: false
      },
      {
        confusedWithId: 'galerina_marginata',
        confusedWithName: 'Hełmówka jadowita',
        confusedWithStatus: 'DEADLY_POISONOUS',
        keyDifferences: [
          'Różnice są na karcie hełmówki jadowitej: blaszki cynamonowobrązowe, dość rzadkie, oraz wąski, często zanikający pierścień',
          'Na karcie hełmówki trzon pod pierścieniem jest włóknisty, bez odstających łuseczek',
          'Maślanka łagodna ma blaszki szare do fioletowobrązowych, nigdy zielonkawe. Hełmówka jadowita jest śmiertelnie trująca'
        ],
        fatal: true
      }
    ],
    warningNotes: 'Porównanie jest na karcie hełmówki jadowitej. Niechroniona: nie figuruje w Dz.U. 2014 poz. 1408.'
  },
  {
    id: 'rubroboletus_satanas',
    namePl: 'Borowik szatański',
    nameLatin: 'Rubroboletus satanas (syn. Boletus satanas)',
    commonNicknames: ['Szatan'],
    family: 'Borowikowate (Boletaceae)',
    status: 'POISONOUS',
    hymenophore: 'TUBES',
    months: [],
    habitat: 'Siedlisko, pora i rozmieszczenie nie są podane na tej karcie.',
    capDescription: '10–30 cm, białawy, szarawy do oliwkowoszarego, zamszowy. Klucz: biały kapelusz, czerwone pory i czerwona siatka na trzonie.',
    hymenophoreDescription: 'Rurki żółte, pory czerwone. Po ucisku sinieją. Wysyp zarodników oliwkowobrązowy.',
    stemDescription: 'Bardzo gruby, beczułkowaty, żółty u góry, w środku czerwony, pokryty czerwoną siateczką.',
    fleshDescription: 'Białawy do żółtawego. Po przekrojeniu słabo sinieje.',
    tasteAndSmell: 'Starsze okazy pachną nieprzyjemnie, padliną. Smak ani zapach nie pozwalają odróżnić grzyba trującego od jadalnego.',
    culinaryValue: 'Trujący. Ta karta podaje rozpoznawanie, sobowtóry i ochronę ścisłą. Objawów zatrucia nie opisuje. Ta karta nie uprawnia do zbioru ani spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'neoboletus_luridiformis',
        confusedWithName: 'Borowik ceglastopory (Neoboletus luridiformis)',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Ceglastopory ma ciemnobrązowy kapelusz i czerwone kropki, nie siatkę, na trzonie',
          'Miąższ ceglastoporego mocno sinieje',
          'Szatański ma białawy kapelusz i czerwoną siateczkę'
        ],
        fatal: false
      },
      {
        confusedWithId: 'boletus_edulis',
        confusedWithName: 'Prawdziwki',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Prawdziwek ma białe, potem zielonkawe rurki, bez czerwonych porów',
          'Szatański ma czerwone pory',
          'Czerwone pory wykluczają borowika szlachetnego z tej pary'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Ochrona ścisła (Dz.U. 2014 poz. 1408, zał. 1 lp. 8, jako Boletus satanas, oznaczenie (1), bez odstępstw od zakazów z § 7 pkt 1). Zbiór jest zakazany.'
  }
];

/**
 * Named on a card, with no atlas page of their own.
 * A new id must be added here with a reason, or the integrity test fails.
 * `status` is `NO_ATLAS_VERDICT` when this atlas gives no edibility, or `POISONOUS`
 * when the species is poisonous and still has no card. `note` is the user-facing caution.
 * `NO_ATLAS_VERDICT` uses `ATLAS_NO_VERDICT_NOTE`. `POISONOUS` does not.
 */
export const NOT_FOR_COLLECTION_NOTE = 'Niezalecany do zbioru';
export const ATLAS_NO_VERDICT_NOTE = 'Atlas nie wydaje werdyktu dla tego gatunku';
export const WEAKLY_POISONOUS_NOTE = 'trujący (słabo)';
export const POISONOUS_NOTE = 'trujący';

export const LOOKALIKES_WITHOUT_CARD: Readonly<
  Record<string, { status: 'NO_ATLAS_VERDICT' | 'POISONOUS'; reason: string; note: string }>
> = {
  amanita_caesarea: {
    status: 'NO_ATLAS_VERDICT',
    note: ATLAS_NO_VERDICT_NOTE,
    reason:
      'Muchomor cesarski (Amanita caesarea) is only a look-alike of the fly agaric. There is no card, so this atlas does not show an edible verdict.',
  },
  amanita_porphyria: {
    status: 'POISONOUS',
    note: WEAKLY_POISONOUS_NOTE,
    reason:
      'Muchomor porfirowy (Amanita porphyria) has no atlas card. Zarzyński 2021 (Właściwości użytkowe) calls it poisonous. Bezpieczne grzybobranie 2016, PDF page 33, calls it inedible and weakly poisonous. The note stays at that weaker wording.',
  },
  entoloma_sinuatum: {
    status: 'POISONOUS',
    note: POISONOUS_NOTE,
    reason:
      'Wieruszka zatokowata (Entoloma sinuatum) has no atlas card. training/README.md lists it among poisonous held-out taxa. assets/models/labels.json marks the taxon toxic and does not set deadly. The researcher upload marks this look-alike dangerous. The note stays at poisonous and names no syndrome.',
  },
  craterellus_tubaeformis: {
    status: 'NO_ATLAS_VERDICT',
    note: ATLAS_NO_VERDICT_NOTE,
    reason:
      'Pieprznik trąbkowy (Craterellus tubaeformis) is only the funnel-shaped twin of the deadly webcaps. There is no card, so this atlas does not show an edible verdict.',
  },
  imperator_rhodopurpureus: {
    status: 'POISONOUS',
    note: POISONOUS_NOTE,
    reason:
      'Imperator rhodopurpureus is a poisonous twin of the scarletina bolete. There is no atlas card. The look-alike row says poisonous.',
  },
  imperator_torosus: {
    status: 'POISONOUS',
    note: POISONOUS_NOTE,
    reason:
      'Imperator torosus is a poisonous twin of the scarletina bolete. There is no atlas card. The look-alike row says poisonous.',
  },
  rubroboletus_other: {
    status: 'POISONOUS',
    note: POISONOUS_NOTE,
    reason:
      'Other Rubroboletus species (R. legaliae, R. rhodoxanthus and kin) are poisonous twins of the scarletina bolete. There is no atlas card. The look-alike row says poisonous.',
  },
  psilocybe: {
    status: 'NO_ATLAS_VERDICT',
    note: ATLAS_NO_VERDICT_NOTE,
    reason:
      'Łysiczki (Psilocybe) have no atlas card. The warning is only that the funeral bell is deadly poisonous and easy to confuse with them (Stamets 1996, pp. 31–33, 144–145, 192–193). This atlas gives no edibility verdict.',
  },
};

/**
 * Red look-alike chrome.
 * True when a named twin is deadly, or when the open card itself is deadly.
 * `fatal` on each risk stays "the named look-alike is deadly".
 */
export function hasFatalLookAlikeRisk(
  species: Pick<MushroomSpecies, 'confusionRisks' | 'status'>
): boolean {
  return (
    species.status === 'DEADLY_POISONOUS' ||
    species.confusionRisks.some((risk) => risk.fatal)
  );
}

/**
 * Green "W kuchni" is only for a finished edible card.
 * Inedible, poisonous, deadly and unfinished edible cards must not use it.
 */
export function showsKitchenSection(
  species: Pick<MushroomSpecies, 'status' | 'incompleteCard'>
): boolean {
  return species.status === 'EDIBLE' && species.incompleteCard !== true;
}

export function isIncompleteSpeciesCard(speciesId: string): boolean {
  return MUSHROOMS_DATABASE.some(
    (species) => species.id === speciesId && species.incompleteCard === true
  );
}

export const MUSHROOM_IDS: ReadonlySet<string> = new Set(
  MUSHROOMS_DATABASE.map((species) => species.id)
);
