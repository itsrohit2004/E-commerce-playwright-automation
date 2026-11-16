const { test, expect } = require('@playwright/test');
const {
  getTestCredentials,
  products,
  shopUrl,
} = require('../data/shop-data');
const { addProduct, openCart } = require('../pages/cart.page');
const { LoginPage } = require('../pages/login.page');

async function startGuestCheckout(page) {
  await addProduct(page, products.book);
  await openCart(page);
  await page.locator('#termsofservice').check();
  await page.getByRole('button', { name: 'Checkout', exact: true }).click();
  await page.getByRole('button', { name: 'Checkout as Guest' }).click();
  await expect(page).toHaveURL(/\/onepagecheckout/);
  await expect(
    page.getByRole('heading', { name: 'Billing address' })
  ).toBeVisible();
}

async function startRegisteredCheckout(page) {
  const { email, password } = getTestCredentials();

  test.skip(
    !email || !password,
    'Set LOGIN_EMAIL and LOGIN_PASSWORD for saved-address checkout tests.'
  );

  await new LoginPage(page).login(email, password);

  await addProduct(page, products.book);
  await openCart(page);
  await page.locator('#termsofservice').check();
  await page.getByRole('button', { name: 'Checkout', exact: true }).click();
  await expect(page).toHaveURL(/\/onepagecheckout/);
}

async function savedAddresses(page, selector) {
  const dropdown = page.locator(selector);
  test.skip(
    (await dropdown.count()) === 0,
    `No saved-address selector found: ${selector}`
  );

  const options = await dropdown.locator('option').evaluateAll(items =>
    items.map(option => ({
      label: option.textContent.trim(),
      value: option.value,
    }))
  );
  const saved = options.filter(
    option => option.label && !/new address|select address/i.test(option.label)
  );

  test.skip(saved.length === 0, 'The test account has no saved addresses.');
  return { dropdown, saved };
}

async function fillBillingAddress(page, overrides = {}) {
  const address = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `checkout-${Date.now()}@example.invalid`,
    country: 'India',
    city: 'Kollam',
    address: 'Street 101, Chinnakada',
    postalCode: '478191',
    phone: '8712009867',
    ...overrides,
  };

  await page.locator('#BillingNewAddress_FirstName').fill(address.firstName);
  await page.locator('#BillingNewAddress_LastName').fill(address.lastName);
  await page.locator('#BillingNewAddress_Email').fill(address.email);
  await page
    .locator('#BillingNewAddress_CountryId')
    .selectOption({ label: address.country });
  await page.locator('#BillingNewAddress_City').fill(address.city);
  await page.locator('#BillingNewAddress_Address1').fill(address.address);
  await page
    .locator('#BillingNewAddress_ZipPostalCode')
    .fill(address.postalCode);
  await page.locator('#BillingNewAddress_PhoneNumber').fill(address.phone);
}

async function continueBilling(page) {
  await page.locator('#billing-buttons-container input').click();
}

async function continueToPaymentMethod(page) {
  await fillBillingAddress(page);
  await continueBilling(page);
  await page.locator('#shipping-buttons-container input').click();

  const shippingOptions = page.locator(
    '#checkout-step-shipping-method input[type="radio"]'
  );
  await shippingOptions.first().check();
  await page.locator('#shipping-method-buttons-container input').click();
}

async function choosePaymentMethod(page, method) {
  await page.getByRole('radio', { name: method }).check();
  await page.locator('#payment-method-buttons-container input').click();
}

test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await startGuestCheckout(page);
  });

  test('TC_COM004 shows required markers for billing fields', async ({
    page,
  }) => {
    const requiredMarkers = page.locator(
      '#billing-new-address-form .required'
    );

    await expect(requiredMarkers).toHaveCount(8);
  });

  test('TC_COM003, TC_COM005 and TC_COM012 through TC_COM017 validate empty billing fields', async ({
    page,
  }) => {
    await continueBilling(page);

    for (const field of [
      'BillingNewAddress.FirstName',
      'BillingNewAddress.LastName',
      'BillingNewAddress.Email',
      'BillingNewAddress.CountryId',
      'BillingNewAddress.City',
      'BillingNewAddress.Address1',
      'BillingNewAddress.ZipPostalCode',
      'BillingNewAddress.PhoneNumber',
    ]) {
      await expect(
        page.locator(`[data-valmsg-for="${field}"]`)
      ).toContainText(/required/i);
    }

    await expect(
      page.locator('#shipping-buttons-container input')
    ).toBeHidden();
  });

  test('TC_COM001 continues to shipping with valid billing details', async ({
    page,
  }) => {
    await fillBillingAddress(page);
    await continueBilling(page);

    await expect(
      page.getByRole('heading', { name: 'Shipping address' })
    ).toBeVisible();
  });

  test('TC_COM002 blocks an invalid billing address', async ({ page }) => {
    await fillBillingAddress(page, {
      firstName: '@@',
      lastName: '***',
      email: 'rohit001.com',
      city: '12@@',
      address: '#%$',
      postalCode: '*&',
      phone: '^%$&',
    });
    await continueBilling(page);

    await expect(
      page.locator('[data-valmsg-for="BillingNewAddress.Email"]')
    ).toContainText('Wrong email');
    await expect(
      page.locator('#shipping-buttons-container input')
    ).toBeHidden();
  });

  test('TC_COM019 allows one country selection at a time', async ({ page }) => {
    const country = page.locator('#BillingNewAddress_CountryId');

    await country.selectOption({ label: 'India' });
    await expect(country).toHaveValue(/\d+/);
    await country.selectOption({ label: 'Canada' });
    await expect(country).toHaveValue(/\d+/);
    await expect(country).not.toHaveAttribute('multiple', '');
  });

  for (const { id, field, value, errorField, message } of [
    {
      id: 'TC_COM006',
      field: 'firstName',
      value: '@@$',
      errorField: 'BillingNewAddress.FirstName',
      message: 'Enter valid first name',
    },
    {
      id: 'TC_COM007',
      field: 'lastName',
      value: '@#!',
      errorField: 'BillingNewAddress.LastName',
      message: 'Enter valid last name',
    },
    {
      id: 'TC_COM008',
      field: 'email',
      value: 'rohit001.com',
      errorField: 'BillingNewAddress.Email',
      message: 'Wrong email',
    },
    {
      id: 'TC_COM009',
      field: 'phone',
      value: '%^$&#',
      errorField: 'BillingNewAddress.PhoneNumber',
      message: 'Enter valid phone number',
    },
    {
      id: 'TC_COM010',
      field: 'city',
      value: '@#!%',
      errorField: 'BillingNewAddress.City',
      message: 'Enter valid city',
    },
    {
      id: 'TC_COM011',
      field: 'postalCode',
      value: '@#*&',
      errorField: 'BillingNewAddress.ZipPostalCode',
      message: 'Enter valid postal code',
    },
  ]) {
    test(`${id} rejects an invalid billing ${field}`, async ({ page }) => {
      await fillBillingAddress(page, { [field]: value });
      await continueBilling(page);

      await expect(
        page.locator(`[data-valmsg-for="${errorField}"]`)
      ).toContainText(message);
      await expect(
        page.locator('#shipping-buttons-container input')
      ).toBeHidden();
    });
  }

  test('TC_COM023, TC_COM024 and TC_COM027 skip shipping and allow one payment method', async ({
    page,
  }) => {
    await fillBillingAddress(page);
    await continueBilling(page);

    await page.getByLabel('In-Store Pickup').check();
    await page.locator('#shipping-buttons-container input').click();
    await expect(
      page.getByRole('heading', { name: 'Payment method' })
    ).toBeVisible();

    const paymentOptions = page.locator(
      '#checkout-step-payment-method input[type="radio"]'
    );
    await expect(paymentOptions).toHaveCount(4);
    await paymentOptions.nth(1).check();
    await expect(paymentOptions.nth(1)).toBeChecked();
    await expect(paymentOptions.nth(0)).not.toBeChecked();

    await page.locator('#payment-method-buttons-container input').click();
    await expect(
      page.getByRole('heading', { name: 'Payment information' })
    ).toBeVisible();
    await expect(
      page.locator('#checkout-step-payment-info')
    ).toContainText(/cash|money order|payment/i);
  });

  test('TC_COM025 and TC_COM026 show shipping options and allow only one selection', async ({
    page,
  }) => {
    await fillBillingAddress(page);
    await continueBilling(page);
    await page.locator('#shipping-buttons-container input').click();

    await expect(
      page.getByRole('heading', { name: 'Shipping method' })
    ).toBeVisible();
    const shippingOptions = page.locator(
      '#checkout-step-shipping-method input[type="radio"]'
    );
    await expect(shippingOptions).toHaveCount(3);
    await shippingOptions.nth(1).check();
    await expect(shippingOptions.nth(1)).toBeChecked();
    await expect(shippingOptions.nth(0)).not.toBeChecked();
  });

  for (const { id, method, information } of [
    {
      id: 'TC_COM028',
      method: /cash on delivery/i,
      information: /COD|cash on delivery/i,
    },
    {
      id: 'TC_COM029',
      method: /check.*money order/i,
      information: /check|money order/i,
    },
  ]) {
    test(`${id} shows payment information for the selected method`, async ({
      page,
    }) => {
      await continueToPaymentMethod(page);
      await choosePaymentMethod(page, method);

      await expect(
        page.locator('#checkout-step-payment-info')
      ).toContainText(information);
    });
  }

  test('TC_COM030 and TC_COM031 request a purchase order number and accept a valid value', async ({
    page,
  }) => {
    await continueToPaymentMethod(page);
    await choosePaymentMethod(page, /purchase order/i);
    await expect(page.locator('#PurchaseOrderNumber')).toBeVisible();

    await page.locator('#PurchaseOrderNumber').fill('674891');
    await page.locator('#payment-info-buttons-container input').click();
    await expect(
      page.getByRole('heading', { name: 'Confirm order' })
    ).toBeVisible();
  });

  for (const { id, value, message } of [
    {
      id: 'TC_COM032',
      value: '@#$!',
      message: /valid.*purchase order|purchase order.*valid/i,
    },
    {
      id: 'TC_COM033',
      value: '',
      message: /purchase order number is required|po number is required/i,
    },
    {
      id: 'TC_COM034',
      value: '      ',
      message: /purchase order number is required|po number is required/i,
    },
  ]) {
    test(`${id} rejects purchase order number "${value || '(empty)'}"`, async ({
      page,
    }) => {
      await continueToPaymentMethod(page);
      await choosePaymentMethod(page, /purchase order/i);
      const purchaseOrderNumber = page.locator('#PurchaseOrderNumber');
      const continueButton = page.locator(
        '#payment-info-buttons-container input'
      );
      if (value) {
        await purchaseOrderNumber.fill(value);
      }

      await continueButton.click();
      await expect(
        page.locator('#checkout-step-payment-info')
      ).toContainText(message);
      await expect(
        page.locator('#confirm-order-buttons-container input')
      ).toBeHidden();
    });
  }

  test('TC_COM035 shows required credit card fields', async ({ page }) => {
    await continueToPaymentMethod(page);
    await choosePaymentMethod(page, /credit card/i);

    for (const field of [
      '#CreditCardType',
      '#CardholderName',
      '#CardNumber',
      '#ExpireMonth',
      '#ExpireYear',
      '#CardCode',
    ]) {
      await expect(page.locator(field)).toBeVisible();
    }
  });

  test('TC_COM038 and TC_COM039 show errors for empty credit card fields', async ({
    page,
  }) => {
    await continueToPaymentMethod(page);
    await choosePaymentMethod(page, /credit card/i);
    await page.locator('#payment-info-buttons-container input').click();

    const paymentInfo = page.locator('#checkout-step-payment-info');
    await expect(paymentInfo).toContainText('Enter cardholder name');
    await expect(paymentInfo).toContainText('Wrong card number');
    await expect(paymentInfo).toContainText('Wrong card code');
    await expect(
      page.locator('#confirm-order-buttons-container input')
    ).toBeHidden();
  });

  test('TC_COM036 accepts valid credit card details and continues to confirm order', async ({
    page,
  }) => {
    await continueToPaymentMethod(page);
    await choosePaymentMethod(page, /credit card/i);

    await page.locator('#CreditCardType').selectOption({ label: 'Visa' });
    await page.locator('#CardholderName').fill('John Customer');
    await page.locator('#CardNumber').fill('4111111111111111');
    await page.locator('#ExpireMonth').selectOption('1');
    await page.locator('#ExpireYear').selectOption('2028');
    await page.locator('#CardCode').fill('1234');
    await page.locator('#payment-info-buttons-container input').click();

    await expect(
      page.getByRole('heading', { name: 'Confirm order' })
    ).toBeVisible();
  });

  for (const { id, field, value, message } of [
    {
      id: 'TC_COM041',
      field: '#CardNumber',
      value: '7812367',
      message: /wrong card number/i,
    },
    {
      id: 'TC_COM042',
      field: '#CardCode',
      value: '%^$',
      message: /wrong card code/i,
    },
  ]) {
    test(`${id} rejects invalid credit card details`, async ({ page }) => {
      await continueToPaymentMethod(page);
      await choosePaymentMethod(page, /credit card/i);
      await page.locator('#CreditCardType').selectOption({ label: 'Visa' });
      await page.locator('#CardholderName').fill('John Customer');
      await page.locator('#CardNumber').fill('4111111111111111');
      await page.locator('#ExpireMonth').selectOption('1');
      await page.locator('#ExpireYear').selectOption('2028');
      await page.locator('#CardCode').fill('1234');
      await page.locator(field).fill(value);
      await page.locator('#payment-info-buttons-container input').click();

      await expect(
        page.locator('#checkout-step-payment-info')
      ).toContainText(message);
    });
  }

  test('TC_COM040 rejects an invalid cardholder name', async ({ page }) => {
    await continueToPaymentMethod(page);
    await choosePaymentMethod(page, /credit card/i);
    await page.locator('#CreditCardType').selectOption({ label: 'Visa' });
    await page.locator('#CardholderName').fill('98*&');
    await page.locator('#CardNumber').fill('4111111111111111');
    await page.locator('#ExpireMonth').selectOption('1');
    await page.locator('#ExpireYear').selectOption('2028');
    await page.locator('#CardCode').fill('1234');
    await page.locator('#payment-info-buttons-container input').click();

    await expect(
      page.locator('[data-valmsg-for="CardholderName"]')
    ).toContainText(/wrong cardholder name/i);
    await expect(
      page.locator('#confirm-order-buttons-container input')
    ).toBeHidden();
  });

  test('TC_COM043, TC_COM044 and TC_COM045 confirm an order and show its number', async ({
    page,
  }) => {
    await fillBillingAddress(page);
    await continueBilling(page);

    await page.locator('#shipping-buttons-container input').click();
    const shippingOptions = page.locator(
      '#checkout-step-shipping-method input[type="radio"]'
    );
    await shippingOptions.first().check();
    await page.locator('#shipping-method-buttons-container input').click();

    await page
      .getByRole('radio', { name: /cash on delivery/i })
      .check();
    await page.locator('#payment-method-buttons-container input').click();
    await page.locator('#payment-info-buttons-container input').click();

    await expect(
      page.getByRole('heading', { name: 'Confirm order' })
    ).toBeVisible();
    await expect(page.locator('#checkout-step-confirm-order')).toContainText(
      'Computing and Internet'
    );

    await page.locator('#confirm-order-buttons-container input').click();
    await expect(page.locator('.order-completed')).toContainText(
      'Your order has been successfully processed!'
    );
    await expect(page.getByText(/Order number:\s*\d+/)).toBeVisible();
  });
});

test.describe('Registered-customer checkout', () => {
  test('TC_COM018 continues with an existing billing address', async ({
    page,
  }) => {
    await startRegisteredCheckout(page);
    const billing = await savedAddresses(page, '#billing-address-select');

    await billing.dropdown.selectOption(billing.saved[0].value);
    await continueBilling(page);

    await expect(
      page.locator('#shipping-buttons-container input')
    ).toBeVisible();
  });

  test('TC_COM020 continues with an existing shipping address', async ({
    page,
  }) => {
    await startRegisteredCheckout(page);
    const billing = await savedAddresses(page, '#billing-address-select');

    await billing.dropdown.selectOption(billing.saved[0].value);
    await continueBilling(page);

    const shipping = await savedAddresses(page, '#shipping-address-select');
    await shipping.dropdown.selectOption(shipping.saved[0].value);
    await page.locator('#shipping-buttons-container input').click();

    await expect(
      page.locator('#shipping-method-buttons-container input')
    ).toBeVisible();
  });

  test('TC_COM021 continues with the same billing and shipping address', async ({
    page,
  }) => {
    await startRegisteredCheckout(page);
    const billing = await savedAddresses(page, '#billing-address-select');
    await billing.dropdown.selectOption(billing.saved[0].value);
    await continueBilling(page);

    const shipping = await savedAddresses(page, '#shipping-address-select');
    const sameAddress = shipping.saved.find(
      option => option.label === billing.saved[0].label
    );
    test.skip(!sameAddress, 'No matching billing address in the shipping list.');

    await shipping.dropdown.selectOption(sameAddress.value);
    await page.locator('#shipping-buttons-container input').click();

    await expect(
      page.locator('#shipping-method-buttons-container input')
    ).toBeVisible();
  });

  test('TC_COM022 continues with a different shipping address', async ({
    page,
  }) => {
    await startRegisteredCheckout(page);
    const billing = await savedAddresses(page, '#billing-address-select');
    await billing.dropdown.selectOption(billing.saved[0].value);
    await continueBilling(page);

    const shipping = await savedAddresses(page, '#shipping-address-select');
    const differentAddress = shipping.saved.find(
      option => option.label !== billing.saved[0].label
    );
    test.skip(
      !differentAddress,
      'The test account needs a second saved address for this case.'
    );

    await shipping.dropdown.selectOption(differentAddress.value);
    await page.locator('#shipping-buttons-container input').click();

    await expect(
      page.locator('#shipping-method-buttons-container input')
    ).toBeVisible();
  });
});

test('TC_COM037 rejects combined invalid credit-card details', async ({
  page,
}) => {
  await startGuestCheckout(page);
  await continueToPaymentMethod(page);
  await choosePaymentMethod(page, /credit card/i);

  await page.locator('#CreditCardType').selectOption({ label: 'Visa' });
  await page.locator('#CardholderName').fill('@@!');
  await page.locator('#CardNumber').fill('#$%@');
  await page.locator('#ExpireMonth').selectOption('1');
  await page.locator('#ExpireYear').selectOption('2028');
  await page.locator('#CardCode').fill('@#$%');
  await page.locator('#payment-info-buttons-container input').click();

  const paymentInfo = page.locator('#checkout-step-payment-info');
  await expect(paymentInfo).toContainText(/wrong cardholder name/i);
  await expect(paymentInfo).toContainText(/wrong card number/i);
  await expect(paymentInfo).toContainText(/wrong card code/i);
  await expect(
    page.locator('#confirm-order-buttons-container input')
  ).toBeHidden();
});
