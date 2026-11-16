const { test, expect } = require('@playwright/test');

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/');
  });

  test('shows the store logo and product search', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: 'Tricentis Demo Web Shop' })
    ).toBeVisible();
    await expect(page.locator('#small-searchterms')).toBeVisible();
  });

  test('search returns matching products', async ({ page }) => {
    await page.locator('#small-searchterms').fill('computer');
    await page.locator('#small-searchterms').press('Enter');

    await expect(page).toHaveURL(/search\?q=computer/i);
    await expect(page.locator('.product-item').first()).toBeVisible();
  });
});