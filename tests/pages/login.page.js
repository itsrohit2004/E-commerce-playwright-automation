const { expect } = require('@playwright/test');
const { shopUrl } = require('../data/shop-data');

class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async open() {
    await this.page.goto(`${shopUrl}/login`);
  }

  async submit(email, password, rememberMe = false) {
    await this.page.locator('#Email').fill(email);
    await this.page.locator('#Password').fill(password);
    if (rememberMe) {
      await this.page.locator('#RememberMe').check();
    }
    await this.page.locator('.login-button').click();
  }

  async expectAuthenticatedAs(email) {
    await expect(
      this.page.getByRole('link', { name: email, exact: true })
    ).toBeVisible();
    await expect(
      this.page.getByRole('link', { name: 'Log out', exact: true })
    ).toBeVisible();
  }

  async login(email, password) {
    await this.open();
    await this.submit(email, password);
    await this.expectAuthenticatedAs(email);
  }
}

module.exports = { LoginPage };
