export interface SafetyRule {
  id: string;
  title: string;
  description: string;
  critical: boolean;
}

export interface ToxicologyCenter {
  city: string;
  phone: string;
  address: string;
  hours: string;
}

export const GOLDEN_RULES: SafetyRule[] = [
  {
    id: 'rule_tubes_first',
    title: 'Dla początkujących: tylko grzyby z rurkami (z "gąbką")',
    description: 'Wśród grzybów z rurkami (borowiki, podgrzybki, maślaki, koźlarze) w Europie Środkowej NIE MA gatunków śmiertelnie trujących (jedynie gorzkie lub powodujące dolegliwości żołądkowe). Najgroźniejsze truciciele mają pod kapeluszem blaszki!',
    critical: true
  },
  {
    id: 'rule_no_taste_test',
    title: 'Nigdy nie sprawdzaj grzybów "na smak"!',
    description: 'Mit o tym, że grzyby trujące są gorzkie lub piekące, jest śmiertelnie niebezpieczny. Muchomor sromotnikowy (zielonawy) ma smak łagodny i przyjemny!',
    critical: true
  },
  {
    id: 'rule_avoid_young_buttons',
    title: 'Unikaj bardzo młodych osobników ("jajeczek / pałeczek")',
    description: 'Nierozwinięte owocniki nie mają jeszcze wykształconych kluczowych cech botanicznych (pierścienia, koloru blaszek, pochwy u nasady). W tej fazie śmiertelny muchomor wygląda niemal identycznie jak pieczarka, kania czy gołąbek.',
    critical: true
  },
  {
    id: 'rule_no_plastic_bags',
    title: 'Zbieraj tylko do przewiewnych koszyków wiklinowych',
    description: 'W foliowych torebkach lub wiaderkach grzyby szybko ulegają zaparzeniu i gniciu. Białka rozkładają się, wytwarzając toksyczne związki bakteryjne (jad trupi / ptomainy), co prowadzi do ciężkich zatruć wtórnych nawet grzybami jadalnymi.',
    critical: false
  },
  {
    id: 'rule_whole_mushroom',
    title: 'Wykręcaj owocnik w całości z nasadą trzonu',
    description: 'Podstawa trzonu (obecność bulwy, pochewki lub jej brak) to kluczowa cecha pozwalająca odróżnić kanię i pieczarkę od zabójczego muchomora sromotnikowego.',
    critical: true
  }
];

export const POISON_SYNDROMES = [
  {
    id: 'amatoxin',
    name: 'Zespół sromotnikowy (amatoksyny)',
    species: 'Muchomor sromotnikowy (A. phalloides), muchomor jadowity',
    latency: '8 – 24 godziny od spożycia (groźne opóźnienie!)',
    symptoms: 'Faza 1: gwałtowne wymioty, bolesne skurcze brzucha, wodnista biegunka. Faza 2 (2. doba): pozorna poprawa samopoczucia. Faza 3 (3.-4. doba): nieodwracalne uszkodzenie wątroby i nerek, skaza krwotoczna, śpiączka wątrobowa.',
    action: 'NATYCHMIASTOWE WEZWANIE POGOTOWIA (112) lub transport na oddział toksykologii. Każda godzina opóźnienia zmniejsza szansę na ratunek (wymagany przeszczep wątroby).'
  },
  {
    id: 'muscarinic',
    name: 'Zespół muskarynowy (cholinergiczny)',
    species: 'Strzępiaki (Inocybe), lejkówki (Clitocybe)',
    latency: '15 – 30 minut od spożycia',
    symptoms: 'Obfite poty, silny ślinotok, łzawienie, zwężenie źrenic, duszność, zwolnienie akcji serca.',
    action: 'Wezwać pogotowie, odtrutką specyficzną jest atropina podawana przez lekarza.'
  },
  {
    id: 'gastric',
    name: 'Zespół gastryczny / żołądkowo-jelitowy',
    species: 'Goryczak żółciowy, mleczaj wełnianka, lisówka pomarańczowa, tęgoskóry',
    latency: '1 – 3 godziny od spożycia',
    symptoms: 'Nudności, wymioty, ból brzucha, biegunka. Zwykle mija po 1-2 dniach nawadniania.',
    action: 'Wypić dużo wody, podać węgiel aktywny, skonsultować się z lekarzem celem wykluczenia amatoksyn.'
  }
];

export const TOXICOLOGY_CENTERS: ToxicologyCenter[] = [
  {
    city: 'Warszawa',
    phone: '22 619 63 01',
    address: 'Praski Szpital Przemienienia Pańskiego, al. Solidarności 67',
    hours: 'Całodobowo 24/7'
  },
  {
    city: 'Kraków',
    phone: '12 411 99 99',
    address: 'Szpital Uniwersytecki, ul. Jakubowskiego 2',
    hours: 'Całodobowo 24/7'
  },
  {
    city: 'Gdańsk',
    phone: '58 682 04 04',
    address: 'Uniwersyteckie Centrum Medycyny Morskiej i Tropikalnej, ul. Powstania Styczniowego 9B',
    hours: 'Całodobowo 24/7'
  },
  {
    city: 'Poznań',
    phone: '61 847 69 46',
    address: 'Szpital Miejski im. F. Raszei, ul. Mickiewicza 2',
    hours: 'Całodobowo 24/7'
  },
  {
    city: 'Łódź',
    phone: '42 657 99 00',
    address: 'Instytut Medycyny Pracy, ul. św. Teresy 8',
    hours: 'Całodobowo 24/7'
  },
  {
    city: 'Wrocław',
    phone: '71 343 30 08',
    address: 'Dolnośląski Szpital Specjalistyczny im. T. Marciniaka, ul. Gen. Fieldorfa 2',
    hours: 'Całodobowo 24/7'
  }
];
