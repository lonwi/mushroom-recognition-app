import { expect, test, type Page } from '@playwright/test';

async function pressHardwareBack(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('hardwareBackPress'));
  });
}

test('hardware back returns from species detail, settings, and preparation', async ({ page }) => {
  await page.goto('/iframe.html?id=mushroom-appshell--hardware-back');

  const accept = page.getByText('Rozumiem i akceptuję zasady');
  await expect(accept).toBeVisible();
  await accept.click();
  await expect(accept).toHaveCount(0);

  await page.getByTestId('nav-ATLAS').click();
  await page.getByTestId('atlas-card-boletus_edulis').click();
  await expect(page.getByTestId('species-back')).toBeVisible();

  await pressHardwareBack(page);
  await expect(page.getByTestId('species-back')).toHaveCount(0);
  await expect(page.getByTestId('atlas-scope-notice')).toBeVisible();

  await pressHardwareBack(page);
  await expect(page.getByTestId('atlas-scope-notice')).toHaveCount(0);
  await expect(page.getByTestId('scanner-atlas-scope')).toBeVisible();

  await page.getByTestId('nav-ATLAS').click();
  await page.getByTestId('atlas-card-boletus_edulis').click();
  await page.getByText('⚙️').click();
  await expect(page.getByTestId('btn-lang-pl')).toBeVisible();
  await expect(page.getByTestId('species-back')).toHaveCount(0);

  await pressHardwareBack(page);
  await expect(page.getByTestId('btn-lang-pl')).toHaveCount(0);
  await expect(page.getByTestId('species-back')).toBeVisible();

  await page.getByTestId('nav-SAFETY').click();
  await page.getByTestId('open-preparation').click();
  await expect(page.getByTestId('tab-prep-all')).toBeVisible();
  await expect(page.getByText('Poradnik Przygotowania')).toBeVisible();

  await pressHardwareBack(page);
  await expect(page.getByTestId('tab-prep-all')).toHaveCount(0);
  await expect(page.getByText('Poradnik Bezpieczeństwa & Pomoc')).toBeVisible();
  await expect(page.getByTestId('open-preparation')).toBeVisible();

  await pressHardwareBack(page);
  await expect(page.getByTestId('open-preparation')).toHaveCount(0);
  await expect(page.getByTestId('scanner-atlas-scope')).toBeVisible();
});
