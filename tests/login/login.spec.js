const { test, expect } = require('@playwright/test');
const { getTestCredentials, shopUrl } = require('../data/shop-data');
const { LoginPage } = require('../pages/login.page');

const loginUrl = `${shopUrl}/login`;
const { email: validEmail, password: validPassword } = getTestCredentials();

function skipUnlessCredentialsAreConfigured() {
  test.skip(
    !validEmail || !validPassword,
    'Set LOGIN_EMAIL and LOGIN_PASSWORD to run tests that require an existing account.'
  );
}

async function submitLogin(page, email, password, rememberMe = false) {
  await new LoginPage(page).submit(email, password, rememberMe);
}

async function expectLoginFailure(page) {
  await expect(page.locator('.validation-summary-errors')).toContainText(
    'Login was unsuccessful'
  );
  await expect(page.locator('.validation-summary-errors')).toContainText(
    'No customer account found'
  );
}

async function expectAuthenticatedAs(page, email) {
  await new LoginPage(page).expectAuthenticatedAs(email);
}

async function expectAuthenticationCookiePersistence(page, persistent) {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(cookie => /auth/i.test(cookie.name));

  expect(authCookie, 'An authentication cookie should exist after login').toBeTruthy();
  if (persistent) {
    expect(authCookie.expires).toBeGreaterThan(Date.now() / 1000);
  } else {
    expect(authCookie.expires).toBe(-1);
  }
}

test.describe('Login page and validation', () => {
  test('loads directly and displays the login form', async ({ page }) => {
    const response = await page.goto(loginUrl);

    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Welcome, Please Sign In!' })
    ).toBeVisible();
    await expect(page.locator('#Email')).toBeVisible();
    await expect(page.locator('#Password')).toBeVisible();
    await expect(page.locator('.login-button')).toBeVisible();
  });

  test('opens the login page from the home page', async ({ page }) => {
    await page.goto(shopUrl);
    await page.getByRole('link', { name: 'Log in', exact: true }).click();

    await expect(page).toHaveURL(/\/login/i);
    await expect(
      page.getByRole('heading', { name: 'Welcome, Please Sign In!' })
    ).toBeVisible();
  });

  test('shows login labels, customer sections, and recovery link', async ({
    page,
  }) => {
    await page.goto(loginUrl);

    await expect(page.getByText('Returning Customer')).toBeVisible();
    await expect(page.getByText('New Customer')).toBeVisible();
    await expect(page.locator('label[for="Email"]')).toHaveText('Email:');
    await expect(page.locator('label[for="Password"]')).toHaveText('Password:');
    await expect(page.locator('label[for="RememberMe"]')).toHaveText(
      'Remember me?'
    );
    await expect(
      page.getByRole('link', { name: 'Forgot password?', exact: true })
    ).toHaveAttribute('href', '/passwordrecovery');
  });

  test('masks the password field', async ({ page }) => {
    await page.goto(loginUrl);
    await expect(page.locator('#Password')).toHaveAttribute('type', 'password');
  });

  test('remember-me checkbox is unchecked by default and can be toggled', async ({
    page,
  }) => {
    await page.goto(loginUrl);
    const rememberMe = page.locator('#RememberMe');

    await expect(rememberMe).not.toBeChecked();
    await rememberMe.check();
    await expect(rememberMe).toBeChecked();
    await rememberMe.uncheck();
    await expect(rememberMe).not.toBeChecked();
  });

  test('opens the password recovery page', async ({ page }) => {
    await page.goto(loginUrl);
    await page
      .getByRole('link', { name: 'Forgot password?', exact: true })
      .click();

    await expect(page).toHaveURL(/\/passwordrecovery/i);
    await expect(
      page.getByRole('heading', { name: 'Password recovery', exact: true })
    ).toBeVisible();
  });

  for (const { title, email, password } of [
    {
      title: 'rejects both invalid credentials',
      email: 'unknown-login@example.invalid',
      password: 'not-the-password',
    },
    {
      title: 'rejects an empty email with a password',
      email: '',
      password: 'demo@123',
    },
    {
      title: 'rejects an email with an empty password',
      email: 'unknown-login@example.invalid',
      password: '',
    },
    {
      title: 'rejects empty email and password',
      email: '',
      password: '',
    },
    {
      title: 'rejects an unknown email with a password',
      email: `unknown-${Date.now()}@example.invalid`,
      password: 'demo@123',
    },
  ]) {
    test(title, async ({ page }) => {
      await page.goto(loginUrl);
      await submitLogin(page, email, password);
      await expectLoginFailure(page);
      await expect(page).toHaveURL(/\/login/i);
    });
  }

  test('rejects a malformed email address', async ({ page }) => {
    await page.goto(loginUrl);
    await submitLogin(page, 'demo?', 'demo@123');

    await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText(
      'Please enter a valid email address.'
    );
    await expect(page).toHaveURL(/\/login/i);
  });

  test('rejects an email with leading or trailing spaces', async ({ page }) => {
    await page.goto(loginUrl);
    await submitLogin(page, '  unknown@example.invalid  ', 'demo@123');

    await expect(page.locator('[data-valmsg-for="Email"]')).toHaveText(
      'Please enter a valid email address.'
    );
    await expect(page).toHaveURL(/\/login/i);
  });

  test('rejects an invalid password for a configured account', async ({
    page,
  }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);
    await submitLogin(page, validEmail, 'invalid-password');

    await expect(page.locator('.validation-summary-errors')).toContainText(
      'Login was unsuccessful'
    );
    await expect(page.locator('.validation-summary-errors')).toContainText(
      'The credentials provided are incorrect'
    );
    await expect(page).toHaveURL(/\/login/i);
  });
});

test.describe('Successful login and session behavior', () => {
  test('logs in with valid credentials and returns to the home page', async ({
    page,
  }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);
    await submitLogin(page, validEmail, validPassword);

    await expect(page).toHaveURL(shopUrl);
    await expectAuthenticatedAs(page, validEmail);
  });

  test('logs in using only keyboard navigation', async ({ page }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);

    await page.locator('#Email').focus();
    await page.keyboard.type(validEmail);
    await page.keyboard.press('Tab');
    await page.keyboard.type(validPassword);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('.login-button')).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(shopUrl);
    await expectAuthenticatedAs(page, validEmail);
  });

  test('keeps the user signed in after reload when Remember me is selected', async ({
    page,
  }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);
    await submitLogin(page, validEmail, validPassword, true);

    await expectAuthenticatedAs(page, validEmail);
    await expectAuthenticationCookiePersistence(page, true);
    await page.reload();
    await expectAuthenticatedAs(page, validEmail);
  });

  test('does not keep the email visible after reload when Remember me is not selected', async ({
    page,
  }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);
    await submitLogin(page, validEmail, validPassword);

    await expectAuthenticatedAs(page, validEmail);
    await expectAuthenticationCookiePersistence(page, false);
    await page.reload();
    await expect(
      page.getByRole('link', { name: validEmail, exact: true })
    ).toHaveCount(0);
  });

  test('logs out and terminates the authenticated session', async ({ page }) => {
    skipUnlessCredentialsAreConfigured();
    await page.goto(loginUrl);
    await submitLogin(page, validEmail, validPassword);
    await expectAuthenticatedAs(page, validEmail);

    await page.getByRole('link', { name: 'Log out', exact: true }).click();

    await expect(page).toHaveURL(shopUrl);
    await expect(
      page.getByRole('link', { name: 'Log in', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: validEmail, exact: true })
    ).toHaveCount(0);

    await page.goto(`${shopUrl}/customer/info`);
    await expect(page).toHaveURL(/\/login/i);
  });
});