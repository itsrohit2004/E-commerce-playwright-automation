const { test, expect } = require('@playwright/test');

async function fillRegistrationForm(page, overrides = {}) {
  const values = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `playwright-${Date.now()}@example.invalid`,
    password: 'demo@123',
    ...overrides,
  };

  await page.locator('#FirstName').fill(values.firstName);
  await page.locator('#LastName').fill(values.lastName);
  await page.locator('#Email').fill(values.email);
  await page.locator('#gender-male').check();
  await page.locator('#Password').fill(values.password);
  await page.locator('#ConfirmPassword').fill(
    values.confirmPassword ?? values.password
  );
}

test.describe('Registration page validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');
  });

  test('shows required-field errors when submitted empty', async ({ page }) => {
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="FirstName"]')).toHaveText(
      'First name is required.'
    );
    await expect(page.locator('[data-valmsg-for="LastName"]')).toHaveText(
      'Last name is required.'
    );
    await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText(
      'Email is required.'
    );
    await expect(page.locator('[data-valmsg-for="Password"]')).toHaveText(
      'Password is required.'
    );
    await expect(page.locator('[data-valmsg-for="ConfirmPassword"]')).toHaveText(
      'Password is required.'
    );
  });

  for (const email of [
    'missing-at-sign',
    'user@',
    '@example.com',
    'user@example..com',
    'user name@example.com',
  ]) {
    test(`rejects malformed email "${email}"`, async ({ page }) => {
      await fillRegistrationForm(page, { email });
      await page.locator('#register-button').click();

      await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText(
        'Wrong email'
      );
    });
  }

  test('rejects a password shorter than the six-character minimum', async ({
    page,
  }) => {
    await fillRegistrationForm(page, {
      password: 'abc12',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="Password"]')).toContainText(
      'at least 6 characters'
    );
  });

  test('accepts a password at the six-character minimum', async ({
    page,
  }, testInfo) => {
    await fillRegistrationForm(page, {
      email: `playwright-min-password-${Date.now()}-${testInfo.workerIndex}@example.invalid`,
      password: 'abc123',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('.result')).toContainText(
      'Your registration completed'
    );
  });

  test('preserves entered values when confirmation passwords do not match', async ({
    page,
  }) => {
    const formValues = {
      firstName: 'Test',
      lastName: 'Mismatch',
      email: `playwright-mismatch-${Date.now()}@example.invalid`,
      password: 'demo@123',
      confirmPassword: 'different',
    };
    await fillRegistrationForm(page, formValues);
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="ConfirmPassword"]')).toContainText(
      'do not match'
    );
    await expect(page.locator('#FirstName')).toHaveValue(formValues.firstName);
    await expect(page.locator('#LastName')).toHaveValue(formValues.lastName);
    await expect(page.locator('#Email')).toHaveValue(formValues.email);
  });

  test('rejects a first name containing only a symbol', async ({ page }) => {
    await fillRegistrationForm(page, {
      firstName: '@',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="FirstName"]')).toContainText(
      /valid first name/i
    );
  });

  test('rejects a last name containing only a symbol', async ({ page }) => {
    await fillRegistrationForm(page, {
      lastName: '@',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="LastName"]')).toContainText(
      /valid last name/i
    );
  });
});

test.describe('Additional registration checks', () => {
  test('allows selecting only one gender option', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');

    const male = page.locator('#gender-male');
    const female = page.locator('#gender-female');

    await male.check();
    await expect(male).toBeChecked();

    await female.check();
    await expect(female).toBeChecked();
    await expect(male).not.toBeChecked();
  });

  test('masks both password fields', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');

    await expect(page.locator('#Password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#ConfirmPassword')).toHaveAttribute(
      'type',
      'password'
    );
  });

  test('opens registration from the home page', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/');

    await page.getByRole('link', { name: 'Register', exact: true }).click();

    await expect(page).toHaveURL(/\/register/i);
    await expect(
      page.getByRole('heading', { name: 'Register', exact: true })
    ).toBeVisible();
  });

  for (const { field, errorField, expectedError } of [
    {
      field: 'firstName',
      errorField: 'FirstName',
      expectedError: 'First name is required.',
    },
    {
      field: 'lastName',
      errorField: 'LastName',
      expectedError: 'Last name is required.',
    },
    {
      field: 'email',
      errorField: 'Email',
      expectedError: 'Email is required.',
    },
  ]) {
    test(`rejects whitespace-only ${field}`, async ({ page }) => {
      await page.goto('https://demowebshop.tricentis.com/register');
      await fillRegistrationForm(page, { [field]: '   ' });
      await page.locator('#register-button').click();

      await expect(
        page.locator(`[data-valmsg-for="${errorField}"]`)
      ).toHaveText(expectedError);
    });
  }

  test('allows registration without selecting a gender', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');
    await page.locator('#FirstName').fill('Test');
    await page.locator('#LastName').fill('Customer');
    await page.locator('#Email').fill(
      `playwright-no-gender-${Date.now()}@example.invalid`
    );
    await page.locator('#Password').fill('demo@123');
    await page.locator('#ConfirmPassword').fill('demo@123');
    // Intentionally leave both gender options unselected.
    await page.locator('#register-button').click();

    await expect(page.locator('.result')).toContainText(
      'Your registration completed'
    );
  });

  test('loads the registration page directly', async ({ page }) => {
    const response = await page.goto(
      'https://demowebshop.tricentis.com/register'
    );

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Register', exact: true })
    ).toBeVisible();
  });

  test('shows the expected registration form sections and fields', async ({
    page,
  }) => {
    await page.goto('https://demowebshop.tricentis.com/register');

    await expect(page.getByText('Your Personal Details')).toBeVisible();
    await expect(page.getByText('Your Password')).toBeVisible();
    await expect(page.getByText('First name:', { exact: false })).toBeVisible();
    await expect(page.getByText('Last name:', { exact: false })).toBeVisible();
    await expect(page.getByText('Email:', { exact: false })).toBeVisible();
    await expect(page.getByText('Confirm password:', { exact: false })).toBeVisible();
    await expect(page.locator('#gender-male')).toBeVisible();
    await expect(page.locator('#gender-female')).toBeVisible();
    await expect(page.locator('#FirstName')).toBeVisible();
    await expect(page.locator('#LastName')).toBeVisible();
    await expect(page.locator('#Email')).toBeVisible();
    await expect(page.locator('#Password')).toBeVisible();
    await expect(page.locator('#ConfirmPassword')).toBeVisible();
    await expect(page.locator('#register-button')).toBeVisible();
  });

  for (const { validField, values, missingFields } of [
    {
      validField: 'first name',
      values: {
        firstName: 'John',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
      },
      missingFields: ['LastName', 'Email', 'Password', 'ConfirmPassword'],
    },
    {
      validField: 'last name',
      values: {
        firstName: '',
        lastName: 'Customer',
        email: '',
        password: '',
        confirmPassword: '',
      },
      missingFields: ['FirstName', 'Email', 'Password', 'ConfirmPassword'],
    },
    {
      validField: 'email',
      values: {
        firstName: '',
        lastName: '',
        email: `playwright-only-email-${Date.now()}@example.invalid`,
        password: '',
        confirmPassword: '',
      },
      missingFields: ['FirstName', 'LastName', 'Password', 'ConfirmPassword'],
    },
  ]) {
    test(`requires the other mandatory fields when only ${validField} is valid`, async ({
      page,
    }) => {
      await page.goto('https://demowebshop.tricentis.com/register');
      await fillRegistrationForm(page, values);
      await page.locator('#register-button').click();

      for (const field of missingFields) {
        await expect(page.locator(`[data-valmsg-for="${field}"]`)).not.toBeEmpty();
      }
    });
  }

  test('rejects an email with leading or trailing spaces', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');
    await fillRegistrationForm(page, {
      email: '  playwright-spaces@example.invalid  ',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText(
      'Wrong email'
    );
  });

  test('rejects a password containing only spaces', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');
    await fillRegistrationForm(page, {
      password: '     ',
    });
    await page.locator('#register-button').click();

    await expect(page.locator('[data-valmsg-for="Password"]')).toHaveText(
      'Password is required.'
    );
    await expect(page.locator('[data-valmsg-for="ConfirmPassword"]')).toHaveText(
      'Password is required.'
    );
  });

  test('rejects an email address that is already registered', async ({ page }) => {
    const email = `playwright-duplicate-${Date.now()}@example.invalid`;

    await page.goto('https://demowebshop.tricentis.com/register');
    await fillRegistrationForm(page, { email });
    await page.locator('#register-button').click();
    await expect(page.locator('.result')).toContainText(
      'Your registration completed'
    );

    await page.goto('https://demowebshop.tricentis.com/register');
    await fillRegistrationForm(page, { email });
    await page.locator('#register-button').click();

    await expect(page.locator('.validation-summary-errors')).toContainText(
      'The specified email already exists'
    );
  });

  test('redirects to the registration result page after successful registration', async ({
    page,
  }, testInfo) => {
      await page.goto('https://demowebshop.tricentis.com/register');
      await fillRegistrationForm(page, {
      email: `playwright-redirect-${Date.now()}-${testInfo.workerIndex}@example.invalid`,
    });
    await page.locator('#register-button').click();

    await expect(page).toHaveURL(/\/registerresult\/1$/);
    await expect(page.locator('.result')).toContainText(
      'Your registration completed'
    );
  });
});

test.describe('Additional registration tests', () => {
  for (const { field, errorField, expectedError } of [
    {
      field: 'firstName',
      errorField: 'FirstName',
      expectedError: 'First name is required.',
    },
    {
      field: 'lastName',
      errorField: 'LastName',
      expectedError: 'Last name is required.',
    },
    {
      field: 'email',
      errorField: 'Email',
      expectedError: 'Email is required.',
    },
    {
      field: 'confirmPassword',
      errorField: 'ConfirmPassword',
      expectedError: 'Password is required.',
    },
  ]) {
    test(`shows an error when only ${field} is blank`, async ({ page }) => {
      await page.goto('https://demowebshop.tricentis.com/register');
      await fillRegistrationForm(page, { [field]: '' });
      await page.locator('#register-button').click();

      await expect(
        page.locator(`[data-valmsg-for="${errorField}"]`)
      ).toHaveText(expectedError);
    });
  }

  test('shows correctly spelled registration labels', async ({ page }) => {
    await page.goto('https://demowebshop.tricentis.com/register');

    await expect(page.getByRole('heading', { name: 'Register', exact: true }))
      .toBeVisible();
    await expect(page.locator('label[for="FirstName"]')).toContainText('First name');
    await expect(page.locator('label[for="LastName"]')).toContainText('Last name');
    await expect(page.locator('label[for="Email"]')).toContainText('Email');
    await expect(page.locator('label[for="Password"]')).toContainText('Password');
    await expect(page.locator('label[for="ConfirmPassword"]'))
      .toContainText('Confirm password');
  });
});