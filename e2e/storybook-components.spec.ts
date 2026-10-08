import { test, expect } from '@playwright/test';

test.describe('Grzybobranie AI - Storybook UI Component Tests', () => {
  test('EdibilityBadge renders all 4 edibility levels', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-edibilitybadge--all-sizes');
    await expect(page.locator('body')).toContainText('JADALNY');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE TRUJĄCY');
  });

  test('LookAlikeAlert renders fatal warning for Czubajka Kania vs Muchomor', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-lookalikealert--deadly-confusion-kania-vs-muchomor');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.locator('body')).toContainText('Muchomor sromotnikowy (zielonawy)');
    await expect(page.locator('body')).toContainText('ruchomy pierścień');
    await expect(page.locator('body')).toContainText('luźną pochwę');
  });

  test('LookAlikeAlert says look-alike information is incomplete when the list is empty', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-lookalikealert--incomplete-look-alike-record');
    await expect(page.locator('body')).toContainText('Informacja o sobowtórach jest niepełna');
    await expect(page.locator('body')).toContainText('Pusta lista nie oznacza braku groźnych sobowtórów');
    await expect(page.locator('body')).not.toContainText('Brak niebezpiecznych sobowtórów');
  });

  test('SafetyDisclaimerModal renders Sanepid legal warning and 112 emergency', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-safetydisclaimermodal--interactive-disclaimer');
    await expect(page.locator('body')).toContainText('NIGDY NIE SPOŻYWAJ GRZYBÓW');
    await expect(page.locator('body')).toContainText('Weryfikacja w Sanepidzie');
    await expect(page.locator('body')).toContainText('112');
  });

  test('ResultModal says an unknown fungus is not a species and not food', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--unknown-mushroom');
    await expect(page.getByTestId('recognition-unknown-title')).toContainText('Nieznany grzyb');
    await expect(page.getByTestId('recognition-unknown-body')).toContainText(
      'To wygląda na grzyba, którego aplikacja nie zna. Nie zbieraj go ani nie jedz na podstawie skanu.',
    );
    await expect(page.getByTestId('recognition-unknown-deadly')).toContainText(
      'Ten grzyb może być śmiertelnie trujący.',
    );
    await expect(page.getByTestId('recognition-unknown-verify')).toContainText('Sanepid');
    await expect(page.locator('body')).not.toContainText('%');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('candidate-rank-1')).toHaveCount(0);
  });

  test('ResultModal rejects a non-mushroom without naming a species', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--not-a-mushroom');
    await expect(page.getByTestId('recognition-rejected-title')).toContainText('Nie rozpoznano grzyba');
    await expect(page.getByTestId('recognition-rejected-body')).toContainText('Gatunek nie został podany');
    await expect(page.locator('body')).toContainText('Sanepidzie');
    await expect(page.locator('body')).not.toContainText('%');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('JADALNY');
  });

  test('ResultModal warns on a dangerous genus and does not give an edibility verdict', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--dangerous-genus-warning');
    await expect(page.getByTestId('expert-verification-banner')).toContainText('Sanepidzie');
    await expect(page.getByTestId('dangerous-genus-warning')).toContainText('Amanita');
    await expect(page.getByTestId('low-confidence-warning')).toBeVisible();
    await expect(page.getByTestId('not-edibility-verdict')).toContainText('nie jest oceną jadalności');
    await expect(page.getByTestId('candidate-confidence-1')).toContainText('41.0%');
    await expect(page.locator('body')).toContainText('Amanita phalloides');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.locator('body')).not.toContainText('ŚMIERTELNIE TRUJĄCY');
  });

  test('Journal keeps an unclear find without a map and opens a saved spot', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-journalscreen--saved-finds');
    await expect(page.getByTestId('journal-title-sighting_unclear')).toContainText('Niepewny wynik');
    await expect(page.getByTestId('journal-no-location-sighting_unclear')).toContainText(
      'Brak zapisanej lokalizacji',
    );
    await expect(page.getByTestId('journal-open-map-sighting_unclear')).toHaveCount(0);
    await expect(page.getByTestId('journal-candidate-sighting_spot-1')).toContainText('57.4%');
    await expect(page.getByTestId('journal-not-edible-sighting_spot')).toContainText('nie jest oceną jadalności');
    await expect(page.getByTestId('journal-open-map-sighting_spot')).toContainText('Otwórz miejsce w mapach');
    await expect(page.locator('body')).not.toContainText('JADALNY');

    await page.getByTestId('journal-edit-notes-sighting_spot').click();
    await page.getByTestId('journal-notes-input').fill('pod dębami, 4 sztuki');
    await page.getByTestId('journal-notes-save').click();
    await expect(page.getByTestId('journal-notes-sighting_spot')).toContainText('pod dębami, 4 sztuki');
    await page.reload();
    await expect(page.getByTestId('journal-notes-sighting_spot')).toContainText('pod dębami, 4 sztuki');
    await expect(page.getByTestId('journal-title-sighting_unclear')).toContainText('Niepewny wynik');
  });

  test('ResultModal says recognition is unavailable and shows no species or confidence', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-resultmodal--recognition-unavailable');
    await expect(page.getByTestId('recognition-unavailable-title')).toContainText('Rozpoznawanie niedostępne');
    await expect(page.getByTestId('recognition-unavailable-body')).toContainText(
      'Nie ma modelu, który odczytuje piksele zdjęcia.'
    );
    await expect(page.locator('body')).not.toContainText('TFLite');
    await expect(page.locator('body')).not.toContainText('Pewność AI');
    await expect(page.locator('body')).not.toContainText('Borowik');
    await expect(page.locator('body')).not.toContainText('%');
  });

  test('Species detail keeps the olszówka warning without a kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--paxillus-incomplete-look-alikes');
    await expect(page.getByTestId('species-warning-notes')).toContainText('NIGDY NIE ZBIERAJ OLSZÓWEK');
    await expect(page.getByTestId('lookalike-link-lactarius_deliciosus')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Brak niebezpiecznych sobowtórów');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.getByTestId('species-use-toxic')).toContainText('Toksyczność i objawy');
    await expect(page.locator('body')).not.toContainText('W kuchni');
  });

  test('Muchomor sromotnikowy keeps a red look-alike warning when the named twins are edible', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--death-cap-red-warning');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
    await expect(page.getByTestId('lookalike-status-macrolepiota_procera')).toContainText('JADALNY');
    await expect(page.getByTestId('incomplete-card-badge-russula_virescens')).toContainText('KARTA NIEPEŁNA');
  });

  test('Panther card separates twardawy by ring and bulb and does not badge a missing card as edible', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--panther-missing-card-twins');
    await expect(page.locator('body')).toContainText('f. abietum');
    await expect(page.locator('body')).toContainText('w górach, pod jodłami i świerkami');
    await expect(page.locator('body')).toContainText('pierścień gładki');
    await expect(page.locator('body')).toContainText('pierścień prążkowany');
    await expect(page.getByTestId('missing-card-badge-amanita_excelsa')).toContainText('Brak karty');
    await expect(page.getByTestId('missing-card-badge-amanita_excelsa')).not.toContainText('JADALNY');
    await expect(page.getByTestId('lookalike-unlinked-amanita_excelsa')).toContainText('Niezalecany do zbioru');
    await expect(page.getByTestId('missing-card-badge-amanita_rubescens')).toContainText('Brak karty');
    await expect(page.getByTestId('lookalike-unlinked-amanita_rubescens')).toContainText(
      'Atlas nie wydaje werdyktu dla tego gatunku'
    );
    await expect(page.getByTestId('lookalike-unlinked-amanita_rubescens')).not.toContainText('Niezalecany do zbioru');
    await expect(page.getByTestId('lookalike-status-macrolepiota_procera')).toContainText('JADALNY');
  });

  test('Fibrecap names majówka without an atlas verdict', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--fibrecap-no-atlas-verdict');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.getByTestId('missing-card-badge-calocybe_gambosa')).toContainText('Brak karty');
    await expect(page.getByTestId('lookalike-unlinked-calocybe_gambosa')).toContainText(
      'Atlas nie wydaje werdyktu dla tego gatunku'
    );
    await expect(page.getByTestId('lookalike-unlinked-calocybe_gambosa')).not.toContainText('Niezalecany do zbioru');
    await expect(page.getByTestId('lookalike-status-calocybe_gambosa')).not.toContainText('JADALNY');
    await expect(page.getByTestId('lookalike-status-calocybe_gambosa')).not.toContainText('NIEJADALNY');
    await expect(page.getByTestId('lookalike-status-cantharellus_cibarius')).toContainText('JADALNY');
  });

  test('Species detail shows a fatal look-alike banner and warning notes for kania', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('fatal-lookalike-banner')).toContainText('Śmiertelnie groźny sobowtór');
    await expect(page.getByTestId('species-warning-notes')).toContainText('muchomorami');
    await expect(page.locator('body')).toContainText('ŚMIERTELNIE GROŹNE SOBOWTÓRY!');
  });

  test('Smardz card states the 2014 partial-protection places without a green edible badge', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--morel-protection-note');
    await expect(page.getByTestId('incomplete-card-badge')).toContainText('KARTA NIEPEŁNA');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('species-use-neutral')).toContainText('Znaczenie w literaturze');
    await expect(page.locator('body')).not.toContainText('W kuchni');
    await expect(page.getByTestId('species-warning-notes')).toContainText(
      'poza terenem ogrodów, upraw ogrodniczych, szkółek leśnych oraz poza terenami zieleni'
    );
    await expect(page.getByTestId('species-warning-notes')).toContainText('§ 6 ust. 2 pkt 4');
    await expect(page.getByTestId('morel-protection-notice')).toContainText('Dz.U. 2014 poz. 1408');
    await expect(page.getByTestId('morel-protection-notice')).toContainText('zezwoleniem');
  });

  test('Gołąbek zielonawy has no borrowed photo and a do-not-eat warning', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--russula-without-photo');
    await expect(page.getByTestId('species-photo-missing')).toContainText('Brak zdjęcia');
    await expect(page.getByTestId('species-photo')).toHaveCount(0);
    await expect(page.getByTestId('species-warning-notes')).toContainText('NIE JEDZ NA PODSTAWIE TEJ KARTY');
    await expect(page.getByTestId('fatal-lookalike-banner')).toBeVisible();
    await expect(page.getByTestId('incomplete-card-banner')).toContainText('Karta niepełna');
    await expect(page.getByTestId('incomplete-card-badge')).toContainText('KARTA NIEPEŁNA');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await expect(page.getByTestId('species-use-neutral')).toContainText('Znaczenie w literaturze');
    await expect(page.locator('body')).not.toContainText('W kuchni');
  });

  test('Czubajnik czerwieniejący does not get the green kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--czubajnik-not-for-the-kitchen');
    await expect(page.getByTestId('species-use-toxic')).toContainText('Toksyczność i objawy');
    await expect(page.locator('body')).toContainText('TRUJĄCY');
    await expect(page.locator('body')).not.toContainText('NIEJADALNY');
    await expect(page.locator('body')).not.toContainText('W kuchni');
    await expect(page.getByTestId('species-use-edible')).toHaveCount(0);
  });

  test('Atlas scope matches the card list and filters combine to an empty state', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-atlasscreen--filters');
    await expect(page.getByTestId('atlas-scope-notice')).toContainText('nie jest kompletny klucz');
    await expect(page.getByTestId('atlas-scope-notice')).toContainText('Sanepidzie');

    const search = page.getByPlaceholder('Szukaj grzyba (np. borowik, kania, kurka)...');
    await search.fill('zolciowy');
    await expect(page.getByText('Goryczak żółciowy')).toBeVisible();
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 1');
    await search.fill('');

    await page.getByTestId('filter-status-INCOMPLETE').click();
    await expect(page.getByText('Gołąbek zielonawy')).toBeVisible();
    await expect(page.getByText('Kolczak obłączasty')).toBeVisible();
    await expect(page.getByText('Pieczarka polna')).toBeVisible();
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 13');
    await expect(page.locator('body')).not.toContainText('JADALNY');
    await page.getByTestId('filter-status-EDIBLE').click();
    await expect(page.getByText('Prawdziwki')).toBeVisible();
    await expect(page.getByText('Gołąbek zielonawy')).toHaveCount(0);

    await page.getByTestId('filter-status-ALL').click();
    await page.getByTestId('filter-hymenophore-SPINES').click();
    await expect(page.getByText('Kolczak obłączasty')).toBeVisible();
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 1');
    await page.getByTestId('filter-status-DEADLY_POISONOUS').click();
    await expect(page.getByTestId('atlas-empty')).toContainText('Brak karty nie oznacza, że grzyb jest jadalny');
    await expect(page.getByTestId('atlas-result-count')).toContainText('Pasujące karty: 0');
    await expect(page.getByText('Kolczak obłączasty')).toHaveCount(0);
  });

  test('A finished edible species keeps the green kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('species-use-edible')).toContainText('W kuchni');
    await expect(page.getByTestId('species-use-neutral')).toHaveCount(0);
  });

  test('Safety guide takes mushrooms whole and cuts only sure tube mushrooms', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-safetyguidescreen--golden-rules');
    await expect(page.locator('body')).toContainText(
      'Dla początkujących: tylko grzyby z rurkami (z "gąbką")',
    );
    await expect(page.locator('body')).toContainText(
      'Wyjmuj grzyby w całości, z bulwą i pochwą u nasady',
    );
    await expect(page.locator('body')).toContainText('bez rurek');
    await expect(page.locator('body')).toContainText('Takich grzybów nie ucinaj nad ziemią');
    await expect(page.locator('body')).toContainText(
      'Tylko grzyby rurkowe (z „gąbką”) możesz ścinać nisko nożem',
    );
    await expect(page.locator('body')).toContainText('Grzybów z blaszkami nie ścinaj');
    await expect(page.locator('body')).toContainText('grzyboznawcy');
    await expect(page.locator('body')).toContainText('dziko rosnących smardzów');
    await expect(page.locator('body')).not.toContainText('resztki pierścienia');
    await expect(page.locator('body')).not.toContainText('bezpodstawny');
  });

  test('PreparationGuide renders cleaning, cooking, and storing categories', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-preparationguidescreen--default-view');
    await expect(page.locator('body')).toContainText('Poradnik Przygotowania');
    await expect(page.locator('body')).toContainText('Czyszczenie na sucho');
    await expect(page.locator('body')).toContainText('Obróbka cieplna');
    await expect(page.locator('body')).toContainText('Przechowywanie świeżych grzybów');
  });
});
