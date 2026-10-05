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

  test('Species detail shows an incomplete look-alike notice and the olszówka warning', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--paxillus-incomplete-look-alikes');
    await expect(page.getByTestId('lookalike-incomplete')).toContainText('Informacja o sobowtórach jest niepełna');
    await expect(page.getByTestId('species-warning-notes')).toContainText('NIGDY NIE ZBIERAJ OLSZÓWEK');
    await expect(page.locator('body')).not.toContainText('Brak niebezpiecznych sobowtórów');
    await expect(page.getByTestId('fatal-lookalike-banner')).toHaveCount(0);
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

  test('A finished edible species keeps the green kitchen section', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('species-use-edible')).toContainText('W kuchni');
    await expect(page.getByTestId('species-use-neutral')).toHaveCount(0);
  });

  test('PreparationGuide renders cleaning, cooking, and storing categories', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-preparationguidescreen--default-view');
    await expect(page.locator('body')).toContainText('Poradnik Przygotowania');
    await expect(page.locator('body')).toContainText('Czyszczenie na sucho');
    await expect(page.locator('body')).toContainText('Obróbka cieplna');
    await expect(page.locator('body')).toContainText('Przechowywanie świeżych grzybów');
  });
});
