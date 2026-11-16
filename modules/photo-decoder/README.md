# Dekoder zdjęć (spike B)

Lokalny moduł Expo. Publiczne API jest takie samo na każdej platformie. Android dekoduje zdjęcie. iOS na razie odrzuca wywołanie kodem `unsupported`.

## `decode(uri, minShortSide)`

Dla adresu `file://` albo `content://` (aparat, galeria):

1. Czyta orientację EXIF, bez trzymania pełnego obrazu.
2. Dekoduje z podpróbkowaniem, tak aby **krótszy bok** miał co najmniej `minShortSide` pikseli, o ile źródło w ogóle jest większe. Mniejszego zdjęcia nie powiększa.
3. Od Androida 9 (API 28) używa `ImageDecoder.setTargetSize`. Na starszych wersjach używa `inSampleSize` (potęga dwójki). Wzór jest ten sam co w `src/core/ai/decode-plan.ts`.
4. `ImageDecoder` sam stosuje EXIF, więc ten wynik nie jest obracany drugi raz. Ścieżka `BitmapFactory` obraca tagi 2–8 i mierzy pamięć, zanim zwolni pierwszą bitmapę.
5. Kopiuje piksele do bufora RGB (3 bajty na piksel, bez kanału alfa) i **od razu** woła `bitmap.recycle()`.

Wynik: wymiary RGB, wymiary źródła, numer EXIF, `sampleSize`, flaga `usedTargetSize` oraz szczyt PSS, sterty natywnej i sterty Javy **zmierzone w trakcie** dekodowania, zanim bitmapa zniknie.

Pole manifestu nazywa się `decodeMinWidth`, ale spike B każe pilnować krótszego boku. Aplikacja podaje tu tę wartość jako `minShortSide`. Gdy pola nie ma, próg to 448 px. To nie jest rozmiar wejścia modelu.

Kody błędów: `unsupported`, `unreadable`, `decode_failed`, `empty`, `oom`, `invalid_argument`.

## `readProcessMemory()`

PSS procesu, zaalokowana sterta natywna i sterta Javy, w kilobajtach. Na iOS ten sam kod `unsupported`.

## Czego ten moduł nie robi

Nie skaluje do wejścia modelu i nie normalizuje. To jest `src/core/ai/image-preprocessing.ts`, według sekcji `preprocessing` manifestu. Parytet P1 dotyczy tego kroku TypeScript, nie dekodera JPEG.
