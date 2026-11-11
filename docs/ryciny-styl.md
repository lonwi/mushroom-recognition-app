# Styl rycin (D-17, decyzja po pilotażu)

Plan A to rastrowa tablica botaniczna: ciepły papier, tusz i akwarela, bez tekstu na obrazie. Recraft Vector nie jest stylem atlasu. Podpisy dodaje aplikacja.

W tej fazie repo trzyma tylko pochodzenie plansz pilotażu. Pliki obrazów powstają poza repozytorium. Dopóki pliku nie ma w `assets/illustrations/`, wiersz w `generated_images` ma `review_status = pending` i nie jest do wyświetlenia.

Cecha planszy (`przekroj`, `hymenofor`, `trzon`, `glowny`) jest w `data/sources/illustration-features.json`. To propozycja. Zmiana cechy nie wymaga zmiany kodu.

Rycina nie wchodzi do zbioru treningowego (`excluded_from_training = 1`). Jeśli do generatora poszło zdjęcie, licencja bazy musi być CC0 albo CC BY.
