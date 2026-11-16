const { test, expect } = require('@playwright/test');
const {
  getTestCredentials,
  products,
  shopUrl,
} = require('../data/shop-data');
const {
  addCurrentProductToCart,
  addProduct,
} = require('../pages/cart.page');
const { LoginPage } = require('../pages/login.page');

async function openSmartphone(page) {
  await page.goto(products.smartphone.url);
  await expect(
    page.getByRole('heading', {
      name: products.smartphone.name,
      exact: true,
    })
  ).toBeVisible();
}

async function addSmartphoneToCart(page, quantity) {
  await addCurrentProductToCart(page, products.smartphone, quantity);
}

async function openReviews(page) {
  await page.goto(`${shopUrl}/productreviews/${products.smartphone.id}`);
  await expect(
    page.getByRole('heading', {
      name: `Product reviews for ${products.smartphone.name}`,
    })
  ).toBeVisible();
}

async function signInRegisteredCustomer(page) {
  const { email, password } = getTestCredentials();

  test.skip(
    !email || !password,
    'Set LOGIN_EMAIL and LOGIN_PASSWORD for registered-customer product actions.'
  );

  await new LoginPage(page).login(email, password);
}

test.describe('Product Details module', () => {
  test.beforeEach(async ({ page }) => {
    await openSmartphone(page);
  });

  test('TC_PM001 displays the expected product name', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Smartphone', exact: true })
    ).toBeVisible();
  });

  test('TC_PM002 displays a loaded product image', async ({ page }) => {
    const image = page.getByRole('img', { name: 'Picture of Smartphone' });

    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate(element => element.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('TC_PM003 displays product availability', async ({ page }) => {
    await expect(page.locator('.stock')).toContainText('Availability: In stock');
  });

  test('TC_PM004 adds a positive quantity to the cart', async ({ page }) => {
    await addSmartphoneToCart(page, 10);

    await expect(page.locator('.bar-notification')).toContainText(
      'added to your shopping cart'
    );
    await page.goto(`${shopUrl}/cart`);
    await expect(
      page
        .locator('.cart-item-row')
        .filter({ hasText: products.smartphone.name })
    ).toHaveCount(1);
    await expect(
      page
        .locator('.cart-item-row')
        .filter({ hasText: products.smartphone.name })
        .locator('.qty-input')
    ).toHaveValue('10');
  });

  for (const { id, quantity } of [
    { id: 'TC_PM005', quantity: '-5' },
    { id: 'TC_PM006', quantity: '@@*' },
    { id: 'TC_PM007', quantity: 'hello' },
    { id: 'TC_PM008', quantity: '        ' },
  ]) {
    test(`${id} rejects quantity "${quantity.trim() || 'blank spaces'}"`, async ({
      page,
    }) => {
      await addSmartphoneToCart(page, quantity);

      await expect(
        page.getByText('Quantity should be positive', { exact: true })
      ).toBeVisible();
      await expect(page.locator('#topcartlink .cart-qty')).toHaveText('(0)');
    });
  }

  test('TC_PM009 displays the product rating', async ({ page }) => {
    await expect(page.locator('.product-essential .product-review-box')).toBeVisible();
    await expect(
      page.locator('.product-essential .product-review-box .rating > div')
    ).toHaveAttribute('style', /width:\s*\d+%/);
  });

  test('TC_PM010 displays manufacturer information when available', async ({
    page,
  }) => {
    const manufacturerBlock = page.locator('.block-manufacturer-navigation');

    await expect(manufacturerBlock).toBeVisible();
    await expect(manufacturerBlock).toContainText('Tricentis');
  });

  test('TC_PM011 displays the product price', async ({ page }) => {
    await expect(page.locator('.product-essential .product-price')).toHaveText(
      '100.00'
    );
  });

  test('TC_PM012 lets users view existing product reviews', async ({ page }) => {
    await page.getByRole('link', { name: /\d+ review\(s\)/ }).click();

    await expect(page).toHaveURL(/\/productreviews\/43/);
    await expect(page.locator('.product-review-item').first()).toBeVisible();
  });

  test('TC_PM013 accepts and submits a valid product review', async ({ page }) => {
    await signInRegisteredCustomer(page);
    await openSmartphone(page);
    await page.getByRole('link', { name: 'Add your review' }).click();
    await page.locator('#AddProductReview_Title').fill(
      `Playwright review ${Date.now()}`
    );
    await page
      .locator('#AddProductReview_ReviewText')
      .fill('Automated product details review.');
    await page.locator('#addproductrating_3').check();
    await page.locator('input[name="add-review"]').click();

    await expect(page.locator('.result')).toContainText(
      /review.*successfully added/i
    );
  });

  test('TC_PM014 displays the product description and features', async ({
    page,
  }) => {
    const description = page.locator('.product-essential .full-description');

    await expect(description).toContainText('Specs:');
    await expect(description).toContainText('Battery life 8h in power use');
    await expect(description).toContainText('LTE');
  });

  test('TC_PM015 displays product tags', async ({ page }) => {
    const tags = page.locator('.product-tags-box .producttag');

    await expect(tags).toHaveCount(3);
    await expect(tags).toContainText(['awesome', 'compact', 'cell']);
  });

  test('TC_PM016 displays related product recommendations', async ({
    page,
  }) => {
    const recommendations = page.locator(
      '.also-purchased-products-grid .product-item'
    );

    await expect(recommendations).toHaveCount(3);
    await expect(recommendations).toContainText([
      'Simple Computer',
      'Build your own expensive computer',
      'Blue and green Sneaker',
    ]);
  });

  test('TC_PM017 adds the product to the wishlist', async ({ page }) => {
    await page.locator('#add-to-wishlist-button-43').click();

    await expect(page.locator('.bar-notification')).toContainText(
      'added to your wishlist'
    );
  });

  test('TC_PM018 adds the product to the compare list', async ({ page }) => {
    await page.getByRole('button', { name: 'Add to compare list' }).click();

    await page.goto(`${shopUrl}/compareproducts`);
    await expect(
      page.getByRole('heading', { name: 'Compare products' })
    ).toBeVisible();
    await expect(page.locator('.compare-products-table')).toContainText(
      'Smartphone'
    );
  });

  test('TC_PM019 sends a product recommendation to a friend', async ({
    page,
  }) => {
    await signInRegisteredCustomer(page);
    await openSmartphone(page);
    await page.getByRole('button', { name: 'Email a friend' }).click();
    await expect(page).toHaveURL(/\/productemailafriend\/43/);

    await page.locator('#FriendEmail').fill('friend@example.invalid');
    await page.locator('#YourEmailAddress').fill('sender@example.invalid');
    await page.locator('#PersonalMessage').fill(
      'Please take a look at this product.'
    );
    await page.locator('input[name="send-email"]').click();

    await expect(page.locator('.result')).toContainText(
      /your message has been sent/i
    );
  });

  test('TC_PM020 marks the cheap desktop as free shipping', async ({ page }) => {
    await page.goto(`${shopUrl}/build-your-cheap-own-computer`);

    await expect(
      page.getByRole('heading', {
        name: 'Build your own cheap computer',
        exact: true,
      })
    ).toBeVisible();
    await expect(page.locator('.product-essential')).toContainText(
      'Free shipping'
    );
  });

  test('TC_PM021 does not offer add to cart for an out-of-stock product', async ({
    page,
  }) => {
    await page.goto(`${shopUrl}/copy-of-computing-and-internet`);

    await expect(page.locator('.stock')).toContainText('Out of stock');
    await expect(
      page.locator('.product-essential .add-to-cart-button')
    ).toHaveCount(0);
  });

  test('TC_PM022 offers size and color options for the sneaker', async ({
    page,
  }) => {
    await page.goto(`${shopUrl}/blue-and-green-sneaker`);

    await expect(page.locator('#product_attribute_28_7_10')).toBeVisible();
    await expect(
      page.locator('input[name="product_attribute_28_1_11"]')
    ).toHaveCount(3);
  });

  test('TC_PM023 adds the selected quantity to the cart', async ({ page }) => {
    await addSmartphoneToCart(page, 5);

    await expect(page.locator('.bar-notification')).toContainText(
      'added to your shopping cart'
    );
    await page.goto(`${shopUrl}/cart`);
    await expect(
      page
        .locator('.cart-item-row')
        .filter({ hasText: 'Smartphone' })
        .locator('.qty-input')
    ).toHaveValue('5');
  });

  test('TC_PM024 loads the product page from its direct URL', async ({
    page,
  }) => {
    const response = await page.goto(products.smartphone.url);

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Smartphone', exact: true })
    ).toBeVisible();
  });

  test('TC_PM025 supports keyboard tab navigation to purchase controls', async ({
    page,
  }) => {
    await page.locator(products.smartphone.quantitySelector).focus();
    await page.keyboard.press('Tab');

    await expect(page.locator(products.smartphone.addButton)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#add-to-wishlist-button-43')).toBeFocused();
  });

  test('TC_PM026 loads the product detail page in the active browser project', async ({
    page,
  }) => {
    const response = await page.goto(products.smartphone.url);

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Smartphone', exact: true })
    ).toBeVisible();
  });

  test('TC_PM027 adds two products with different quantities', async ({
    page,
  }) => {
    await addSmartphoneToCart(page, 5);
    await expect(page.locator('.bar-notification')).toContainText(
      'added to your shopping cart'
    );

    await addProduct(page, products.book, 7);

    await page.goto(`${shopUrl}/cart`);
    const smartphone = page
      .locator('.cart-item-row')
      .filter({ hasText: products.smartphone.name });
    const computingBook = page
      .locator('.cart-item-row')
      .filter({ hasText: products.book.name });

    await expect(smartphone.locator('.qty-input')).toHaveValue('5');
    await expect(computingBook.locator('.qty-input')).toHaveValue('7');
  });

  test('TC_PM028 updates the cart item count after adding multiple units', async ({
    page,
  }) => {
    await addSmartphoneToCart(page, 5);

    await expect(page.locator('#topcartlink .cart-qty')).toHaveText('(5)');
  });

  test('TC_PM029 requires a review title and review text', async ({ page }) => {
    await signInRegisteredCustomer(page);
    await openReviews(page);
    await page.locator('input[name="add-review"]').click();

    await expect(
      page.locator('[data-valmsg-for="AddProductReview.Title"]')
    ).toContainText(/required/i);
    await expect(
      page.locator('[data-valmsg-for="AddProductReview.ReviewText"]')
    ).toContainText(/required/i);
  });
});
