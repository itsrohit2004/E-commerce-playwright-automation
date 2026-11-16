const { test, expect } = require('@playwright/test');

test('shows an empty message when the cart has no items', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/cart');

  await expect(page.locator('.order-summary-content')).toContainText(
    'Your Shopping Cart is empty'
  );
});

test('adds Computing and Internet to the shopping cart', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/books');

  const product = page.locator('.product-item').filter({
    has: page.getByRole('link', {
      name: 'Computing and Internet',
      exact: true,
    }),
  });
  await expect(product).toHaveCount(1);

  await product.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.locator('.bar-notification')).toContainText(
    'added to your shopping cart'
  );

  await page.getByRole('link', { name: 'Shopping cart', exact: true }).click();
  await expect(page).toHaveURL(/cart/i);
  await expect(page.locator('.cart')).toContainText('Computing and Internet');
});

test('updates the quantity of a cart item', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/computing-and-internet');

  await page.locator('#add-to-cart-button-13').click();
  await expect(page.locator('.bar-notification')).toContainText(
    'added to your shopping cart'
  );

  await page.getByRole('link', { name: 'Shopping cart', exact: true }).click();

  const cartItem = page
    .locator('.cart-item-row')
    .filter({ hasText: 'Computing and Internet' });

  const unitPriceText = await cartItem.locator('.product-unit-price').innerText();
  const unitPrice = Number(unitPriceText.replace(/[^\d.]/g, ''));
  const quantity = cartItem.locator('.qty-input');
  await quantity.fill('2');

  await page.getByRole('button', { name: 'Update shopping cart' }).click();
  await expect(quantity).toHaveValue('2');
  await expect(cartItem.locator('.product-subtotal')).toHaveText(
    (unitPrice * 2).toFixed(2)
  );
});

test('removes an item from the cart', async ({ page }) => {
  await page.goto('https://demowebshop.tricentis.com/computing-and-internet');

  await page.locator('#add-to-cart-button-13').click();

  await expect(page.locator('.bar-notification')).toContainText(
    'added to your shopping cart'
  );

  await page.getByRole('link', { name: 'Shopping cart', exact: true }).click();

  const cartItem = page
    .locator('.cart-item-row')
    .filter({ hasText: 'Computing and Internet' });

  await cartItem.locator('input[name="removefromcart"]').check();

  await page.getByRole('button', { name: 'Update shopping cart' }).click();

  await expect(page.locator('.order-summary-content')).toContainText(
    'Your Shopping Cart is empty'
  );
});