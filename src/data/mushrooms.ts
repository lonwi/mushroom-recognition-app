import { type MushroomSpecies } from '../types/mushroom';

export const MUSHROOMS_DATABASE: MushroomSpecies[] = [
  {
    id: 'boletus_edulis',
    namePl: 'Borowik szlachetny',
    nameLatin: 'Boletus edulis',
    commonNicknames: ['Prawdziwek', 'Borowik jadalny', 'Biały grzyb'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Najczęściej lasy iglaste pod świerkiem i sosną, także pod brzozą. Podobne borowiki spod dębu i buka ta karta nie rozdziela.',
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
    warningNotes: 'Zwracaj uwagę na barwę rurek i siateczkę na trzonie, by nie pomylić z gorzkim goryczakiem. Borowik szatański (Rubroboletus satanas) to inny gatunek i nie ma go w tym atlasie.'
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
    capDescription: 'Średnica 5-15 cm. Barwa oliwkowozielona, żółtawozielona, szarozielona, ku brzegom jaśniejsza. Powierzchnia gładka, w stanie wilgotnym lepka, rzadko z nielicznymi białymi łatkami.',
    hymenophoreDescription: 'Blaszki ZAWSZE BIAŁE (u starych okazów lekko zielonkawe), gęste, wolne, nie dochodzą do trzonu. Nigdy nie różowieją ani nie brązowieją!',
    stemDescription: 'Wysokość do około 15 cm. Smukły, walcowaty, biały, oliwkowy lub lekko zielonawy, często z mniej lub bardziej wyraźnym zygzakowatym wzorem. U dołu bulwa w wyraźnej, luźnej, białej pochwie. Pod kapeluszem duży, przyrośnięty, zwieszający się, prążkowany pierścień.',
    fleshDescription: 'Biały, pod skórką kapelusza nieco zielonkawy, niezmienny po przełamaniu.',
    tasteAndSmell: 'Młode mają zapach słaby, starsze mdły, miodowo-duszący. Smak (według relacji otrutych) łagodny, przyjemny – DLATEGO NIGDY NIE TESTUJ GRZYBÓW SMAKIEM!',
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
    namePl: 'Maślak zwyczajny',
    nameLatin: 'Suillus luteus',
    commonNicknames: ['Maślak', 'Maślarz'],
    family: 'Maślakowate (Suillaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [5, 6, 7, 8, 9, 10, 11, 12],
    habitat: 'Wyłącznie pod sosnami (mikoryza z sosną dwuigielną), na glebach piaszczystych, młodnikach.',
    capDescription: 'Średnica 4-12 cm. Ciemnobrązowy, czekoladowy. Pokryty grubą, bardzo śliską, lepką skórką, którą łatwo zdjąć palcami.',
    hymenophoreDescription: 'Rurki drobne, za młodu cytrynowożółte, zakryte białawą błoną łączącą brzeg kapelusza z trzonem, później oliwkowożółte.',
    stemDescription: 'Wysokość do około 11 cm, walcowaty. U młodych owocników rurki zakrywa biała błona, czasem z fioletowym odcieniem. Zostaje z niej pierścień, najpierw białawy, później brunatny. Nad pierścieniem trzon bywa żółty i ziarnisty.',
    fleshDescription: 'Miękki, białożółtawy, niezmienny, w kapeluszu wodnisty.',
    tasteAndSmell: 'Łagodny, kwaskowaty smak i słaby grzybowy zapach.',
    culinaryValue: 'Smaczny do duszenia, zup i marynat. Śliską skórkę warto zdjąć: jest kwaśna, a bez niej łatwiej usunąć piasek. Suszenie się nie sprawdza. U części osób, zwłaszcza przy pierwszym razie, opisywano biegunkę i wymioty.',
    confusionRisks: [],
    warningNotes: 'Podobnego maślaka ziarnistego, bez pierścienia, ta karta nie opisuje. Pusta lista sobowtórów nie jest zgodą na zbiór.'
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
        confusedWithName: 'Borowik szlachetny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Rurki goryczaka są różowe u rozwiniętych okazów (borowik ma żółtooliwkowe)',
          'Siatka na trzonie goryczaka jest ciemniejsza od tła (u borowika siatka jest biała/jaśniejsza)'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Sprawdź siatkę na trzonie i kolor rurek. W części przekazów ludowych goryczaka też nazywano „szatanem”, ale to samo słowo oznacza borowika szatańskiego (Rubroboletus satanas). Tego drugiego gatunku nie ma w atlasie i nie jest to ta karta. Nie próbuj smaku, żeby „upewnić się” co do gatunku.'
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
    tasteAndSmell: 'Bez wyraźnego zapachu, smak słodkawy.',
    culinaryValue: 'Trujący. Zawiera kwas ibotenowy i muscymol; muskaryna występuje tylko śladowo. Po spożyciu: halucynacje, pobudzenie, wymioty, silne bicie serca. W skrajnych przypadkach opisywano utratę przytomności.',
    confusionRisks: [],
    warningNotes: 'TRUJĄCY. Nie jedz i nie próbuj usuwać toksyn w domu.'
  },
  {
    id: 'lactarius_deliciosus',
    namePl: 'Mleczaj rydz',
    nameLatin: 'Lactarius deliciosus',
    commonNicknames: ['Rydz', 'Ryżyk'],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'EDIBLE',
    hymenophore: 'GILLS',
    months: [8, 9, 10, 11],
    habitat: 'Głównie pod sosnami na glebach piaszczystych, obrzeżach lasów.',
    capDescription: 'Średnica 4-12 cm. Pomarańczowo-rudy z ciemniejszymi, koncentrycznymi kręgami. Z wiekiem zieleniejący.',
    hymenophoreDescription: 'Blaszki pomarańczowożółte, gęste, lekko zbiegające na trzon. Po uszkodzeniu powoli zielenieją.',
    stemDescription: 'Wysokość 3-7 cm, cylindryczny, pomarańczowy z ciemniejszymi jamkami.',
    fleshDescription: 'Kruchy, bladopomarańczowy. Wydziela pomarańczowe mleczko, które w zetknięciu z powietrzem nie zmienia barwy. Uszkodzone blaszki mogą zielenieć. Podobne mleczaje spod świerka, jodły i modrzewia ta karta nie rozdziela.',
    tasteAndSmell: 'Przyjemny, żywiczny zapach i łagodny, lekko pikantny smak.',
    culinaryValue: 'Wybitny grzyb kulinarny: smażony na maśle, kiszony lub marynowany.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_torminosus',
        confusedWithName: 'Mleczaj wełnianka',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Wełnianka ma kapelusz z wełnisto owłosionym brzegiem',
          'Mleczko wełnianki jest BIAŁE i silnie piekące (rydz ma mleczko pomarańczowe)',
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
    warningNotes: 'Zbieraj tylko owocniki spod sosny, z pomarańczowym mleczkiem. Przy modrzewiu i przy białym mleczku to nie jest ta karta. Podobnych mleczajów atlas nie rozdziela.'
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
    tasteAndSmell: 'Grzybowy.',
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
    tasteAndSmell: 'Kwaskowaty.',
    culinaryValue: 'Śmiertelnie trujący przy wielokrotnym spożyciu. Dawniej uchodził za jadalny po obgotowaniu. Może wywołać rozpad własnych krwinek i niewydolność nerek. Obgotowanie tego nie załatwia.',
    warningNotes: 'NIGDY NIE ZBIERAJ OLSZÓWEK. Dawniej uchodził za jadalny. Zatrucie wiąże się z wielokrotnym spożyciem: może dojść do rozpadu krwinek i niewydolności nerek, także ze skutkiem śmiertelnym.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_deliciosus',
        confusedWithName: 'Mleczaj rydz',
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
    nameLatin: 'Russula virescens',
    commonNicknames: [],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'EDIBLE',
    incompleteCard: true,
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10],
    habitat: 'Lasy liściaste i mieszane, często pod dębami, bukami i brzozami. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz szarozielony, zielononiebieski lub oliwkowy, szybko pękający w kostkowate poletka. Ta skrócona karta nie opisuje innych zielonych gołąbków.',
    hymenophoreDescription: 'Blaszki jasne i kruche. Brak pierścienia.',
    stemDescription: 'Trzon bez pierścienia i bez pochwy u nasady. Brak tych osłon nie wystarcza, by wykluczyć pomyłkę, jeśli owocnik jest młody albo uszkodzony.',
    fleshDescription: 'Miąższ kruchy, łamliwy, bez włókien typowych dla muchomora.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. Ta karta nie podaje cech smakowych.',
    culinaryValue: 'W literaturze mykologicznej gatunek bywa podawany jako jadalny. Ta karta, bez zdjęcia, nie uprawnia do zbioru ani spożycia.',
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
    culinaryValue: 'W literaturze mykologicznej gatunek bywa podawany jako jadalny. Ta karta, bez zdjęcia, nie uprawnia do zbioru ani spożycia.',
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
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
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
    tasteAndSmell: 'Nie sprawdzaj smakiem. Brak wyraźnego owocowego zapachu kurki.',
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
    tasteAndSmell: 'Nie sprawdzaj smakiem. Mleczko jest opisywane jako silnie piekące.',
    culinaryValue: 'Nie jedz. W tej bazie gatunek jest trujący. Ta karta nie podaje obróbki, która miałaby go przygotować do spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'lactarius_deliciosus',
        confusedWithName: 'Mleczaj rydz',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Wełnianka ma wełnisty brzeg kapelusza i białe, piekące mleczko',
          'Rydz ma mleczko pomarańczowe i rośnie głównie pod sosnami',
          'Wełnianka rośnie pod brzozami'
        ],
        fatal: false
      }
    ],
    warningNotes: 'NIE JEDZ. Białe, piekące mleczko i wełnisty brzeg odróżniają ją od rydza. Ta karta nie podaje sposobu „odtruwania”.'
  },
  {
    id: 'morchella_esculenta',
    namePl: 'Smardz jadalny',
    nameLatin: 'Morchella esculenta',
    commonNicknames: [],
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
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
    culinaryValue: 'W literaturze ugotowane smardze bywają podawane jako jadalne. Surowe i niedogotowane są trujące. Ta karta nie uprawnia do zbioru ani spożycia.',
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
    culinaryValue: 'W literaturze młode owocniki po obróbce cieplnej bywają podawane jako jadalne i dopuszczone do obrotu. Jeść tylko po obróbce termicznej. Ta karta, bez zdjęcia, nie uprawnia do zbioru ani spożycia.',
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
    tasteAndSmell: 'Zapach rzodkiewki. Nie sprawdzaj smakiem.',
    culinaryValue: 'Silnie trujący. Zawiera kwas ibotenowy i muscymol. Zatrucie przypomina muchomora czerwonego, ale bywa cięższe: wymioty, biegunka, halucynacje, drgawki. Nie jedz.',
    confusionRisks: [
      {
        confusedWithId: 'amanita_rubescens',
        confusedWithName: 'Muchomor czerwieniejący',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
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
        confusedWithStatus: 'NO_ATLAS_VERDICT',
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
    warningNotes: 'NIE JEDZ. Silnie trujący. Łatki może zmyć deszcz, więc gładki brązowy kapelusz nadal może być tym muchomorem.'
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
    tasteAndSmell: 'Zapach bywa przyjemny albo rzodkiewkowy. Nie sprawdzaj smakiem. Śmiertelnie trujące muchomory nie smakują „jak trucizna”.',
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
    tasteAndSmell: 'Zapach fenolu, karbolu albo atramentu, najmocniejszy przy naciętej nasadzie i przy podgrzaniu. Nie sprawdzaj smakiem.',
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
    tasteAndSmell: 'Zapach bywa słodkawy, owocowy, a smak opisywany jako łagodny. Nie sprawdzaj smakiem. Łagodny smak nie oznacza bezpieczeństwa.',
    culinaryValue: 'Śmiertelnie trujący. Zawiera dużo muskaryny. Nie ma obróbki, która robi z niego grzyb do jedzenia.',
    confusionRisks: [
      {
        confusedWithId: 'calocybe_gambosa',
        confusedWithName: 'Gęśnica wiosenna (majówka)',
        confusedWithStatus: 'NO_ATLAS_VERDICT',
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
    warningNotes: 'NIE JEDZ. Śmiertelnie trujący. Młode owocniki bywają brane za gęśnicę wiosenną (majówkę) i za kurki. Brak zdjęcia. Gęśnicy wiosennej i płachetki zwyczajnej nie ma w tym atlasie.'
  }
];

/**
 * Named on a card, with no atlas page of their own.
 * A new id must be added here with a reason, or the integrity test fails.
 * `status` is `NO_ATLAS_VERDICT`, not an edibility status: there is no finished card
 * and this atlas does not call the species edible, inedible, poisonous, or deadly.
 * `note` is the user-facing caution.
 */
export const NOT_FOR_COLLECTION_NOTE = 'Niezalecany do zbioru';
export const ATLAS_NO_VERDICT_NOTE = 'Atlas nie wydaje werdyktu dla tego gatunku';

export const LOOKALIKES_WITHOUT_CARD: Readonly<
  Record<string, { status: 'NO_ATLAS_VERDICT'; reason: string; note: string }>
> = {
  calocybe_gambosa: {
    status: 'NO_ATLAS_VERDICT',
    note: ATLAS_NO_VERDICT_NOTE,
    reason:
      'Gęśnica wiosenna (majówka) is only the spring twin of the deadly fibrecap. Literature may still call it edible. There is no finished card, so this atlas does not show an edible verdict.',
  },
  amanita_rubescens: {
    status: 'NO_ATLAS_VERDICT',
    note: ATLAS_NO_VERDICT_NOTE,
    reason:
      'Muchomor czerwieniejący is a model class without an atlas card. Literature calls it edible only after cooking. This row does not show that verdict.',
  },
  amanita_excelsa: {
    status: 'NO_ATLAS_VERDICT',
    note: NOT_FOR_COLLECTION_NOTE,
    reason:
      'Muchomor twardawy (Amanita excelsa, syn. A. spissa) has no card. Authors disagree, and it is too close to the panther cap to present as edible.',
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
