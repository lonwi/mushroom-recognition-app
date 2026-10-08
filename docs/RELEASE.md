# Wydanie Grzybobranie AI

Tag `vX.Y.Z` uruchamia [`.github/workflows/release.yml`](../.github/workflows/release.yml). Job `build` woła `eas build --profile production --platform all --non-interactive`. Job `submit` czeka na środowisko GitHub o nazwie `production` (tu włącza się ręczna akceptacja), a potem woła `eas submit --profile production --platform all --latest --non-interactive`.

Ten plik jest listą rzeczy, których agent nie zrobi za Ciebie. Zrób je raz, zanim wypchniesz pierwszy tag. Kolejność poniżej jest istotna: środowisko `production` musi istnieć z recenzentami **zanim** poleci pierwszy tag, bo inaczej GitHub utworzy je puste, bez akceptacji.

Nie commituj tokenów, pliku JSON konta usługi Google ani klucza `.p8`. Te sekrety idą do sekretu repozytorium albo do poświadczeń EAS.

## 1. Konto Expo i `eas init`

1. Załóż konto na [https://expo.dev/signup](https://expo.dev/signup), jeśli go nie masz. Nazwa konta (albo organizacji), która ma być właścicielem projektu, będzie wartością `expo.owner`.
2. W katalogu repozytorium zainstaluj zależności (`pnpm install`) i zaloguj się:

   ```bash
   npx eas-cli@latest login
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
   npx eas-cli@latest init
   ```

   CLI zapyta, które konto ma być właścicielem. Wybierz swoje konto (albo organizację). Potwierdź utworzenie `@twoje-konto/mushroom-recognition-app`, jeśli projektu jeszcze nie ma.

   To samo bez pytań, gdy znasz nazwę konta:

   ```bash
   npx eas-cli@latest init --account TWOJE_KONTO --force --non-interactive
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

## 2. Token `EXPO_TOKEN` jako sekret repozytorium

Robot jest lepszy niż token osobisty: da się go unieważnić bez wylogowywania człowieka, i build nie przestaje działać, gdy ktoś odejdzie z konta. Token osobisty też zadziała.

### Robot (konto organizacji)

1. Wejdź na konto, które jest właścicielem projektu: [https://expo.dev](https://expo.dev) → przełącznik konta.
2. Otwórz **Access tokens** w ustawieniach tego konta: `https://expo.dev/accounts/<owner>/settings/access-tokens`.
3. Utwórz robota (przycisk w rodzaju **Create robot** / **Robot users** na tej karcie). Nazwa na przykład `github-actions`. Rola: **Developer**. Ta rola może robić buildy, wydania i zarządzać poświadczeniami. **Admin** jest szerszy, niż trzeba. **Viewer** nie zbuduje aplikacji.
4. Dla tego robota utwórz access token i skopiuj go od razu. Expo pokazuje go tylko raz.

Na koncie osobistym robot bywa niedostępny. Wtedy:

1. Otwórz [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
2. Kliknij **Create token**.
3. Nazwij go, na przykład `github-actions-grzybobranie`, i skopiuj wartość.

### Sekret w GitHubie

Token ma być **sekretem repozytorium**, nie sekretem środowiska. Job `build` nie jest w środowisku `production` i sekretu środowiskowego nie zobaczy.

1. Strona repozytorium → **Settings**.
2. W lewym menu **Secrets and variables** → **Actions**.
3. Zakładka **Secrets**, sekcja **Repository secrets** → **New repository secret**.
4. Name: `EXPO_TOKEN` (dokładnie tak, wielkie litery).
5. Secret: wklejony token.
6. **Add secret**.

Workflow czyta go jako `secrets.EXPO_TOKEN` i podaje do `expo/expo-github-action@v9`. Akcja ustawia zmienną `EXPO_TOKEN` dla kolejnych kroków. Nie wypisuj tokenu w logach.

Unieważnienie: ta sama strona Access tokens → usuń token.

## 3. Środowisko GitHub `production` z recenzentem

Zrób to **przed** pierwszym tagiem. Job `submit` ma `environment: production`. Jeśli środowiska nie ma, pierwsze uruchomienie utworzy je **bez** reguł i submit pójdzie od razu.

Wymagani recenzenci na prywatnym repozytorium są dostępni na GitHub Pro, Team i Enterprise. Na planie Free działają dla repozytoriów publicznych.

1. Strona repozytorium → **Settings**.
2. W lewym menu kliknij **Environments**.
3. **New environment**.
4. Name: `production` (małe litery, dokładnie tak jak w workflow). **Configure environment**.
5. Zaznacz **Required reviewers**.
6. Wpisz siebie (i ewentualnie drugą osobę). Wystarczy akceptacja jednego z maksymalnie sześciu recenzentów.
7. Opcjonalnie zaznacz **Prevent self-review**, jeśli tag wypycha ktoś inny niż recenzent. Przy jednej osobie zostaw to wyłączone, inaczej nie zatwierdzisz własnego tagu.
8. **Save protection rules**.

Zalecane ograniczenie, co w ogóle może deployować:

1. Na tej samej stronie, **Deployment branches and tags**, wybierz **Selected branches and tags**.
2. **Add deployment branch or tag rule**.
3. W **Ref type** wybierz **Tag**.
4. Name pattern: `v*`.
5. **Add rule**.

Wzorzec dotyczy tagów osobno od gałęzi. `v*` puszcza `v1.2.3` i nie puszcza zwykłego pusha do `main`.

Po zbudowaniu binarek GitHub zatrzyma job `submit` na karcie Actions przy tym tagu. Recenzent klika **Review deployments** → zaznacza `production` → **Approve and deploy**. Dopiero wtedy leci `eas submit`.

## 4. Google Play: konto usługi, JSON tylko na EAS

Paczka Androida to `com.grzybobranie.ai`. W `eas.json` profil `submit.production.android` ma `applicationId` równy tej paczce, `track: internal` i `releaseStatus: draft`. Ścieżki do pliku JSON w repozytorium nie ma celowo: runner jej nie posiada, a plik nie może trafić do gita (`.gitignore` odrzuca `google-service-account.json` i `*.p8`).

1. Załóż konto Google Play Console i opłać rejestrację dewelopera.
2. W Play Console kliknij **Create app**. Nazwa paczki przy pierwszym uploadzie musi być `com.grzybobranie.ai`. Aplikacja może zostać szkicem, dopóki nie uzupełnisz karty sklepu.
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
     npx eas-cli@latest credentials --platform android
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
   npx eas-cli@latest credentials --platform ios
   ```

   Profil: **production**. Zaloguj się do Apple, gdy CLI poprosi. Wybierz **App Store Connect: Manage your API Key**, potem **Set up your project to use an API Key for EAS Submit**, i wskaż `.p8`, Key ID oraz Issuer ID.
4. Usuń lokalny `.p8`. Nie ustawiaj `ascApiKeyPath`, `ascApiKeyId` ani `ascApiKeyIssuerId` w `eas.json` i nie wkładaj pliku do repozytorium.

`eas submit` wgrywa build do App Store Connect (TestFlight). Wypuszczenie do sklepu nadal wymaga ręcznego oddania wersji do recenzji w App Store Connect. Sam workflow tego nie klika.

## 6. Podpis raz, lokalnie

Pierwszy `eas build --non-interactive` nie przejdzie pytań o keystore Androida ani o Apple (2FA). Robot ich nie odpowie. Zanim wypchniesz tag, będąc zalogowanym jako właściciel (nie `EXPO_TOKEN` robota):

```bash
npx eas-cli@latest credentials --platform android
npx eas-cli@latest credentials --platform ios
```

Dla obu wybierz profil **production** i pozwól EAS wygenerować keystore Androida oraz certyfikat dystrybucyjny i profil provisioningowy iOS, jeśli ich jeszcze nie ma. Zostają na serwerach EAS. Kolejne buildy z GitHuba je tylko pobierają.

Profil `development` w `eas.json` zostaw w spokoju: wewnętrzne APK i build symulatora iOS. `react-native-fast-tflite` potrzebuje takiego buildu deweloperskiego, a tag `v*` go nie uruchamia.

## 7. Ruleset na `main`

Job CI nazywa się `check` (`.github/workflows/ci.yml`). Ruleset ma wymagać pull requesta i tego statusu. To ustawienie jest w GitHubie, nie w YAML.

1. Strona repozytorium → **Settings**.
2. W lewym menu, w grupie **Code, planning, and automation**, kliknij **Rules**, a potem **Rulesets**. (Dokumentacja GitHuba nazywa ten sam węzeł od razu **Rulesets** → **Rulesets**.)
3. **New ruleset** → **New branch ruleset**.
4. **Ruleset name:** `main`.
5. **Enforcement status:** nowe rulesety startują jako **Disabled**. Kliknij ten status i ustaw **Active**. Przy **Disabled** reguły nic nie blokują.
6. **Bypass list.** Zostaw pustą, jeśli nikt nie ma omijać PR ani statusu `check`.
   - **Add bypass** otwiera okno. Wyszukaj rolę (na przykład Repository admin), zespół albo aplikację, **Add Selected**.
   - Obok **Always allow** jest przełącznik. **Always allow** puszcza bezpośredni push na `main` z pominięciem PR i statusu `check`. **For pull requests only** i tak wymaga PR, ale pozwala tej osobie zmergować go bez spełnienia reguł. Do zwykłej pracy nie dodawaj siebie z **Always allow**.
7. **Target branches** → **Add a target** → **Include default branch**. Domyślną gałęzią tego repozytorium jest `main`. Jeśli kiedyś nią nie będzie, dodaj drugi cel: **Include by pattern** i wzorzec `main`.
8. W **Branch protections** zaznacz **Require a pull request before merging**. To blokuje push wprost na `main`.
   - **Required approvals:** `0`, jeśli pracujesz sam (PR nadal jest obowiązkowy, mergujesz go sam). Ustaw `1` albo więcej tylko wtedy, gdy ktoś inny naprawdę może zatwierdzić. Przy `1` i jednym maintainerze PR zostaje niezmergowalny.
9. Zaznacz **Require status checks to pass**.
   - W dodatkowym polu wpisz nazwę checka: `check`. To id joba, nie nazwa workflow (`CI`).
   - Zatwierdź dodanie (przycisk plusa obok pola). Samo wpisanie tekstu nie zapisuje wymagania.
   - Jeśli lista podpowiedzi jest pusta, odpal raz workflow CI (push albo PR), wróć tutaj i wyszukaj `check`. Gdy GitHub pokazuje `CI / check`, to ten sam job.
   - Zaznacz **Require branches to be up to date before merging**. GitHub stosuje to dopiero, gdy na liście jest co najmniej jeden check. Gałąź PR musi zawierać aktualny `main`, a `check` musi być zielony na tym właśnie SHA.
10. **Create**.

Nie dodawaj do bypass listy konta, którym merguje automat. Cloud agent i tak powinien iść przez PR.

## 8. Cięcie wydania

Numery buildów są zdalne. W `eas.json` jest `cli.appVersionSource: "remote"` i `build.production.autoIncrement: true`. EAS trzyma `android.versionCode` i `ios.buildNumber` u siebie i podbija je przy każdym buildzie produkcyjnym. Wartości w `app.json` (`versionCode`, `buildNumber`) są wtedy ignorowane. Nie edytuj ich przy wydaniu. Nie rób też commita „bump version” pod tag.

`autoIncrement` nie podbija użytkownikiego `expo.version` (dziś `1.0.0`). To nazwa wersji widoczna w sklepie. Tag jej nie zmienia. Zostaw ją, dopóki świadomie nie zmienisz jej w osobnym PR.

Pierwszy build produkcyjny startuje od lokalnego `versionCode` / `buildNumber` (`1`) i od razu robi z tego `2`, bo autoincrement jest włączony. Dla nowej aplikacji to jest w porządku. Jeśli musisz zacząć od konkretnego numeru (aplikacja już jest w sklepie), raz, przed tagiem:

```bash
npx eas-cli@latest build:version:set
```

Osobno dla Androida i iOS. To nie jest krok przy każdym wydaniu.

Gdy punkty 1–7 są zrobione, a `main` jest zmergowany i `check` jest zielony:

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

Tag musi wskazywać commit, który chcesz wydać (zwykle czubek `main`). Wzorzec workflow to `v*`, więc `v1.0.0` i `v1.2.3` wchodzą, a `1.0.0` bez `v` nie.

Potem:

1. Actions uruchamia job **EAS production build**. Kończy się, gdy EAS skończy oba buildy (komenda bez `--no-wait`).
2. Job **EAS submit** stoi na akceptacji środowiska `production`.
3. Po **Approve and deploy** idzie submit najnowszych buildów tego projektu (`--latest`) na ścieżkę wewnętrzną Play (szkic) i do App Store Connect.

Nie wypychaj tego samego tagu drugi raz, dopóki poprzedni bieg nie jest skończony albo świadomie anulowany. Concurrency w workflow jest per tag (`release-<ref>`) i nie anuluje trwającego biegu.

Profil `development` odpalasz ręcznie, gdy potrzebujesz binarki z natywnym modułem TFLite, nie tagiem:

```bash
npx eas-cli@latest build --profile development --platform android
```
