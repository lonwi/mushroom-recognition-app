# AGENTS.md — Grzybobranie AI

Ten plik jest dla agentów kodujących: lokalnego Hermesa i agentów Cursora. Czytaj go przed zmianą w repozytorium.

Właściciel: Wojciech (GitHub `lonwi`). Pisze po polsku. Identyfikatory w kodzie są po angielsku. Teksty dla użytkownika są po polsku w `src/core/i18n/pl.ts`. Angielski w `en.ts` ma ten sam kształt i jest wyłączony flagą. Dokumenty (`AGENTS.md`, ADR, raporty) są po polsku.

## Po co jest ta aplikacja

Grzybobranie AI pomaga oznaczać grzyby w Polsce i Europie Środkowej. Działa offline, bez konta i bez sieci. Rozpoznawanie jest na telefonie. Aplikacja podpowiada nazwę. Nie mówi, czy grzyb jest jadalny.

Faza 0 to szkielet: trzy zakładki (Atlas, Skaner, Pomoc), ustawienia w nagłówku, tokeny, magazyn ustawień, i18n, atrapa modelu i lokalny dziennik. Faza 1 dokłada kanon gatunków i niemodyfikowalną `species.db` (`pnpm build:species`). Ekrany Atlasu są dopiero w Fazie 2.

## Stos

- Expo SDK 58 (`expo` 58.0.23), React Native 0.88.1, React 19.3.1, TypeScript ~6.0.3, strict
- Expo Router 58.0.30, trasy w `src/app/`
- pnpm 12.16.1, Node 22
- NativeWind 4.2.7 na tokenach z `src/ui/tokens.ts` (spike, ADR 0001, status `proposed`)
- Zustand 5.1 i `expo-sqlite/kv-store` na ustawienia
- Tylko Android w CI i w planie wydania. iOS nie jest budowany.

Wersje bibliotek nie podbijamy w trakcie MVP, chyba że wymusi to błąd bezpieczeństwa.

## Warstwy

| Katalog        | Wolno mu                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`     | tylko trasy. Składa ekran z `screens`, `ui`, `core`, `infra`.                                                                      |
| `src/screens/` | ekrany. Woła `ui`, `core`, `infra`. Nie woła `app`.                                                                                |
| `src/ui/`      | tokeny i widoki bez IO. Nie woła `app`, `screens`, `infra`.                                                                        |
| `src/core/`    | domena: i18n, manifest, decyzja, bufor dziennika, store ustawień. Czysty TypeScript. Bez React Native, Expo, `ui`, `app`, `infra`. |
| `src/infra/`   | adaptery: kv-store, plik dziennika, arkusz udostępniania, `platform`. Nie woła `app`, `screens`, `ui`.                             |

`Platform.OS` i `Platform.select` są tylko w `src/infra/platform/`. Szczegóły: `docs/decyzje-f0.md` (Q13).

Silnik JS na telefonie to Hermes (ten z React Native). To nie jest agent Hermes. Agent Hermes czyta ten plik tak samo jak Cursor.

## Bezpieczeństwo

- Model nigdy nie orzeka o jadalności. W decyzji nie ma pola jadalności. Status przyjdzie z bazy gatunków, po identyfikatorze.
- Nie zwracaj gatunku, pewności ani opóźnienia, dopóki rzeczywisty model na urządzeniu nie przetworzy pikseli. Brak lub niekalibrowany model zwraca „rozpoznawanie niedostępne”.
- `CONDITIONALLY_EDIBLE` nie dostaje zielonego koloru jadalności i nie dostaje instrukcji obróbki. W tokenach jest to przypięte testem.
- W UI wolno pokazać tylko zdjęcia CC0 i CC BY, z atrybucją. Import z Hugging Face jest w `pnpm build:species` i odpada bez sekretu `HF_TOKEN_READONLY`.
- Obraz wygenerowany ma etykietę „ilustracja”. W bazie są metadane pilotażu. Bez pliku rycina ma status `pending` i nie jest do pokazania.
- Numery alarmowe są tylko w `src/core/safety/emergency-contacts.ts`. Pola są puste, dopóki Q19 nie wskaże źródła.
- Brak telemetrii i brak aktualizacji OTA. W `app.json` jest `updates.enabled: false`. Dziennik diagnostyczny zostaje na telefonie i wychodzi tylko przez arkusz udostępniania. Bez współrzędnych. Patrz Q14 w `docs/decyzje-f0.md`.
- Nie dodawaj `@tensorflow/tfjs` do aplikacji.

## Bramki CI

Zero wyciszeń. Nie dodawaj baseline'u knip, jscpd, ESLint ani dependency-cruiser, żeby job przeszedł.

`pnpm quality` odpala:

- `tsc --noEmit`
- ESLint 9 z `--max-warnings 0`
- Prettier
- knip
- jscpd, próg 1,5% na kodzie aplikacji (zamrożony `ml/` jest wyjęty, bo go nie przepisujemy)
- dependency-cruiser
- Jest i React Native Testing Library

Osobno: `python -m unittest discover -s ml/tests -v` oraz `pnpm build:species` (baza gatunków i bramki treści).

Eksport paczki JS Androida: `pnpm export:android`. Pełnego APK w CI nie ma. Powód jest w ADR 0001.

## Gałęzie i pull requesty

- `main` to zamrożony prototyp (tag `prototype-final`). Nie commituj na `main`.
- `rewrite/greenfield` to gałąź bazowa dla nowego kodu (odpowiednik `main` dla rewizji). **Nigdy nie commituj bezpośrednio na `rewrite/greenfield`**.
- Każde zadanie/funkcja wymaga nowej gałęzi (np. `feat/...`, `fix/...`) odchodzącej od `rewrite/greenfield`.
- Po zakończeniu implementacji i przejściu `pnpm quality`, wypchnij gałąź na zdalne repozytorium (`git push -u origin <branch>`) i otwórz Pull Request celujący w `rewrite/greenfield` (`gh pr create`).
- Przejście do kolejnego zadania następuje dopiero po zmergowaniu PR do `rewrite/greenfield` lub na wyraźną dyspozycję.
- Przełączenie na `main` jest dopiero po Fazie 2.
- Commity po angielsku, w stylu Conventional Commits.

## Gdzie leżą decyzje

- D-01…D-17: dokumenty planu poza repozytorium (KROK 3 i KROK 4). W repozytorium skrót rozstrzygnięć Fazy 0 jest w `docs/decyzje-f0.md`.
- Stylowanie: `docs/adr/0001-styling.md`
- Kontrakt modelu: `schemas/model-manifest.schema.json` (szkic v1.0.0-draft)
- Stary kontrakt 54 klas: `ml/OUTDATED.md`. Nie traktuj go jako aktualnego.
- Pomiary telefonów: `docs/spikes/F0-raport.md`
- Szablon zadania: `.github/ISSUE_TEMPLATE/zadanie.md`

## Czego nie ruszać przy okazji

- Potoku treningowego. Osobny bot go prowadzi.
- Modułu `modules/photo-decoder` poza zadaniem, które go dotyczy. Kontrakt jest w `modules/photo-decoder/README.md`, pomiar w `docs/spikes/F0-raport.md`.
- Numerów alarmowych w `emergency-contacts.ts`, dopóki nie ma zweryfikowanego źródła (Q19). Nie dopisuj numeru z pamięci.
