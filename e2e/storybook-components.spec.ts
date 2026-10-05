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

  test('LookAlikeAlert renders safe message for safe species', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-lookalikealert--safe-species-no-risks');
    await expect(page.locator('body')).toContainText('Brak niebezpiecznych sobowtórów');
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

  test('PreparationGuide renders cleaning, cooking, and storing categories', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-preparationguidescreen--default-view');
    await expect(page.locator('body')).toContainText('Poradnik Przygotowania');
    await expect(page.locator('body')).toContainText('Czyszczenie na sucho');
    await expect(page.locator('body')).toContainText('Obróbka cieplna');
    await expect(page.locator('body')).toContainText('Przechowywanie świeżych grzybów');
  });
});
