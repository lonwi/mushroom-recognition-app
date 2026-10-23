# 0017. React Doctor

- **Status:** Podjęta (wdrożenie w toku)
- **Data wpisu:** 2026-10-23

## Kontekst

Skille `react-doctor`, `improve-react` i `performance` są we wspólnej bibliotece botów.

PR Review uruchamia `npx react-doctor@latest --scope changed --no-score` w review pull requestów z kodem React Native.

`main` po [#75](https://github.com/lonwi/mushroom-recognition-app/pull/75) to squash [`30165b7569307de4db3b160cdc6ef7dcefae31e6`](https://github.com/lonwi/mushroom-recognition-app/commit/30165b7569307de4db3b160cdc6ef7dcefae31e6).

## Opcje

- **A.** Audyt `main` przez `improve-react`. Raport z priorytetami. Poprawki osobnymi PR-ami po OK Wojtka.
- **B.** A plus React Doctor w CI jako krok informacyjny.
- **C.** Na razie nic.

## Rekomendacja

Brak.

## Decyzja

**A** (2026-10-23, 16:35). Audyt `main` przez `improve-react`, raport z priorytetami, poprawki osobnymi PR-ami dopiero po OK Wojtka.

Odrzucone: **B** (React Doctor w CI jako krok informacyjny) i **C** (na razie nic).

PR Review dalej uruchamia `npx react-doctor@latest --scope changed --no-score` przy review PR-ów z kodem React Native. Ta decyzja nie dokłada React Doctora do CI.

## Data

2026-10-23, 16:35 czasu polskiego.

## Uzasadnienie

Właściciel chce najpierw raport z priorytetami dla całego `main`, a poprawki dopiero po swoim OK. Nie chce kroku React Doctor w CI i nie odkłada tematu.

## Wdrożenie

Quality robi audyt na `main` (`30165b7`) skillem `improve-react`. Raport idzie do Wojtka przez Decyzje. Poprawki nie startują, dopóki Wojtek nie da OK do konkretnego PR.

## Weryfikacja

Decyzja zapisana w tym wpisie. Audytu i raportu w tym pliku nie ma.
