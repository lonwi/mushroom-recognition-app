export interface SafetyRule {
  id: string;
  title: string;
  description: string;
  critical: boolean;
}

export interface ToxicologyCenter {
  city: string;
  /** Polish-format numbers, first is primary. Spaces only, no parentheses. */
  phones: string[];
  address: string;
  /** Only when the source states it explicitly. */
  hours?: string;
  sourceUrl: string;
  /** ISO date when the number was checked against sourceUrl. */
  checkedAt: string;
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
    id: 'rule_whole_mushroom',
    title: 'Wyjmuj grzyby w całości, z bulwą i pochwą u nasady',
    description: 'Każdego grzyba z blaszkami (także kanię, pieczarkę i gołąbka), a także kurkę, kolczaka i każdego innego grzyba bez rurek wyjmij z ziemi w całości. Podważ go nożem głęboko przy trzonie, bo luźna pochwa muchomora często zostaje w ziemi. Bulwa i pochwa przy nasadzie odróżniają muchomora sromotnikowego, jadowitego i plamistego od kani, czubajnika i pieczarki. Takich grzybów nie ucinaj nad ziemią. Jedyny wyjątek opisuje wskazówka poniżej: pewnie rozpoznane grzyby rurkowe.',
    critical: true
  },
  {
    id: 'rule_tube_mushrooms_cut',
    title: 'Tylko grzyby rurkowe (z „gąbką”) możesz ścinać nisko nożem',
    description: 'Dotyczy to wyłącznie grzybów z rurkami pod kapeluszem, takich jak borowiki, podgrzybki, koźlarze i maślaki, i tylko gdy masz pewność gatunku. Utnij trzon jak najniżej, tuż nad ziemią, albo ostrożnie go wykręć. Leśnicy dopuszczają obie metody, byle nie rozgrzebywać ściółki. Odsłonięte miejsce przykryj ściółką lub mchem. Grzybów z blaszkami nie ścinaj, nawet dużych: kanię wyjmij z bulwą. Jeśli chcesz pokazać grzyb grzyboznawcy, wyjmij go w całości, bo do oceny przynosi się całe owocniki z trzonem.',
    critical: false
  },
  {
    id: 'rule_no_plastic_bags',
    title: 'Zbieraj tylko do przewiewnych koszyków wiklinowych',
    description: 'W foliowych torebkach lub wiaderkach grzyby szybko ulegają zaparzeniu i gniciu. Białka rozkładają się, wytwarzając toksyczne związki bakteryjne (jad trupi / ptomainy), co prowadzi do ciężkich zatruć wtórnych nawet grzybami jadalnymi.',
    critical: false
  },
  {
    id: 'rule_protect_forest_floor',
    title: 'Nie rozgrzebuj ściółki i nie niszcz grzybów, których nie zabierasz',
    description: 'Nie grab leśnej ściółki i nie przekopuj jej w poszukiwaniu owocników. Starych oraz niejadalnych grzybów nie niszcz — zostaw je w lesie. Gatunków chronionych, np. dziko rosnących smardzów, nie zbieraj ani nie niszcz. Do koszyka wkładaj wyłącznie okazy, co do których masz całkowitą pewność.',
    critical: false
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

/**
 * Builds a dialable tel: URL. Nine-digit Polish national numbers get +48 so they
 * also work from a foreign SIM; short codes such as 112 and 999 stay as they are.
 */
export function toTelUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) return `tel:+${digits}`;
  return digits.length === 9 ? `tel:+48${digits}` : `tel:${digits}`;
}

// Every number below was checked against its sourceUrl on this date.
const CHECKED_AT = '2026-10-17';
// Used only where the source states round-the-clock service explicitly.
export const HOURS_24_7 = 'Całodobowo 24/7';

export const TOXICOLOGY_CENTERS: ToxicologyCenter[] = [
  {
    city: 'Warszawa',
    phones: ['22 619 66 54'],
    address: 'Szpital Praski, Pododdział Toksykologii, al. Solidarności 67',
    sourceUrl: 'https://rprm.ezdrowie.gov.pl/',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Kraków',
    phones: ['12 411 99 99'],
    address: 'Pracownia Informacji Toksykologicznej CM UJ, Klinika Toksykologii, ul. Jakubowskiego 2',
    hours: HOURS_24_7,
    sourceUrl: 'https://oit.cm.uj.edu.pl/o-pracowni/informacje/',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Gdańsk',
    phones: ['58 682 04 04', '512 069 737'],
    address: 'Pomorskie Centrum Toksykologii, ul. Kartuska 4/6',
    sourceUrl: 'https://www.pctox.pl/new/kontakt/',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Poznań',
    phones: ['61 847 69 46'],
    address: 'Szpital Miejski im. F. Raszei, Oddział Toksykologii, ul. Mickiewicza 2',
    hours: HOURS_24_7,
    sourceUrl: 'https://raszeja.poznan.pl/service/oddzial-toksykologiczny/',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Łódź',
    phones: ['661 442 576'],
    address: 'Centralny Szpital Kliniczny UM, Pododdział Toksykologii, ul. Pomorska 251',
    hours: HOURS_24_7,
    sourceUrl: 'https://csk.umed.pl/kliniki-i-oddzialy/pododdzial-toksykologii/',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Wrocław',
    phones: ['71 306 48 41', '71 306 48 42'],
    address: 'Dolnośląski Szpital Specjalistyczny im. T. Marciniaka, ul. Gen. Fieldorfa 2',
    hours: HOURS_24_7,
    sourceUrl: 'https://www.szpital-marciniak.wroclaw.pl/p,168,oddzial-toksykologii-i-chorob-wewnetrznych',
    checkedAt: CHECKED_AT
  },
  {
    city: 'Sosnowiec',
    phones: ['32 368 21 16'],
    address: 'Wojewódzki Szpital Specjalistyczny nr 5 im. św. Barbary, Oddział Toksykologii z Ośrodkiem Ostrych Zatruć, Plac Medyków 1',
    hours: HOURS_24_7,
    sourceUrl: 'https://www.wss5.pl/content/oddzial-toksykologii-z-osrodkiem-ostrych-zatruc',
    checkedAt: CHECKED_AT
  }
];
