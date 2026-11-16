const { test, expect } = require('@playwright/test');

test.describe('Product listing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/books');
  });

  test('shows the Books heading and available products', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Books', exact: true })
    ).toBeVisible();
    await expect(page.locator('.product-item').first()).toBeVisible();
  });

  test('opens a product from the listing', async ({ page }) => {
    const productLink = page.locator('.product-item .product-title a').first();
    const productName = (await productLink.innerText()).trim();

    await productLink.click();

    await expect(
      page.getByRole('heading', { name: productName, exact: true })
    ).toBeVisible();
  });

  test('sorts books by price from low to high', async ({ page }) => {
    await Promise.all([
      page.waitForNavigation(),
      page.locator('#products-orderby').selectOption({ label: 'Price: Low to High' }),
    ]);

    const displayedPrices = await page.locator('.product-item .actual-price').allTextContents();
    const prices = displayedPrices.map(price => Number(price.trim()));
    const sortedPrices = [...prices].sort((first, second) => first - second);

    expect(prices.length).toBeGreaterThan(0);
    expect(prices).toEqual(sortedPrices);
  });
});

test.describe('Product details page', () => {
  test('shows product information and purchase options', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/computing-and-internet');

    await expect(
      page.getByRole('heading', { name: 'Computing and Internet', exact: true })
    ).toBeVisible();
    await expect(page.locator('#add-to-cart-button-13')).toBeVisible();
  });
});
