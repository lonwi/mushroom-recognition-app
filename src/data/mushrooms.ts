import { MushroomSpecies } from '../types/mushroom';

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
    habitat: 'Lasy iglaste (świerk, sosna) oraz liściaste (dąb, buk). Gleby piaszczyste i próchnicze.',
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
    warningNotes: 'Zwracaj uwagę na barwę rurek i siateczkę na trzonie, by nie pomylić z gorzkim goryczakiem.'
  },
  {
    id: 'amanita_phalloides',
    namePl: 'Muchomor sromotnikowy (zielonawy)',
    nameLatin: 'Amanita phalloides',
    commonNicknames: ['Muchomor zielonawy', 'Sromotnik'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'DEADLY_POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10, 11],
    habitat: 'Głównie lasy liściaste (pod dębami, bukami), rzadziej iglaste. Lubi ciepłe stanowiska.',
    capDescription: 'Średnica 5-15 cm. Barwa oliwkowozielona, żółtawozielona, szarozielona, ku brzegom jaśniejsza. Powierzchnia gładka, w stanie wilgotnym lepka, rzadko z nielicznymi białymi łatkami.',
    hymenophoreDescription: 'Blaszki ZAWSZE BIAŁE (u starych okazów lekko zielonkawe), gęste, wolne, nie dochodzą do trzonu. Nigdy nie różowieją ani nie brązowieją!',
    stemDescription: 'Wysokość 8-15 cm. Smukły, walcowaty, ku dołowi rozszerzony w bulwę otoczoną WYRAŹNĄ, luźną, odstającą białawą POCHWĄ. W górnej części wisi białawy, prążkowany pierścień.',
    fleshDescription: 'Biały, pod skórką kapelusza nieco zielonkawy, niezmienny po przełamaniu.',
    tasteAndSmell: 'Młode mają zapach słaby, starsze mdły, miodowo-duszący. Smak (według relacji otrutych) łagodny, przyjemny – DLATEGO NIGDY NIE TESTUJ GRZYBÓW SMAKIEM!',
    culinaryValue: 'ŚMIERTELNA TRUCIZNA. Jeden średni okaz zawiera dawkę amatoksyn wystarczającą do zabicia 2-3 dorosłych osób.',
    confusionRisks: [
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Kania ma trzon z popękanym, zygzakowatym, wężowym wzorem (muchomor ma gładki lub w marmurkowy odcień)',
          'Kania ma pierścień wolny, który da się bez trudu przesuwać w górę i w dół wzdłuż trzonu (pierścień muchomora jest przyrośnięty/wiszący)',
          'Kania NIE MA pochwy u nasady – ma tylko bulwę zrośniętą z glebą (muchomor ma wyraźną luźną kielichowatą pochwę w ziemi)'
        ],
        fatal: true
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
        fatal: true
      },
      {
        confusedWithId: 'agaricus_campestris',
        confusedWithName: 'Pieczarka polna',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Pieczarka polna ma blaszki różowe, a z wiekiem ciemnobrązowe lub czekoladowe (muchomor ma zawsze czysto BIAŁE blaszki)',
          'Pieczarka nie posiada pochwy u dołu trzonu'
        ],
        fatal: true
      }
    ],
    warningNotes: 'ZABÓJCA NR 1 W EUROPIE! Objawy zatrucia (nieodwracalna martwica wątroby) występują z opóźnieniem 8-24 godzin od spożycia, kiedy toksyny zdążyły już zniszczyć komórki wątrobowe.'
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
          'Zawsze sprawdź pierścień: pierścień kani MUSI być ruchomy (daje się przesuwać w palcach)',
          'Trzon kani jest pręgowany zygzakowato (skóra węża), u muchomora gładki lub marmurkowaty',
          'Kania nie ma kielichowatej pochwy u nasady bulwy'
        ],
        fatal: true
      },
      {
        confusedWithId: 'chlorophyllum_rhacodes',
        confusedWithName: 'Czubajnik czerwieniejący',
        confusedWithStatus: 'INEDIBLE',
        keyDifferences: [
          'Czubajnik po uszkodzeniu/przełamaniu natychmiast mocno czerwienieje lub pomarańczowieje',
          'Mniej smaczny, u osób wrażliwych może powodować dolegliwości żołądkowe'
        ],
        fatal: false
      }
    ],
    warningNotes: 'Początkujący grzybiarze nie powinni zbierać młodych, nierozwiniętych kani w kształcie "pałeczek", gdyż wtedy najłatwiej pomylić je ze śmiertelnymi muchomorami.'
  },
  {
    id: 'cantharellus_cibarius',
    namePl: 'Pieprznik jadalny (Kurka)',
    nameLatin: 'Cantharellus cibarius',
    commonNicknames: ['Kurka', 'Lisica', 'Pieprzyk'],
    family: 'Pieprznikowate (Cantharellaceae)',
    status: 'EDIBLE',
    hymenophore: 'FOLDS',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Lasy iglaste i mieszane, pod sosnami, świerkami, dębami i bukami, często w mchu i borówczyskach.',
    capDescription: 'Średnica 2-10 cm. Początkowo wypukły, potem pępkowaty do lejkowatego z pofalowanym, nieregularnym brzegiem. Barwa od jasnożółtej do żółtopomarańczowej (jajeczna).',
    hymenophoreDescription: 'UWAGA: To NIE są blaszki, lecz fałdy/listewki (żyłki) zbiegające głęboko po trzonie, rozwidlone i połączone anastomozami.',
    stemDescription: 'Wysokość 3-7 cm, zwężający się ku dołowi, płynnie przechodzący w kapelusz, pełny, barwy kapelusza.',
    fleshDescription: 'Biały do bladożółtego, twardy, mięsisty, rzadko bywa robaczywy (zawiera hitinazę niszczącą pasożyty).',
    tasteAndSmell: 'Owocowy aromat przypominający morele, smak lekko pikantny, pieprzny.',
    culinaryValue: 'Klasyk polskiej kuchni: jajecznica z kurkami, sosy śmietanowe, zupy kurkowe, marynowanie.',
    confusionRisks: [
      {
        confusedWithId: 'hygrophoropsis_aurantiaca',
        confusedWithName: 'Lisówka pomarańczowa',
        confusedWithStatus: 'POISONOUS',
        keyDifferences: [
          'Lisówka ma gęste, cienkie, wiotkie PRAWDZIWE BLASZKI (kurka ma grube, zbiegające fałdy/listewki)',
          'Lisówka ma barwę jaskrawo pomarańczową, prawie miedzianą (kurka jest żółta/jajeczna)',
          'Miąższ lisówki jest cienki, wiotki i bez wyraźnego owocowego zapachu',
          'Spożycie lisówki powoduje zaburzenia trawienne'
        ],
        fatal: false
      }
    ]
  },
  {
    id: 'imleria_badia',
    namePl: 'Podgrzybek brunatny',
    nameLatin: 'Imleria badia',
    commonNicknames: ['Podgrzybek', 'Czarny łepek', 'Borowik brunatny'],
    family: 'Borowikowate (Boletaceae)',
    status: 'EDIBLE',
    hymenophore: 'TUBES',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Głównie lasy iglaste (pod sosnami i świerkami), w mchu, rzadziej pod dębami.',
    capDescription: 'Średnica 4-15 cm. Barwa ciemnobrązowa, kasztanowa do czekoladowej. Za młodu półkulisty z podwiniętym brzegiem, później poduszkowaty. W czasie deszczu śliski.',
    hymenophoreDescription: 'Rurki jasnożółte do oliwkowożółtych. CHARAKTERYSTYCZNA CECHA: po uciśnięciu lub nacięciu natychmiast SINIEJĄ (stają się niebiesko-zielone).',
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
    months: [5, 6, 7, 8, 9, 10, 11],
    habitat: 'Wyłącznie pod sosnami (mikoryza z sosną dwuigielną), na glebach piaszczystych, młodnikach.',
    capDescription: 'Średnica 4-12 cm. Ciemnobrązowy, czekoladowy. Pokryty grubą, bardzo śliską, lepką skórką, którą łatwo zdjąć palcami.',
    hymenophoreDescription: 'Rurki drobne, za młodu cytrynowożółte, zakryte białawą błoną łączącą brzeg kapelusza z trzonem, później oliwkowożółte.',
    stemDescription: 'Wysokość 4-10 cm, z wyraźnym, fioletowobiałym pierścieniem (pozostałością osłony). Powyżej pierścienia białawy, poniżej brązowawy.',
    fleshDescription: 'Miękki, białożółtawy, niezmienny, w kapeluszu wodnisty.',
    tasteAndSmell: 'Łagodny, kwaskowaty smak i słaby grzybowy zapach.',
    culinaryValue: 'Bardzo smaczny do zup, sosów i marynat. Zawsze należy zdjąć śliską skórkę z kapelusza, gdyż może działać przeczyszczająco.',
    confusionRisks: []
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
    fleshDescription: 'Biały, miękki w kapeluszu, twardy i włóknisty w trzonie. Po przekrojeniu NIE zmienia barwy (nie czernieje jak u koźlarza czerwonego).',
    tasteAndSmell: 'Łagodny, przyjemny grzybowy zapach.',
    culinaryValue: 'Dobry grzyb jadalny. Młode kapelusze świetne do marynowania i sosów.',
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
    culinaryValue: 'Niejadalny z powodu wstrętnej goryczy. Nie jest silnie toksyczny, ale może powodować lekkie podrażnienie żołądka.',
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
    warningNotes: 'Często mylony z prawdziwkiem przez niedoświadczonych zbieraczy. Zawsze sprawdź siatkę na trzonie i kolor rurek. Potoczna nazwa „szatan” jest błędna: borowik szatański (Rubroboletus satanas) to inny gatunek i nie ma go w tym atlasie.'
  },
  {
    id: 'amanita_muscaria',
    namePl: 'Muchomor czerwony',
    nameLatin: 'Amanita muscaria',
    commonNicknames: ['Muchomór', 'Bedłka muchomor'],
    family: 'Muchomorowate (Amanitaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [6, 7, 8, 9, 10, 11],
    habitat: 'Lasy iglaste i liściaste, najczęściej pod brzozami i świerkami.',
    capDescription: 'Średnica 8-20 cm. Jaskrawoczerwony, szkarłatny, pokryty licznymi białymi lub żółtawymi łatkami (pozostałości osłony).',
    hymenophoreDescription: 'Blaszki czysto białe, gęste, wolne.',
    stemDescription: 'Wysokość 10-20 cm, biały, z wyraźnym wiszącym białym pierścieniem i bulwiastą podstawą otoczoną rzędami brodawek.',
    fleshDescription: 'Biały, pod skórką kapelusza żółtopomarańczowy.',
    tasteAndSmell: 'Bez wyraźnego zapachu, smak słodkawy.',
    culinaryValue: 'TRUJĄCY. Zawiera kwas ibotenowy i muscymol. Wywołuje zespół psychotropowo-cholinergiczny (omamy, drgawki, zaburzenia równowagi, wymioty).',
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
    fleshDescription: 'Kruchy, pomarańczowy. WYDZIELA MARCHEWKOWO-POMARAŃCZOWE MLECZKO, które po kilkunastu minutach zielenieje!',
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
      }
    ]
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
    fleshDescription: 'Cienki, woskowaty, komorowaty w środku.',
    tasteAndSmell: 'Grzybowy.',
    culinaryValue: 'ŚMIERTELNIE TRUJĄCY. Zawiera gyromitrynę (toksyna lotna i rakotwórcza, niszczy wątrobę i nerki).',
    confusionRisks: [
      {
        confusedWithId: 'morchella_esculenta',
        confusedWithName: 'Smardz jadalny',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Smardz ma główkę żebrowato-plastrowatą (jak plaster miodu), piestrzenica pofałdowaną mózgowato',
          'Smardz jest wewnątrz całkowicie pusty i tworzy jedną jednolitą komorę'
        ],
        fatal: true
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
    culinaryValue: 'ŚMIERTELNIE TRUJĄCY (kumulatywnie). Dawniej uważany za jadalny po obgotowaniu. Wywołuje autoimmunohemolizę (organizm wytwarza przeciwciała niszczące własne czerwone krwinki po wielokrotnym spożyciu).',
    confusionRisks: [],
    warningNotes: 'NIGDY NIE ZBIERAJ OLSZÓWEK! Skutki zatrucia mogą ujawnić się po latach nagłą niewydolnością nerek.'
  },
  {
    id: 'russula_virescens',
    namePl: 'Gołąbek zielonawy',
    nameLatin: 'Russula virescens',
    commonNicknames: [],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'EDIBLE',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Lasy liściaste, często pod dębami i bukami. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz zielonawy, pękający w poletka. Ta skrócona karta nie opisuje innych zielonych gołąbków.',
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
    hymenophore: 'GILLS',
    months: [5, 6, 7, 8, 9, 10],
    habitat: 'Łąki, pastwiska i trawniki. Nie jest typowym grzybem cienistego lasu. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz jasny, białawy. Ta karta nie opisuje pieczarek silnie żółknących.',
    hymenophoreDescription: 'Blaszki dojrzałych owocników różowe, potem ciemnobrązowe. Białe blaszki nie pasują do dojrzałej pieczarki polnej.',
    stemDescription: 'Krótki trzon z pierścieniem. Brak pochwy u nasady.',
    fleshDescription: 'Miąższ jasny. Silne żółknięcie i zapach karbolu wskazują na inne pieczarki, których ta karta nie opisuje.',
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
    status: 'INEDIBLE',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Lasy, parki i ogrody. Pora występowania jest orientacyjna. Podobnych czerwieniejących czubajników ta karta nie rozdziela.',
    capDescription: 'Duży kapelusz z odstającymi, brązowawymi łuskami. Młode owocniki są zamknięte.',
    hymenophoreDescription: 'Blaszki jasne, wolne.',
    stemDescription: 'Trzon z pierścieniem i zgrubiałą nasadą. Ta karta nie rozstrzyga, czy pierścień jest ruchomy.',
    fleshDescription: 'Po uszkodzeniu miąższ czerwienieje lub pomarańczowieje. To nie jest dowód bezpieczeństwa.',
    tasteAndSmell: 'Nie sprawdzaj smakiem.',
    culinaryValue: 'Ta baza oznacza gatunek jako niejadalny. Część atlasów podaje go jako jadalny po obróbce i jednocześnie ostrzega o dolegliwościach żołądkowych. Ta karta nie podaje sposobu przyrządzania i nie zaleca spożycia.',
    confusionRisks: [
      {
        confusedWithId: 'macrolepiota_procera',
        confusedWithName: 'Czubajka kania',
        confusedWithStatus: 'EDIBLE',
        keyDifferences: [
          'Czubajnik czerwieniejący po uszkodzeniu czerwienieje lub pomarańczowieje',
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
    months: [8, 9, 10, 11],
    habitat: 'Lasy iglaste, często na ściółce i martwym drewnie. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz jaskrawo pomarańczowy, często lejkowaty, o cienkim miąższu.',
    hymenophoreDescription: 'Prawdziwe blaszki: cienkie, gęste, wiotkie, często rozwidlone. To nie są grube listewki kurki.',
    stemDescription: 'Trzon w barwie kapelusza, zwykle smukły.',
    fleshDescription: 'Miąższ cienki, wiotki, bez morelowego zapachu kurki.',
    tasteAndSmell: 'Nie sprawdzaj smakiem. Brak wyraźnego owocowego zapachu kurki.',
    culinaryValue: 'Nie jedz. W tej bazie gatunek jest trujący i po spożyciu może powodować zaburzenia trawienne.',
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
    warningNotes: 'NIE JEDZ. To nie jest kurka. W tej bazie lisówka jest trująca (dolegliwości żołądkowo-jelitowe).'
  },
  {
    id: 'lactarius_torminosus',
    namePl: 'Mleczaj wełnianka',
    nameLatin: 'Lactarius torminosus',
    commonNicknames: ['Wełnianka'],
    family: 'Gołąbkowate (Russulaceae)',
    status: 'POISONOUS',
    hymenophore: 'GILLS',
    months: [7, 8, 9, 10],
    habitat: 'Pod brzozami. Pora występowania jest orientacyjna.',
    capDescription: 'Kapelusz różowawy, z wełnisto owłosionym brzegiem.',
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
    hymenophore: 'OTHER',
    months: [4, 5],
    habitat: 'Wiosną, w lasach i zadrzewieniach liściastych oraz w sadach. Sam termin nie rozstrzyga gatunku. Siedlisko bywa różne u smardzów.',
    capDescription: 'Główka żebrowato-plasterkowata, jak plaster miodu, a nie pofałdowana mózgowato.',
    hymenophoreDescription: 'Warstwa rodzajna na żeberkowanej powierzchni główki.',
    stemDescription: 'Trzon jasny, połączony z główką. Cały owocnik jest w środku pusty i tworzy jedną komorę.',
    fleshDescription: 'Cienki, woskowaty. Wnętrze puste, nie komorowate jak u piestrzenicy.',
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
    warningNotes: 'NIE JEDZ NA PODSTAWIE TEJ KARTY. Surowe i niedogotowane smardze są trujące. Piestrzenica kasztanowata jest śmiertelnie groźnym sobowtórem. W Polsce smardze podlegają ochronie gatunkowej częściowej — ta karta nie jest zezwoleniem na zbiór. Sprawdź aktualne przepisy.'
  }
];

/** True when any recorded look-alike is flagged as a deadly confusion. Not stored separately, so it cannot drift from confusionRisks. */
export function hasFatalLookAlikeRisk(species: Pick<MushroomSpecies, 'confusionRisks'>): boolean {
  return species.confusionRisks.some((risk) => risk.fatal);
}

export const MUSHROOM_IDS: ReadonlySet<string> = new Set(
  MUSHROOMS_DATABASE.map((species) => species.id)
);
