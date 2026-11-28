# Zrzut delegata — `spike-b-inference.json`

Ekran deweloperski „Spike inferencji” udostępnia ten plik. Repozytorium modelu ocenia go funkcją `score_delegate_dump`. Skrót po polsku na ekranie nie jest tym plikiem.

Plik powstaje tylko na telefonie, z buildu `development` albo `preview`. Nie commitujemy go. Nie ma w nim werdyktu jadalności.

## Koperta

| Pole                   | Znaczenie                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `kind`                 | Zawsze `grzybobranie.delegate-dump`.                                                                  |
| `formatVersion`        | `1`.                                                                                                  |
| `startedAt`            | Czas ISO rozpoczęcia pomiaru.                                                                         |
| `modelVersion`         | Z manifestu, dla tej paczki `0.2.0-rc1-test`.                                                         |
| `tfliteSha256`         | SHA-256 pliku `.tflite` z manifestu.                                                                  |
| `classes`              | `classId` w kolejności logitów (66).                                                                  |
| `delegate`             | `cpu`.                                                                                                |
| `nnapi`                | `false`.                                                                                              |
| `device`               | `platform`, `brand`, `modelName`, `osVersion`.                                                        |
| `build.profile`        | `development`, `preview`, `dev` albo `unknown`. Wartość bierze się z `EXPO_PUBLIC_EAS_BUILD_PROFILE`. |
| `loadColdMilliseconds` | Pierwsze załadowanie modelu. `null`, gdy ładowanie padło.                                             |
| `warmupMilliseconds`   | Jedno nietaktowane przejście przed serią. Nie wchodzi do p50 ani p95.                                 |
| `single`               | Statystyki jednego zdjęcia. `null`, gdy nie ma udanego przebiegu.                                     |
| `session3`             | Statystyki sesji trzech zdjęć, w tym `fusion`.                                                        |
| `parity`               | P3 na złotych zdjęciach. `null`, gdy lista jest pusta.                                                |
| `thresholds`           | Progi i znaczniki `pass` / `fail` / `null`. `null` znaczy, że seria albo parytet nie są kompletne.    |
| `memory`               | Szczyt PSS, sterty natywnej i sterty Javy, w kB.                                                      |
| `failures`             | `{ phase, message }`.                                                                                 |
| `cancelled`            | `true`, gdy pomiar stanął przed kolejnym przebiegiem albo zdjęciem.                                   |
| `images`               | Jedna pozycja na złote zdjęcie, także przy błędzie.                                                   |
| `p1Exif`               | `pass`, `fail` albo `unavailable` oraz `detail` dla obrazu EXIF P1.                                   |

## Czas

W `single` i `session3` są bloki `preprocess`, `inference`, `total`, a w sesji także `fusion`. Każdy blok ma `count`, `mean`, `median`, `min`, `max`, `p50`, `p95`.

p50 i p95 są nearest-rank: ranga `ceil(p · n)`, bez interpolacji. Przy n = 10 p95 jest maksimum.

`total` jednego zdjęcia to preprocessing + inferencja. `total` sesji dokłada fuzję. Dekodowanie JPEG jest w `images[].decodeMilliseconds` i nie wchodzi do progów.

Progi, tylko jako opis (liczby z telefonu wpisuje właściciel, nie ten dokument):

- suma jednego zdjęcia, p95 ≤ 2000 ms;
- suma sesji, p95 ≤ 5000 ms.

Oba progi dotyczą tylko Xiaomi Mi 11 Lite 5G.

## Parytet

`parity.count` to liczba złotych zdjęć w paczce (240). `parity.scored` to ile doszło do logitów.

- `deviceParityP3` i `top1Agreement` to liczba zgodnych top-1 podzielona przez `count`. Top-1 to `argmax` logitów urządzenia i `tfliteFp16Logits`. Mianownik nie kurczy się, gdy zdjęcie padnie.
- `decisionStatusAgreement` to zgodność statusu `ok` / `unclear` / `out_of_distribution` z `expectedDecision.status`, tym samym mianownikiem.
- `maxAbsLogitDiff` i `meanAbsLogitDiff` liczą się po zdjęciach, które mają logity tej samej długości co referencja.
- `complete` jest `true` tylko wtedy, gdy pomiar nie został przerwany i każde zdjęcie ma logity zgodnej długości.

Próg `deviceParityP3` ≥ 0,99 i ten sam próg zgodności statusu dotyczą tylko telefonu referencyjnego. Oceniacz w repozytorium modelu może policzyć to samo ze zrzutu i własnego `golden_images.json`. Nie musi ufać polu `top1Match`.

## Zdjęcie

| Pole                                                                    | Znaczenie                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| `index`, `photoId`, `relativePath`, `imageSha256`                       | Klucz do `golden_images.json`.                 |
| `deviceLogits`                                                          | Logity float z telefonu albo `null`.           |
| `decodeMilliseconds`, `preprocessMilliseconds`, `inferenceMilliseconds` | Czasy albo `null`.                             |
| `top1Index`, `top1ClassId`                                              | Argmax urządzenia.                             |
| `decisionStatus`                                                        | Status z bramki energii i `minTop1Prob`.       |
| `expectedStatus`                                                        | `expectedDecision.status` z paczki.            |
| `top1Match`, `decisionMatch`                                            | Podgląd na ekranie. Oceniacz liczy to od nowa. |
| `maxAbsLogitDiff`                                                       | Maksimum na tym zdjęciu albo `null`.           |
| `error`                                                                 | Tekst błędu albo `null`.                       |

Referencyjnych logitów w zrzucie nie ma. Są w `golden_images.json` po stronie modelu, spinane `photoId` albo `index`.
