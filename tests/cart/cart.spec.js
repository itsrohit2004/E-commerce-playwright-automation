const { test, expect } = require('@playwright/test');
const {
  getTestCredentials,
  products,
  shopUrl,
} = require('../data/shop-data');
const {
  addProduct,
  openCartWithProducts,
} = require('../pages/cart.page');
const { LoginPage } = require('../pages/login.page');

function cartRow(page, productName) {
  return page.locator('.cart-item-row').filter({ hasText: productName });
}

function money(text) {
  return Number(text.replace(/[^\d.-]/g, ''));
}

async function getUnitPrice(row) {
  return money(await row.locator('.product-unit-price').innerText());
}

async function getSubtotal(page) {
  const subtotalRow = page.getByRole('row', { name: /Sub-Total:/ });
  return money(await subtotalRow.getByRole('cell').nth(1).innerText());
}

async function login(page) {
  const { email, password } = getTestCredentials();

  test.skip(
    !email || !password,
    'Set LOGIN_EMAIL and LOGIN_PASSWORD for saved-cart tests.'
  );

  await new LoginPage(page).login(email, password);
}

test.describe('Cart module', () => {
  test.beforeEach(async ({ page }) => {
    await openCartWithProducts(page);
  });

  test('TC_CM001 updates the subtotal when quantity changes', async ({
    page,
  }) => {
    const row = cartRow(page, products.smartphone.name);
    const unitPrice = await getUnitPrice(row);

    await row.locator('.qty-input').fill('10');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(row.locator('.qty-input')).toHaveValue('10');
    await expect(row.locator('.product-subtotal')).toHaveText(
      (unitPrice * 10).toFixed(2)
    );
    expect(await getSubtotal(page)).toBe(unitPrice * 10);
  });

  test('TC_CM002 removes an item when its quantity is negative', async ({
    page,
  }) => {
    await cartRow(page, products.smartphone.name).locator('.qty-input').fill('-5');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('.order-summary-content')).toContainText(
      'Your Shopping Cart is empty'
    );
  });

  test('TC_CM003 removes an item when its quantity is zero', async ({
    page,
  }) => {
    await cartRow(page, products.smartphone.name).locator('.qty-input').fill('0');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('.order-summary-content')).toContainText(
      'Your Shopping Cart is empty'
    );
  });

  test('TC_CM004 resets a special-character quantity to one', async ({
    page,
  }) => {
    const quantity = cartRow(page, products.smartphone.name).locator('.qty-input');
    await quantity.fill('@*&');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(quantity).toHaveValue('1');
  });

  test('TC_CM005 resets an empty quantity to one', async ({ page }) => {
    const quantity = cartRow(page, products.smartphone.name).locator('.qty-input');
    await quantity.fill('');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(quantity).toHaveValue('1');
  });

  test('TC_CM006 allows multiple products in the cart', async ({ page }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    await expect(cartRow(page, products.smartphone.name)).toHaveCount(1);
    await expect(cartRow(page, products.book.name)).toHaveCount(1);
  });

  test('TC_CM007 keeps the quantity of each product in the cart', async ({
    page,
  }) => {
    await addProduct(page, products.phoneCover, 20);
    await page.goto(`${shopUrl}/cart`);

    await expect(
      cartRow(page, products.smartphone.name).locator('.qty-input')
    ).toHaveValue('1');
    await expect(
      cartRow(page, products.phoneCover.name).locator('.qty-input')
    ).toHaveValue('20');
  });

  test('TC_CM008 updates the subtotal for multiple products', async ({
    page,
  }) => {
    await addProduct(page, products.phoneCover, 20);
    await page.goto(`${shopUrl}/cart`);

    const smartphoneRow = cartRow(page, products.smartphone.name);
    const phoneCoverRow = cartRow(page, products.phoneCover.name);
    const smartphonePrice = await getUnitPrice(smartphoneRow);
    const coverPrice = await getUnitPrice(phoneCoverRow);

    await smartphoneRow.locator('.qty-input').fill('10');
    await phoneCoverRow.locator('.qty-input').fill('20');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(smartphoneRow.locator('.product-subtotal')).toHaveText(
      (smartphonePrice * 10).toFixed(2)
    );
    await expect(phoneCoverRow.locator('.product-subtotal')).toHaveText(
      (coverPrice * 20).toFixed(2)
    );
    expect(await getSubtotal(page)).toBe(
      smartphonePrice * 10 + coverPrice * 20
    );
  });

  test('TC_CM009 returns to the store when Continue shopping is clicked', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Continue shopping' }).click();

    await expect(page).toHaveURL(`${shopUrl}/`);
  });

  test('TC_CM010 updates the subtotal after an item quantity change', async ({
    page,
  }) => {
    const row = cartRow(page, products.smartphone.name);
    const unitPrice = await getUnitPrice(row);

    await row.locator('.qty-input').fill('25');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(row.locator('.product-subtotal')).toHaveText(
      (unitPrice * 25).toFixed(2)
    );
    expect(await getSubtotal(page)).toBe(unitPrice * 25);
  });

  test('TC_CM011 removes a selected item from the cart', async ({ page }) => {
    await cartRow(page, products.smartphone.name)
      .locator('input[name="removefromcart"]')
      .check();
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('.order-summary-content')).toContainText(
      'Your Shopping Cart is empty'
    );
  });

  test('TC_CM012 shows Edit for a configurable product', async ({ page }) => {
    await addProduct(page, products.phoneCover);
    await page.goto(`${shopUrl}/cart`);

    await expect(
      cartRow(page, products.phoneCover.name).getByRole('link', {
        name: 'Edit',
        exact: true,
      })
    ).toBeVisible();
  });

  test('TC_CM013 removes multiple selected products', async ({ page }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    await cartRow(page, products.smartphone.name)
      .locator('input[name="removefromcart"]')
      .check();
    await cartRow(page, products.book.name)
      .locator('input[name="removefromcart"]')
      .check();
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('.order-summary-content')).toContainText(
      'Your Shopping Cart is empty'
    );
  });

  test('TC_CM014 decreases the cart item count after removal', async ({
    page,
  }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);
    await expect(page.locator('#topcartlink .cart-qty')).toHaveText('(2)');

    await cartRow(page, products.smartphone.name)
      .locator('input[name="removefromcart"]')
      .check();
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('#topcartlink .cart-qty')).toHaveText('(1)');
  });

  test('TC_CM015 displays a separate subtotal for each cart item', async ({
    page,
  }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    await expect(
      cartRow(page, products.smartphone.name).locator('.product-subtotal')
    ).toHaveText('100.00');
    await expect(
      cartRow(page, products.book.name).locator('.product-subtotal')
    ).toHaveText('10.00');
  });

  test('TC_CM016 updates a product line total when its quantity changes', async ({
    page,
  }) => {
    const row = cartRow(page, products.smartphone.name);
    const unitPrice = await getUnitPrice(row);

    await row.locator('.qty-input').fill('20');
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(row.locator('.product-subtotal')).toHaveText(
      (unitPrice * 20).toFixed(2)
    );
  });

  test('TC_CM017 opens the corresponding product details page from the cart', async ({
    page,
  }) => {
    await cartRow(page, products.smartphone.name)
      .getByRole('link', { name: products.smartphone.name, exact: true })
      .click();

    await expect(page).toHaveURL(/\/smartphone$/);
    await expect(
      page.getByRole('heading', { name: products.smartphone.name, exact: true })
    ).toBeVisible();
  });

  test('TC_CM018 rejects an invalid discount coupon', async ({ page }) => {
    await page.locator('.discount-coupon-code').fill('101');
    await page.getByRole('button', { name: 'Apply coupon' }).click();

    await expect(page.locator('.coupon-box .message')).toContainText(
      "The coupon code you entered couldn't be applied to your order"
    );
  });

  test('TC_CM019 rejects an invalid gift card code', async ({ page }) => {
    await page.locator('.gift-card-coupon-code').fill('101');
    await page.getByRole('button', { name: 'Add gift card' }).click();

    await expect(page.locator('.giftcard-box .message')).toContainText(
      "The coupon code you entered couldn't be applied to your order"
    );
  });

  test('TC_CM020 removes every item and displays the empty-cart message', async ({
    page,
  }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    const removeCheckboxes = page.locator('input[name="removefromcart"]');
    for (let index = 0; index < await removeCheckboxes.count(); index += 1) {
      await removeCheckboxes.nth(index).check();
    }
    await page.getByRole('button', { name: 'Update shopping cart' }).click();

    await expect(page.locator('.order-summary-content')).toContainText(
      'Your Shopping Cart is empty'
    );
  });

  test('TC_CM021 displays the cart page layout and checkout summary', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Shopping cart', exact: true })
    ).toBeVisible();
    for (const heading of ['Product(s)', 'Price', 'Qty.', 'Total']) {
      await expect(page.locator('.cart')).toContainText(heading);
    }
    await expect(page.getByText('Discount Code', { exact: true })).toBeVisible();
    await expect(page.locator('.giftcard-box .title strong')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible();
  });

  test('TC_CM022 displays the name for every product', async ({ page }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    await expect(cartRow(page, products.smartphone.name)).toContainText(
      products.smartphone.name
    );
    await expect(cartRow(page, products.book.name)).toContainText(
      products.book.name
    );
  });

  test('TC_CM023 displays the price for every product', async ({ page }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    await expect(
      cartRow(page, products.smartphone.name).locator('.product-unit-price')
    ).toHaveText('100.00');
    await expect(
      cartRow(page, products.book.name).locator('.product-unit-price')
    ).toHaveText('10.00');
  });

  test('TC_CM024 displays the image for every product', async ({ page }) => {
    await addProduct(page, products.book);
    await page.goto(`${shopUrl}/cart`);

    for (const name of [products.smartphone.name, products.book.name]) {
      const image = cartRow(page, name).getByRole('img');
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate(element => element.naturalWidth))
        .toBeGreaterThan(0);
    }
  });

  test('TC_CM025 proceeds to checkout when terms are accepted', async ({
    page,
  }) => {
    await page.locator('#termsofservice').check();
    await page.getByRole('button', { name: 'Checkout' }).click();

    await expect(page).toHaveURL(/\/login\/checkoutasguest/);
  });

  test('TC_CM026 blocks checkout when terms are not accepted', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Checkout' }).click();

    await expect(
      page.getByText(
        'Please accept the terms of service before the next step.',
        { exact: true }
      )
    ).toBeVisible();
    await expect(page).toHaveURL(/\/cart/);
  });

  test('TC_CM027 supports tab navigation through cart controls', async ({
    page,
  }) => {
    await page.locator('.qty-input').focus();
    await page.keyboard.press('Tab');

    await expect(
      page.getByRole('button', { name: 'Update shopping cart' })
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Continue shopping' })
    ).toBeFocused();
  });

  test('TC_CM028 displays the invalid discount-code error', async ({ page }) => {
    await page.locator('.discount-coupon-code').fill('101');
    await page.getByRole('button', { name: 'Apply coupon' }).click();

    await expect(page.locator('.coupon-box .message')).toContainText(
      "The coupon code you entered couldn't be applied to your order"
    );
  });

  test('TC_CM029 displays the invalid gift-card error', async ({ page }) => {
    await page.locator('.gift-card-coupon-code').fill('101');
    await page.getByRole('button', { name: 'Add gift card' }).click();

    await expect(page.locator('.giftcard-box .message')).toContainText(
      "The coupon code you entered couldn't be applied to your order"
    );
  });

  test('TC_CM031 loads the cart page from its direct URL', async ({ page }) => {
    const response = await page.goto(`${shopUrl}/cart`);

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Shopping cart', exact: true })
    ).toBeVisible();
  });

  test('TC_CM032 loads the cart page in the active browser project', async ({
    page,
  }) => {
    const response = await page.goto(`${shopUrl}/cart`);

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Shopping cart', exact: true })
    ).toBeVisible();
  });
});

test('TC_CM030 restores the cart after logging back in', async ({ page }) => {
  await login(page);
  await addProduct(page, products.smartphone);

  await page.getByRole('link', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();

  await login(page);
  await page.goto(`${shopUrl}/cart`);

  await expect(cartRow(page, products.smartphone.name)).toHaveCount(1);
});
