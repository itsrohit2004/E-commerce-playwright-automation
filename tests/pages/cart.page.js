const { expect } = require('@playwright/test');
const { products, shopUrl } = require('../data/shop-data');

async function addCurrentProductToCart(page, product, quantity = 1) {
  await page.locator(product.quantitySelector).fill(String(quantity));
  await page.locator(product.addButton).click();
}

async function addProduct(page, product, quantity = 1) {
  await page.goto(product.url);
  await addCurrentProductToCart(page, product, quantity);
  await expect(page.locator('.bar-notification')).toContainText(
    'added to your shopping cart'
  );
}

async function openCart(page) {
  await page.goto(`${shopUrl}/cart`);
}

async function openCartWithProducts(
  page,
  cartProducts = [{ product: products.smartphone }]
) {
  for (const { product, quantity } of cartProducts) {
    await addProduct(page, product, quantity ?? 1);
  }

  await openCart(page);
  if (cartProducts.length > 0) {
    await expect(page.locator('.cart-item-row').first()).toBeVisible();
  }
}

module.exports = {
  addCurrentProductToCart,
  addProduct,
  openCart,
  openCartWithProducts,
};
