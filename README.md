# E-commerce Playwright Automation

## Setup
- Install Node.js.
- Run `npm ci`.
- Run `npx playwright install`.

## Run tests
- Everything: `npm test`
- Cart: `npx playwright test tests/cart/cart.spec.js`
- In Firefox: add `--project=firefox` to a test command.
- To see in Browser `--headed` to a test command.
- To see in Test Execution in One Browser `--workers=1` to a test command.

## Account-dependent tests
Set `LOGIN_EMAIL` and `LOGIN_PASSWORD` in your local environment to run tests that need an account. Don’t put real credentials in this file. In CI, use GitHub Actions secrets.

## Project structure
- `tests/`: module test specs
- `tests/data/`: shared test data
- `tests/pages/`: reusable page interactions

## Reports
After a run, open the HTML report with `npx playwright show-report`.

## CI
Tests run through the workflow at `.github/workflows/playwright.yml`.

## Modules covered
- Registration
- Login
- Checkout
- Product Details 
- Cart 

## Account-dependent tests
Some tests need an existing account and are skipped if credentials are not configured. Set `LOGIN_EMAIL` and `LOGIN_PASSWORD` as environment variables locally, or as GitHub Actions secrets in CI.

$env:LOGIN_EMAIL = "your-email@example.com"
$env:LOGIN_PASSWORD = "your-password"
npx playwright test

These tests include saved-cart behavior, saved-address checkout, and registered-customer product actions.