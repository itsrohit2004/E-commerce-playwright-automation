# E-commerce Playwright Automation

Playwright end-to-end automation suite for a demo e-commerce website, covering registration, login, product details, cart, and checkout.

## Setup
- Install Node.js.
- Run `npm ci`.
- Run `npx playwright install`.

## Run tests
- Everything: `npm test`
- Cart: `npx playwright test tests/cart/cart.spec.js`
- In Firefox: add `--project=firefox` to a test command.
- To run in a visible browser, add `--headed` to a test command.
- To run with one worker, add `--workers=1` to a test command.

## Account-dependent tests
Some tests need an existing account and are skipped if credentials are not configured. Set `LOGIN_EMAIL` and `LOGIN_PASSWORD` as environment variables locally, or as GitHub Actions secrets in CI. Don’t put real credentials in this file.

In PowerShell, set the variables for the current terminal session and run the tests:

```powershell
$env:LOGIN_EMAIL = "your-email@example.com"
$env:LOGIN_PASSWORD = "your-password"
npx playwright test
```

These tests include saved-cart behavior, saved-address checkout, and registered-customer product actions.

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
