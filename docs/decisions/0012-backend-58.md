# 0012. Backend i powiadomienia (#58)

- **Status:** Odłożona
- **Data wpisu:** 2026-10-23

## Kontekst

[Issue #58](https://github.com/lonwi/mushroom-recognition-app/issues/58) jest otwarte. Tytuł: „Powiadomienia push: zakres i sposób wdrożenia”. Notatka z 22.10.2026: „trzeba będzie podpiąć push notification”. Aplikacja może korzystać z internetu i darmowych API. Kont, bazy online i zapisu danych online nie ma.

W issue są dwie drogi techniczne, obie bez implementacji w repozytorium (nie ma `expo-notifications`, Firebase ani serwera):

- Lokalne powiadomienia (`expo-notifications`), bez serwera.
- Zdalny push (FCM/APNs przez Expo Push Service): projekt Firebase, token urządzenia, coś, co wysyła wiadomości, oraz zmiana polityki prywatności na `site/`.

Komentarze z 22.10.2026 dopisują bramki (prośba o zgodę dopiero po akcji użytkownika, brak sugestii jadalności, lokalne powiadomienia bez sieci, klucze poza repozytorium). Prognoza pogody, jeśli kiedyś wejdzie, jest osobno w [0005](0005-prototyp-ui.md).

## Opcje

- **A.** Zostać przy samych powiadomieniach lokalnych, bez backendu.
- **B.** Zdalny push i backend, gdy pojawi się potrzeba kont albo treści wysyłanych centralnie.
- **C.** Nie robić teraz żadnego z tych dwóch.

## Rekomendacja

Issue samo wskazywało A jako bliższe obecnym założeniom, a B jako późniejsze. Właściciel nie wybrał A ani B. Wybrał odłożenie.

## Decyzja

Powiadomienia odkładamy na później. Backend jest dopuszczalny, o ile nic nie kosztuje („byle nic nie kosztował”).

Wybór między powiadomieniem lokalnym a zdalnym pushem nie zapadł. Issue zostaje otwarte jako przypomnienie, nie jako zgoda na implementację.

## Data

2026-10-23. Komentarz właściciela na issue: „Decyzja Wojtka (23.10.2026): powiadomienia odkładamy na później. Backend jest dopuszczalny, o ile nic nie kosztuje.”

## Uzasadnienie

Właściciel odkłada temat. Jedyny warunek dopuszczenia backendu: brak kosztów.

## Wdrożenie

Brak. W repozytorium nie ma kodu powiadomień ani backendu.

## Weryfikacja

Treść decyzji sprawdzona w komentarzu na [#58](https://github.com/lonwi/mushroom-recognition-app/issues/58#issuecomment-6360283320) (2026-10-23T07:57:52Z).
