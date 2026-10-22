# Cechy atlasu (2026-10-22)

Plik aplikacji: `src/data/atlasFilterFacts.json`.
Pochodzenie każdej wartości: `data/sources/atlas_cechy_20261022.json` (`source`, `checkedAt`, `status`, adresy `https` albo brak adresu przy lokalnym PDF).

Do faktów weszło **613** rekordów ze statusem `zweryfikowane` albo `wniosek_z_klucza`. **47** rekordów `do_weryfikacji` ma w pochodzeniu `value: null` i nie wchodzi do aplikacji. Nowe pole zostaje wtedy nieobecne. Przy `ring`, `volva` i `sporePrint` zostaje dotychczasowe `null`, żeby panel „Do weryfikacji” działał jak dotąd.

Status w pliku pochodzenia jest już po decyzji właściciela:

| status źródła | status w repo | czy wchodzi do aplikacji |
|---|---|---|
| `ok` | `zweryfikowane` | tak |
| `istniejace` | `zweryfikowane` | tak, bez zmiany wartości już obecnej |
| `pominiete` | `zweryfikowane` | tak, jako `nie_podaje_sie` |
| `wniosek_z_klucza` | `wniosek_z_klucza` | tak |
| `do_weryfikacji` | `do_weryfikacji` | nie |

Smak `POISONOUS` i `DEADLY_POISONOUS` to token `nie_podaje_sie` (źródłowo `not_given`). To nie jest opis smaku i nie wolno go pokazywać. Sprzeczny albo brakujący smak gatunku nietrującego zostaje polem nieobecnym.

## Konwencja tokenów

W `atlasFilterFacts.json` wartości kategoryczne są polskim ASCII bez ogonków (`blaszki`, `pochwa`, `bialy`, `oliwkowobrazowy`). Nowe wartości są w tym samym stylu. Nie mieszamy ich z angielskim snake_case z pliku źródłowego.

Klucze pól są po angielsku w camelCase, jak istniejące `sporePrint` i `psychoactive`.

Etykiety widoczne dla człowieka są tylko w `src/i18n` (`atlas.features`), po polsku i po angielsku.

| pole źródłowe | pole w aplikacji |
|---|---|
| `cap_shape` | `capShape` |
| `cap_color` | `capColor` |
| `cap_size_cm` | `capSizeCm` (`{min, max}` w cm, `null` gdy brak granicy) |
| `stem_shape` | `stemShape` |
| `stem_color` | `stemColor` |
| `stem_features` | `stemFeatures` |
| `smell` | `smell` |
| `taste` | `taste` |
| `flesh_discoloration` | `fleshDiscoloration` |
| `latex` | `latex` |
| `host_trees` | `hostTrees` |
| `substrate` | `substrate` |
| `ring` | `ring` |
| `volva` | `volva` |
| `sporePrint` | `sporePrint` |

`host_trees`, `volva` i `sporePrint` już były polskim ASCII i nie zmieniają tokenu. `ring` zostaje booleanem. Pusta tablica przy `hostTrees` oznacza saprotrofa bez drzewa. Pusta tablica przy `stemFeatures` oznacza brak cech dodatkowych. Obie są danymi, nie luką.

## Mapa wartości

### Kształt kapelusza

| źródło | token |
|---|---|
| globose | kulisty |
| hemispherical | polkulisty |
| convex | wypukly |
| flat | plaski |
| depressed | wklesly |
| funnel | lejkowaty |
| bell | dzwonkowaty |
| conical | stozkowaty |
| ovoid | jajowaty |
| umbonate | z_garbkiem |
| irregular | nieregularny |
| brain_like | mozgowaty |
| honeycomb | komorkowaty |

### Kolor kapelusza i trzonu

| źródło | token |
|---|---|
| white | bialy |
| cream | kremowy |
| yellow | zolty |
| orange | pomaranczowy |
| red | czerwony |
| pink | rozowy |
| brown | brazowy |
| olive | oliwkowy |
| green | zielony |
| grey | szary |

### Kształt trzonu

| źródło | token |
|---|---|
| cylindrical | walcowaty |
| club | maczugowaty |
| bulbous | bulwiasty |
| barrel | beczkowaty |
| tapering_up | zweza_w_gore |
| tapering_down | zweza_w_dol |

### Cechy trzonu

| źródło | token |
|---|---|
| reticulum | siateczka |
| scabers | luseczki |
| zigzag | zygzaki |
| snakeskin | wzor_weza |
| red_dots | czerwone_punkty |
| cortina_fibres | wlokna_zasnowki |
| scrobiculate | dolkowany |
| granules | gruczolki |
| furrowed | bruzdowany |
| hollow | pusty |
| scaly | luskowaty |
| fibrous_streaks | wlokniste_smugi |
| clustered | zrosniete |

### Zapach

| źródło | token |
|---|---|
| indistinct | niewyrazny |
| pleasant | przyjemny |
| mushroomy | grzybowy |
| fruity | owocowy |
| radish | rzodkiewkowy |
| mealy | maczny |
| phenol_ink | fenolowy |
| sickly_sweet | mdlo_slodki |
| unpleasant | nieprzyjemny |
| turpentine | terpentynowy |
| raw_potato | surowe_ziemniaki |
| earthy | ziemisty |
| spicy | korzenny |
| needles | igliwie |

### Smak

| źródło | token |
|---|---|
| indistinct | niewyrazny |
| mild | lagodny |
| bitter | gorzki |
| slightly_bitter | lekko_gorzki |
| mealy | maczny |
| not_given | nie_podaje_sie |

### Przebarwienie miąższu

| źródło | token |
|---|---|
| none | brak |
| blue | sinieje |
| slow_blue | slabo_sinieje |
| red_pink | czerwienieje |
| yellow | zolknie |
| green | zielenieje |
| darkening | ciemnieje |
| brown | brazowieje |

### Mleczko

| źródło | token |
|---|---|
| none | brak |
| white | bialy |
| orange | pomaranczowy |

### Podłoże

| źródło | token |
|---|---|
| soil | gleba |
| litter | sciolka |
| dead_wood | martwe_drewno |
| living_tree | zywe_drzewo |

### Drzewa

Tokeny bez zmiany: `brzoza`, `buk`, `dab`, `grab`, `jesion`, `jodla`, `leszczyna`, `lipa`, `modrzew`, `olcha`, `sosna`, `swierk`, `topola`, `wiaz`, `wierzba`.
