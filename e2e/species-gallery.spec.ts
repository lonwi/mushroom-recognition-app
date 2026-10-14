import { test, expect } from '@playwright/test';

test.describe('Atlas species gallery', () => {
  test('death cap card swipes gallery photos and shows the credit', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--death-cap-red-warning');
    await expect(page.getByTestId('species-gallery')).toBeVisible();
    await expect(page.getByTestId('species-gallery-note')).toContainText('nie jest oceną jadalności');
    await expect(page.getByTestId('species-gallery-feature-0')).toContainText('bulwą lub pochwą');
    await expect(page.getByTestId('species-gallery-modified-0')).toContainText('zmieniono: przeskalowano, WebP');
    await expect(page.getByTestId('species-gallery-author-0')).toContainText('Павлик Лисицын');
    await expect(page.getByTestId('species-gallery-license-0')).toContainText('CC BY 4.0');
    await expect(page.getByTestId('species-gallery-source-0')).toContainText(
      'inaturalist.org/observations/182790926',
    );
    await expect(page.getByTestId('species-gallery-photo-0')).toBeVisible();

    const scroller = page.getByTestId('species-gallery-scroller');
    const moved = await scroller.evaluate((node) => {
      const before = node.scrollLeft;
      node.scrollLeft = node.scrollWidth;
      return node.scrollLeft > before;
    });
    expect(moved).toBe(true);
    await expect(page.getByTestId('species-gallery-author-1')).toContainText("Jamie O'Neill");
  });

  test('an edible card has no gallery', async ({ page }) => {
    await page.goto('/iframe.html?id=mushroom-speciesdetailscreen--kania-fatal-look-alike');
    await expect(page.getByTestId('fatal-lookalike-banner')).toBeVisible();
    await expect(page.getByTestId('species-gallery')).toHaveCount(0);
  });
});
