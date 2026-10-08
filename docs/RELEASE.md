# Wydanie Grzybobranie AI

Tag `vX.Y.Z` uruchamia [`.github/workflows/release.yml`](../.github/workflows/release.yml). Najpierw job `verify` sprawdza, że commit tagu jest na `origin/main`, odpala typecheck, `pnpm test` i testy E2E, i wymaga, żeby napis tagu po `v` był równy `expo.version`. Potem job `build` (środowisko `release-build`) woła `eas build --profile production --platform all --non-interactive --json` i zapisuje id buildów Androida i iOS z tego biegu. Job `submit` czeka na środowisko `production` i wysyła te dwa id (`eas submit --id`), a nie najnowszy build w projekcie EAS.

Workflow przypina akcje do commitów i instaluje `eas-cli` **24.12.0**. Lokalnie używaj tej samej wersji: `npx eas-cli@24.12.0`.

Ten plik jest listą rzeczy, których agent nie zrobi za Ciebie. Zrób je raz, zanim wypchniesz pierwszy tag. Kolejność jest istotna: oba środowiska (`release-build` i `production`) muszą istnieć **zanim** poleci pierwszy tag. Inaczej GitHub utworzy je puste, bez sekretu i bez reguł, a pierwszy submit nie będzie na nic czekał.

Nie commituj tokenów, pliku JSON konta usługi Google ani klucza `.p8`. Token Expo idzie do sekretów tych dwóch środowisk. Klucze sklepów idą do poświadczeń EAS.

## 1. Konto Expo i `eas init`

1. Załóż konto na [https://expo.dev/signup](https://expo.dev/signup), jeśli go nie masz. Nazwa konta (albo organizacji), która ma być właścicielem projektu, będzie wartością `expo.owner`.
2. W katalogu repozytorium zainstaluj zależności (`pnpm install`) i zaloguj się:

   ```bash
   npx eas-cli@24.12.0 login
   ```

3. W `app.json` są teraz placeholdery, nie prawdziwy projekt:

   ```json
   "owner": "REPLACE_WITH_EXPO_ACCOUNT_OWNER",
   "extra": {
     "eas": {
       "projectId": "REPLACE_WITH_EAS_PROJECT_ID"
     }
   }
   ```

   `eas init` traktuje **dowolne** istniejące `extra.eas.projectId` jako projekt już podpięty i go nie nadpisze. Zanim uruchomisz init, usuń z `app.json` pola `owner` oraz cały obiekt `extra.eas` (albo całe `extra`, jeśli nie ma tam nic innego).

4. Utwórz albo podepnij projekt. Slug jest już ustawiony na `mushroom-recognition-app`:

   ```bash
   npx eas-cli@24.12.0 init
   ```

   CLI zapyta, które konto ma być właścicielem. Wybierz swoje konto (albo organizację). Potwierdź utworzenie `@twoje-konto/mushroom-recognition-app`, jeśli projektu jeszcze nie ma.

   To samo bez pytań, gdy znasz nazwę konta:

   ```bash
   npx eas-cli@24.12.0 init --account TWOJE_KONTO --force --non-interactive
   ```

   `--json` dopisuje na stdout status, `projectId`, `owner`, `slug` i adres pulpitu.

5. Po udanym init w `app.json` pojawiają się prawdziwe wartości, mniej więcej tak:

   ```json
   "owner": "twoje-konto",
   "extra": {
     "eas": {
       "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     }
   }
   ```

   `owner` to nazwa konta Expo. `projectId` to UUID projektu na EAS. UUID się nie zmienia, nawet gdy projekt przeniesiesz na inne konto. Slug zostaje `mushroom-recognition-app`.

6. Zcommituj tę zmianę `app.json` zwykłym pull requestem. Workflow wydania odpala `node scripts/assert-eas-release-config.mjs` i kończy się błędem, dopóki `owner` albo `projectId` nadal zawierają `REPLACE_WITH_` albo `projectId` nie jest UUID.

Pulpitu projektu szukaj potem pod `https://expo.dev/accounts/<owner>/projects/mushroom-recognition-app`.

## 2. Token `EXPO_TOKEN` tylko w dwóch środowiskach

Robot jest lepszy niż token osobisty: da się go unieważnić bez wylogowywania człowieka, i build nie przestaje działać, gdy ktoś odejdzie z konta. Token osobisty też zadziała. Rola **Developer** umie i budować, i wołać `eas submit`. GitHub tego nie rozdzieli. Patrz ograniczenie na końcu sekcji 3.

### Robot (konto organizacji)

1. Wejdź na konto, które jest właścicielem projektu: [https://expo.dev](https://expo.dev) → przełącznik konta.
2. Otwórz **Access tokens** w ustawieniach tego konta: `https://expo.dev/accounts/<owner>/settings/access-tokens`.
3. Utwórz robota (przycisk w rodzaju **Create robot** / **Robot users** na tej karcie). Nazwa na przykład `github-actions`. Rola: **Developer**. Ta rola może robić buildy, wydania i zarządzać poświadczeniami. **Admin** jest szerszy, niż trzeba. **Viewer** nie zbuduje aplikacji.
4. Dla tego robota utwórz access token i skopiuj go od razu. Expo pokazuje go tylko raz.

Na koncie osobistym robot bywa niedostępny. Wtedy:

1. Otwórz [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
2. Kliknij **Create token**.
3. Nazwij go, na przykład `github-actions-grzybobranie`, i skopiuj wartość.

### Sekret w GitHubie: dwa środowiska, zero sekretu repozytorium

Nie twórz sekretu repozytorium o nazwie `EXPO_TOKEN`. Sekret repozytorium widzi każdy job, który go odczyta, także job bez środowiska. Jeśli taki sekret już dodałeś po starszej wersji tej instrukcji, usuń go: **Settings → Secrets and variables → Actions → Repository secrets → EXPO_TOKEN → Delete**.

Ten sam token wklej jako sekret środowiska w `release-build` (job buildu) i drugi raz w `production` (job submitu). GitHub nie współdzieli sekretów między środowiskami. Job `verify` nie ma środowiska i tokenu nie dostaje.

Jak dodać sekret, gdy środowisko już jest (tworzenie środowisk jest w sekcji 3):

1. **Settings → Environments** → nazwa środowiska.
2. **Environment secrets → Add secret**.
3. Name: `EXPO_TOKEN`. Secret: wklejony token. **Add secret**.
4. Powtórz dla drugiego środowiska.

Workflow czyta `secrets.EXPO_TOKEN` dopiero w jobie, który ma dane środowisko, i podaje go do `expo/expo-github-action` przypiętego do commitu v9.0.0. Akcja ustawia zmienną na kolejne kroki. Nie wypisuj tokenu w logach.

Unieważnienie: ta sama strona Access tokens na Expo → usuń token, potem podmień obie kopie w GitHubie.

## 3. Dwa środowiska: `release-build` i `production`

Zrób oba **przed** pierwszym tagiem. Job `build` ma `environment: release-build`. Job `submit` ma `environment: production`. Jeśli któregoś nie ma, pierwsze uruchomienie utworzy je bez reguł. Puste `production` puszcza submit od razu.

**Required reviewers** na prywatnym repozytorium działają tylko na GitHub Enterprise. Na planach Free, Pro i Team działają tylko dla repozytoriów publicznych. Na prywatnym repo bez Enterprise bramki recenzenta nie będzie i job `submit` nie zaczeka.

### `release-build` (build, bez recenzenta)

1. Strona repozytorium → **Settings** → **Environments** → **New environment**.
2. Name: `release-build`. **Configure environment**.
3. Nie zaznaczaj **Required reviewers**. Ten job ma ruszyć sam, gdy tag przejdzie testy.
4. **Deployment branches and tags** → **Selected branches and tags** → **Add deployment branch or tag rule**.
5. **Ref type:** **Tag**. Name pattern: `v*`. **Add rule**.
6. Dodaj sekret `EXPO_TOKEN` jak w sekcji 2.

### `production` (submit, z recenzentem)

1. **New environment**. Name: `production`. **Configure environment**.
2. Zaznacz **Required reviewers**. Wpisz siebie (i ewentualnie drugą osobę). Wystarczy akceptacja jednego z maksymalnie sześciu.
3. Opcjonalnie **Prevent self-review**, jeśli tag wypycha ktoś inny. Przy jednej osobie zostaw wyłączone, inaczej nie zatwierdzisz własnego tagu.
4. Odznacz **Allow administrators to bypass configured protection rules**. Domyślnie jest włączone i administrator repozytorium omija recenzenta. **Save protection rules**.
5. **Deployment branches and tags** → **Selected branches and tags** → **Add deployment branch or tag rule** → **Ref type: Tag** → `v*` → **Add rule**.
6. Dodaj sekret `EXPO_TOKEN` jeszcze raz, w tym środowisku.

Wzorzec `v*` dotyczy tagów osobno od gałęzi. Nie puszcza zwykłego pusha do `main`.

Po buildzie GitHub zatrzyma job `submit`. Recenzent klika **Review deployments** → `production` → **Approve and deploy**. Dopiero wtedy lecą dwa `eas submit --id` dla id z tego biegu.

### Czego ta bramka nie robi

Token w roli Developer sam potrafi wywołać `eas submit` z dowolnego miejsca, które go ma. Recenzent GitHuba zatrzymuje tylko job `submit` w tym workflow. Nie odbiera tokenowi uprawnienia do wysyłki i nie rozdziela „tylko build” od „tylko submit”.

Co realnie daje podział na środowiska:

- Job `verify` i każdy inny job bez tych środowisk tokenu nie widzi.
- Sekret nie jest sekretem repozytorium, więc nie wpada do dowolnego workflow, który napisze `secrets.EXPO_TOKEN`.
- Reguła tagów `v*` blokuje użycie sekretu przez job z gałęzi albo z pull requesta.
- Job `build` token dostaje bez kliknięcia. Tag `v*` na `main`, po zielonych testach, startuje podpisany build produkcyjny. Kto zmieni workflow na `main` (przez PR, który przejdzie `check`), może w tym jobie dopisać `eas submit`. Ruleset i review kodu są tu jedyną zaporą.

Akceptacja `production` jest więc zgodą na wysyłkę w tym workflow, a nie technicznym ograniczeniem konta Expo.

## 4. Google Play: konto usługi, JSON tylko na EAS

Paczka Androida to `com.grzybobranie.ai`. W `eas.json` profil `submit.production.android` ma `applicationId` równy tej paczce, `track: internal` i `releaseStatus: draft`. Ścieżki do pliku JSON w repozytorium nie ma celowo: runner jej nie posiada, a plik nie może trafić do gita (`.gitignore` odrzuca `google-service-account.json` i `*.p8`).

1. Załóż konto Google Play Console i opłać rejestrację dewelopera.
2. W Play Console kliknij **Create app**. Nazwa paczki przy pierwszym uploadzie musi być `com.grzybobranie.ai`. Aplikacja może zostać szkicem, dopóki nie uzupełnisz karty sklepu. Ręczne wgranie pierwszego AAB nie jest potrzebne: `eas submit` sam tworzy pierwsze wydanie na ścieżce internal. Ręczny upload zostaw tylko wtedy, gdy chcesz przejść kreator Play bez EAS.
3. Utwórz klucz konta usługi według [creating a Google service account](https://github.com/expo/fyi/blob/main/creating-google-service-account.md):
   1. W Google Cloud utwórz projekt (albo użyj istniejącego) i konto usługi.
   2. Z **Service accounts** skopiuj adres e-mail konta.
   3. **Manage keys** → **Add key** → **Create new key** → **JSON**. Pobierze się plik. Zostaw go poza repozytorium.
   4. Włącz **Google Play Android Developer API** w tym projekcie Cloud (**Enable**).
   5. W Play Console: **Users and permissions** → **Invite new users**. Wklej e-mail konta usługi.
   6. Na karcie **App permissions** wybierz tę aplikację. Uprawnienia, których wymaga Expo:
      - **View app information (read-only)**
      - **Edit and delete draft apps** (sekcja Draft apps)
      - **Release to production, exclude devices, and use Play App Signing**
      - **Release apps to testing tracks**
      - **Manage testing tracks and edit tester lists**
      - **Manage store presence**
   7. Play sam dociąga część uprawnień tylko do odczytu. Nie nadawaj **Admin (all permissions)**. **Invite user**.
4. Wgraj JSON na EAS, nie do GitHuba. Jedna z dwóch dróg:
   - Pulpit projektu → **Credentials** → Android → identyfikator `com.grzybobranie.ai` → **Service Credentials** → **Add a Google Service Account Key** → **Upload new key** → wskaż pobrany JSON.
   - Albo lokalnie, zalogowany jako właściciel (nie robot):

     ```bash
     npx eas-cli@24.12.0 credentials --platform android
     ```

     Profil: **production**. Potem **Google Service Account** → **Upload a Google Service Account Key** i ścieżka do JSON.
5. Usuń lokalny JSON, gdy EAS potwierdzi zapis. Nie ustawiaj `serviceAccountKeyPath` w `eas.json`. Submit w CI bierze klucz z poświadczeń projektu na EAS.

`track: internal` to ścieżka testów wewnętrznych w Play, a nie „profil EAS o nazwie production”. Publiczną ścieżkę sklepu włączysz później, zmieniając `track` na `production` w osobnym pull requeście. `releaseStatus: draft` wgrywa paczkę bez automatycznego rolloutu. Gdy testerzy mają ją dostać, zmień to na `completed` (albo dokończ wydanie ręcznie w Play Console).

## 5. App Store Connect: klucz API na EAS

Identyfikator iOS to `com.grzybobranie.ai`. W `eas.json` są dwa pola, które musisz podmienić i zcommitować (to nie są sekrety):

- `submit.production.ios.ascAppId` — numeryczne **Apple ID** aplikacji
- `submit.production.ios.appleTeamId` — 10-znakowy Team ID

1. Na [Apple Developer](https://developer.apple.com/account) (płatne konto) zarejestruj App ID o bundle ID `com.grzybobranie.ai`, jeśli EAS nie zrobi tego przy pierwszym poświadczeniu.
2. W App Store Connect utwórz aplikację (**Apps** → **+**) z tym bundle ID. Team musi być ten sam co w `appleTeamId`.
3. Weź `ascAppId`: aplikacja → karta **App Store** → z lewej **General** → **App Information** → **General Information** → pole **Apple ID** (same cyfry). Wpisz je w `eas.json` w miejsce `REPLACE_WITH_APP_STORE_CONNECT_APPLE_ID`.
4. Weź Team ID: ta sama strona **App Information** (pole Team ID) albo [Membership](https://developer.apple.com/account) → **Team ID**. Wpisz 10 znaków w miejsce `REPLACE_WITH_APPLE_TEAM_ID`.
5. Zcommituj samo `eas.json`. Skrypt wydania odrzuca wartości z prefiksem `REPLACE_WITH_`, `ascAppId` niebędące ciągiem co najmniej 8 cyfr i Team ID spoza wzorca `[A-Z0-9]{10}`.

Klucz API (sekret) trzymaj na EAS:

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
2. Wygeneruj klucz. Rola **App Manager** wystarcza do wgrywania buildów. Pobierz plik `.p8` od razu; Apple nie pozwoli pobrać go drugi raz. Zapisz **Key ID** i **Issuer ID**.
3. Wgraj klucz na EAS, lokalnie jako właściciel:

   ```bash
   npx eas-cli@24.12.0 credentials --platform ios
   ```

   Profil: **production**. Zaloguj się do Apple, gdy CLI poprosi. Wybierz **App Store Connect: Manage your API Key**, potem **Set up your project to use an API Key for EAS Submit**, i wskaż `.p8`, Key ID oraz Issuer ID.
4. Usuń lokalny `.p8`. Nie ustawiaj `ascApiKeyPath`, `ascApiKeyId` ani `ascApiKeyIssuerId` w `eas.json` i nie wkładaj pliku do repozytorium.

`eas submit` wgrywa build do App Store Connect (TestFlight). Wypuszczenie do sklepu nadal wymaga ręcznego oddania wersji do recenzji w App Store Connect. Sam workflow tego nie klika.

## 6. Podpis raz, lokalnie

Pierwszy `eas build --non-interactive` nie przejdzie pytań o keystore Androida ani o Apple (2FA). Robot ich nie odpowie. Zanim wypchniesz tag, będąc zalogowanym jako właściciel (nie `EXPO_TOKEN` robota):

```bash
npx eas-cli@24.12.0 credentials --platform android
npx eas-cli@24.12.0 credentials --platform ios
```

Dla obu wybierz profil **production** i pozwól EAS wygenerować keystore Androida oraz certyfikat dystrybucyjny i profil provisioningowy iOS, jeśli ich jeszcze nie ma. Zostają na serwerach EAS. Kolejne buildy z GitHuba je tylko pobierają.

Profil `development` w `eas.json` zostaw w spokoju: wewnętrzne APK i build symulatora iOS. `react-native-fast-tflite` potrzebuje takiego buildu deweloperskiego, a tag `v*` go nie uruchamia.

## 7. Ruleset na `main`

Joby CI są w [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Ruleset ma wymagać pull requesta i dwóch statusów: `check` (id joba typechecku i testów) oraz `Code quality` (nazwa wyświetlana joba jakości, pole `name:`, nie id `quality`). To ustawienie jest w GitHubie, nie w YAML. Node w obu jobach bierze się z `.nvmrc` (`22`, zakres `engines.node`: `^22 || ^24`).

1. Strona repozytorium → **Settings**.
2. W lewym menu, w grupie **Code, planning, and automation**, kliknij **Rules**, a potem **Rulesets**. (Dokumentacja GitHuba nazywa ten sam węzeł od razu **Rulesets** → **Rulesets**.)
3. **New ruleset** → **New branch ruleset**.
4. **Ruleset name:** `main`.
5. **Enforcement status:** nowe rulesety startują jako **Disabled**. Kliknij ten status i ustaw **Active**. Przy **Disabled** reguły nic nie blokują.
6. **Bypass list.** Zostaw pustą, jeśli nikt nie ma omijać PR ani statusów `check` i `Code quality`.
   - **Add bypass** otwiera okno. Wyszukaj rolę (na przykład Repository admin), zespół albo aplikację, **Add Selected**.
   - Obok **Always allow** jest przełącznik. **Always allow** puszcza bezpośredni push na `main` z pominięciem PR i statusu `check`. **For pull requests only** i tak wymaga PR, ale pozwala tej osobie zmergować go bez spełnienia reguł. Do zwykłej pracy nie dodawaj siebie z **Always allow**.
7. **Target branches** → **Add a target** → **Include default branch**. Domyślną gałęzią tego repozytorium jest `main`. Jeśli kiedyś nią nie będzie, dodaj drugi cel: **Include by pattern** i wzorzec `main`.
8. W **Branch protections** zaznacz **Require a pull request before merging**. To blokuje push wprost na `main`.
   - **Required approvals:** `0`, jeśli pracujesz sam (PR nadal jest obowiązkowy, mergujesz go sam). Ustaw `1` albo więcej tylko wtedy, gdy ktoś inny naprawdę może zatwierdzić. Przy `1` i jednym maintainerze PR zostaje niezmergowalny.
9. Zaznacz **Require status checks to pass**.
   - W dodatkowym polu wpisz nazwę checka: `check`. To id joba, nie nazwa workflow (`CI`).
   - Zatwierdź dodanie (przycisk plusa obok pola). Samo wpisanie tekstu nie zapisuje wymagania.
   - Drugi check: `Code quality`. To nazwa wyświetlana joba (`name:` w workflow), nie id `quality`. Wpisz dokładnie `Code quality`, ze spacją i wielką literą, i zatwierdź plusem.
   - Jeśli lista podpowiedzi jest pusta, odpal raz workflow CI (push albo PR), wróć tutaj i wyszukaj obie nazwy. Gdy GitHub pokazuje `CI / check` albo `CI / Code quality`, to te same joby.
   - Zaznacz **Require branches to be up to date before merging**. GitHub stosuje to dopiero, gdy na liście jest co najmniej jeden check. Gałąź PR musi zawierać aktualny `main`, a `check` i `Code quality` muszą być zielone na tym właśnie SHA.
10. **Create**.

Nie dodawaj do bypass listy konta, którym merguje automat. Cloud agent i tak powinien iść przez PR. Pusta lista bypass jest tu odpowiednikiem odznaczonego „Allow administrators to bypass” przy środowisku: administrator nie omija PR ani statusu `check`.

### Ruleset na tagi `v*`

Osobny ruleset, też przed pierwszym tagiem. Bez niego tag da się przesunąć albo skasować, a workflow i tak wypuści to, co tag wskazuje (o ile commit jest na `main`).

1. **Settings → Rules → Rulesets → New ruleset → New tag ruleset**.
2. **Ruleset name:** `v-releases`.
3. **Enforcement status:** **Active** (nowe startują jako **Disabled**).
4. **Bypass list:** zostaw pustą. **Always allow** pozwoliłby przesunąć albo skasować tag wydania.
5. **Target tags → Add a target → Include by pattern**. Wzorzec: `v*`.
6. W **Tag protections** zaznacz **Restrict updates** (nie da się przesunąć istniejącego tagu) i **Restrict deletions**.
7. Nie zaznaczaj **Restrict creations**. Inaczej nie wypchniesz nowego `v1.0.0`, chyba że jesteś na liście bypass.
8. **Create**.

## 8. Cięcie wydania

Numery buildów są zdalne. W `eas.json` jest `cli.appVersionSource: "remote"` i `build.production.autoIncrement: true`. EAS trzyma `android.versionCode` i `ios.buildNumber` u siebie i podbija je przy każdym buildzie produkcyjnym. Nie edytuj tych dwóch pól przy wydaniu.

Nazwa widoczna w sklepie to `expo.version` w `app.json` (dziś `1.0.0`). `autoIncrement` jej nie rusza. Tag musi być dokładnie `v` plus ta wartość: przy `1.0.0` tag to `v1.0.0`. Inny tag workflow odrzuci w `scripts/assert-eas-release-config.mjs`. Nową nazwę wersji zmieniasz w zwykłym pull requeście, mergujesz na `main` i dopiero wtedy tagujesz ten commit.

Pierwszy build produkcyjny startuje od lokalnego `versionCode` / `buildNumber` (`1`) i od razu robi z tego `2`, bo autoincrement jest włączony. Zostaw te pola w `app.json` do pierwszego udanego buildu produkcyjnego, żeby EAS miał z czego wziąć stan początkowy. Gdy ten build już jest na EAS, usuń `android.versionCode` i `ios.buildNumber` z `app.json` w osobnym PR. Od tej chwili lokalne liczby i tak są ignorowane, a zostawione wyglądają jak źródło prawdy. Jeśli musisz zacząć od konkretnego numeru (aplikacja już jest w sklepie), raz, przed tagiem:

```bash
npx eas-cli@24.12.0 build:version:set
```

Osobno dla Androida i iOS. To nie jest krok przy każdym wydaniu.

Gdy punkty 1–7 są zrobione, a `main` jest zmergowany i `check` oraz `Code quality` są zielone, taguj commit, który już jest na `main`. Workflow woła `git merge-base --is-ancestor` i odrzuca tag wskazujący commit spoza `main`.

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

`v1.0.0` wchodzi tylko wtedy, gdy `expo.version` na tym commicie to `1.0.0`. Samo `1.0.0` bez `v` workflow nie uruchamia.

Potem:

1. Job **Typecheck and tests** (typecheck, testy jednostkowe, E2E) musi być zielony.
2. Job **EAS production build** w środowisku `release-build` czeka, aż EAS skończy oba buildy (bez `--no-wait`), i zapisuje ich id. Limit tego joba to 180 minut. Jeśli GitHub ubije job po czasie, build na serwerach EAS **jedzie dalej**, ale id nie trafiają do outputów i job **EAS submit nie ruszy**. Ponowne odpalenie joba buildu startuje nowe buildy, nie podpina się pod te, które już lecą. Skończone id widać w pulpicie Expo; wysyłka ręczna to `eas submit --id <id>`, poza tym workflow.
3. Job **EAS submit** stoi na akceptacji środowiska `production`.
4. Po **Approve and deploy** idą dwa submitty: Android i iOS, każdy z `--id` buildu z tego biegu, na ścieżkę wewnętrzną Play (szkic) i do App Store Connect. Nie używamy `--latest`, bo to wziąłoby najnowszy build w projekcie, także z innego biegu.

Concurrency jest jedno na całe wydanie (`group: release`) i nie anuluje trwającego biegu. Drugi tag czeka, aż pierwszy workflow, łącznie z oczekiwaniem na akceptację, się skończy.

Profil `development` odpalasz ręcznie, gdy potrzebujesz binarki z natywnym modułem TFLite, nie tagiem:

```bash
npx eas-cli@24.12.0 build --profile development --platform android
```
