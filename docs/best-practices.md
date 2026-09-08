# TL;DR

- Code should follow TypeScript best practices.
- Frontend views are represented as pages.
- Business logic (actions and assertions) is implemented as methods in pages.
- Navigation is done through pages, and the `waitForPageLoad()` method is called.
- Test logic (including calls to page methods) lives in tests.
- Locators are encapsulated in pages and preferably defined method-locally. Tests only access page methods.
- API functions are implemented using the generated API and a Playwright fetch wrapper.
- The API must be updated in Playwright whenever it changes in the backend.
- To create data via API, navigate into the portal first so 2FA can be performed if necessary.

# Pages

Every view in the frontend (`schulportal-client`) is represented as a page in Playwright.

Pages contain three sections: locators, actions, and assertions. Locators are used to find elements in the application. Actions are methods that implement the business logic of frontend views. Assertions are the checks (`expect`s). Assertions start with the prefix `assert`, e.g. `assertPersonalData()`.

## Locators

Locators should only be used inside a page. Tests must never access page locators directly, only page methods. Locators are preferably created locally inside the respective method. This removes the need for class fields for one-off locators and keeps encapsulation intact. Method-spanning locators are defined globally.

Locator variable names are based on the test ID names used in the frontend.

## Actions

Methods used by tests must be `public`. Methods only used internally should be `private`. Tests should pass as few parameters as possible (but as many as necessary) to page functions.

Every page must have a `waitForPageLoad()` method that checks at least one unique headline (or similar element) of the page and then returns the page.

Inside pages, the term *workflow* describes a business process executed in the frontend that is composed in Playwright of multiple units (e.g. actions, pages, etc.).

## Assertions

- Prefer web-first assertions: `await expect(locator).toBeVisible()` instead of a separate `waitFor(...)` plus an additional `expect`.
- Use `expect.soft()` for non-critical multi-assertion checks.
- Use `toPass()` for polling-based verification instead of manual retry loops.

Related assertions should be grouped into a shared method unless there is a business reason to call them individually. Only if an assertion needs to be called separately and deliberately (e.g. because it needs its own parameter like `assertHeadline(schulname: string)`) should it be extracted as a standalone method. Such specific assertions can then be called inside a higher-level assertion method.

## Test IDs

Every HTML element that is meaningfully testable with Playwright receives a test ID via the HTML attribute `data-testid`. This attribute can be read using the Playwright function `.getByTestId()`. Names in the frontend preferably use kebab-case following the schema `<function>-<element>`, e.g. `data-testid="username-input"`.

Test IDs must be unique per page so tests can access elements unambiguously. This especially applies to programmatically generated elements, such as service-provider cards. For such elements the test ID must get an affix that makes it unique, e.g. the model ID: `service-provider-card-7e6f10d7-b6e5-4686-9011-182634c03bf3`.

### No ID available in the frontend?

If an element to be tested has no test ID, the frontend must be updated. The best approach is a branch in `schulportal-client` with the same number as the Playwright ticket. This ensures the tests always run consistently.

### Exceptions due to Vuetify

In some cases a specific element (e.g. an input field) has no test ID even though one was assigned in the frontend. This is caused by Vuetify, the UI component library used in the frontend. For Vuetify components we can currently assign a test ID only at the top level. If an element at a deeper level must be located in Playwright, this can be done by chaining Playwright methods.

Example: the input field inside the search filter should be located. The search filter is a Vuetify component with a test ID. Chain as follows: `this.page.getByTestId('search-filter-input').locator('input')`.

# Test Suites

All test suites (files) are use-case oriented. A test suite contains **only one** use case. A use case can consist of several test cases.

Tests must not contain business logic. Logic, actions, and checks only happen in pages.

A top-level `describe` block is not needed if the file name makes it clear what the test contains.

`describe` block names should be short and business-oriented, e.g. `Testfälle für die Anlage von Personen`. Environment information like environment, URL, or `process.env.*` does not belong in `describe` names, since this information is already present in Playwright reports and configuration.

## Parallel Safety

Module-level mutable state (e.g. `let usernames: string[] = []`) is error-prone with parallel test workers. Therefore:
- Use variables only test-locally (`test`) or suite-locally (`test.describe`).
- Do not use global arrays/objects for created data.
- For reusable setup/teardown, use Playwright custom fixtures (`test.extend`) in the medium to long term.

## test.step() Guidelines

- Use `test.step()` only for major business phases (setup, action, verification).
- Keep step names short, in German, and describing *what* is being done.
- Use return values from steps to pass data clearly to subsequent steps.

# Naming

| Element             | Recommended Case     | Extension | Example                  | Notes                                              |
| ------------------- | -------------------- | --------- | ------------------------ | -------------------------------------------------- |
| Pages               | PascalCase           | .page.ts  | PersonImportView.page.ts | Matches the frontend view file name                |
| Test suites         | PascalCase           | .spec.ts  | RolleAnlegen.spec.ts     | Test suites are always use-case based              |
| Helpers/Utils       | camelCase            | .ts       | generateTestdata.ts      |                                                      |
| Variables           | camelCase            | -         | organisationAutocomplete |                                                      |
| Constants           | SCREAMING_SNAKE_CASE | -         | FRONTEND_URL             |                                                      |
| Methods             | camelCase            | -         | waitForPageLoad()        |                                                      |
| Test IDs (Frontend) | kebab-case           | -         | person-creation-form     |                                                      |

# Coding Rules

_Always_ run linter, build, and tests before pushing:

```
npm run lint
npm run type-check
npx playwright test
```

# Tags
Tags allow targeted control over test execution. For example, tests can be run only on stage or only on dev, depending on which third-party systems or other circumstances must be considered. The following matrix shows the available tags and what they cover.

| Tag         | Basic Functions | LDAP | Third-Party Systems | Login |
| ----------- | --------------- | ---- | ------------------- | ----- |
| dev         | x               | x    |                     |       |
| stage       | x               |      | x                   |       |
| stage-smoke |                 |      |                     | x     |

Tags are always given in alphabetical order: `{ tag: [DEV, STAGE] }`, not `{ tag: [STAGE, DEV] }`. Consistent order makes searching and review easier.

# Cleanup

The preferred project standard is global teardown, which cleans up all test data with the prefix `TAuto` after the test run. Tests therefore do not need to implement their own cleanup steps for created entities.

Deleting test data in an `afterEach` hook is not necessary, because global teardown takes care of it.

In the long term, migrating to Playwright custom fixtures with automatic teardown per test is the preferred direction.

# API

To maintain stability and maintainability of the automated tests, API calls are defined in their own classes. There are the API classes we created ourselves, e.g. `base/api/personApi.ts` (name we chose, model name in singular), where we define methods for use in pages and tests. There we use the corresponding generated API class, e.g. `base/api/generated/personenApi.ts` (name assigned by the backend API). This is generated from the backend API Swagger document.

Before the refactoring there were helper classes containing both business logic and API logic. They were separated by the refactoring so that API classes now contain only API logic.

Whenever the API changes in the backend repo, the API must also be regenerated in Playwright. The command for this in the Playwright repo is `npm run generate-api`.

# GitHub Workflows

There is one GitHub workflow (`run-playwright.yml`) that handles execution and accepts parameters for environment, browser, and test scope (tags). This makes it possible to execute every possible combination of parameters manually and on schedule.

The other GitHub workflows call `run-playwright.yml` with parameters.

See `docs/actions-github.md`.

# Examples

## Page

```typescript
import ....

export class LoginViewPage {
  // All variables used globally in the page (e.g. needed in multiple methods) are defined at the top.
  // Variables used only locally inside methods are defined only locally.
  /* add global locators here */

  // protected readonly makes this.page available
  constructor(protected readonly page: Page) {}

  // We separate actions and assertions
  // Actions are all functions provided by a page
  /* actions */
  // Every page needs a public waitForPageLoad() method that can be used in tests
  // Returning this allows the caller to be a bit slimmer
  public async waitForPageLoad(): Promise<LoginViewPage> {
    await expect(this.page.getByTestId('login-page-title')).toHaveText('Anmeldung');
    return this;
  }

  // All methods that don't need to be used by tests are declared private and only called inside the page
  private generateSecurePassword(): string {
    return generator.generate({ length: 8, numbers: true }) + '1Aa!';
  }

  // Public methods are used in tests and usually have a return value
  // The return value is often another page
  public async login(
    username: string = process.env.USER as string,
    password: string = process.env.PW as string
  ): Promise<StartViewPage> {
    // If locators are used locally multiple times, declare them as variables
    const usernameInput: Locator = this.page.getByTestId('username-input');
    const passwordInput: Locator = this.page.getByTestId('password-input');
    const loginButton: Locator = this.page.getByTestId('login-button');

    // Locators used only once can be called directly
    await expect(this.page.getByTestId('login-page-title')).toHaveText('Anmeldung');
    await expect(this.page.getByTestId('login-prompt-text')).toHaveText('Bitte geben Sie Ihre persönlichen Zugangsdaten ein.');

    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(username);

    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);

    await expect(loginButton).toBeVisible();
    await loginButton.click();
    return new StartViewPage(this.page);
  }

  // Assertions are methods that check page elements or behavior
  /* assertions */
  public async loginFailedWithWrongCredentials(): Promise<void> {
    const inputErrorSpan: Locator = this.page.getByTestId('input-error-message');

    await expect(inputErrorSpan).toBeVisible();
    await expect(inputErrorSpan).toHaveText('Ungültiger Benutzername oder Passwort.');
  }

  public async loginFailedWithLockedUser(): Promise<void> {
    const loginErrorSpan: Locator = this.page.getByTestId('login-error-message');

    await expect(loginErrorSpan).toBeVisible();
    await expect(loginErrorSpan).toHaveText('Ihr Benutzerkonto ist gesperrt. Bitte wenden Sie sich an Ihre schulischen Administratorinnen und Administratoren.');
  }
}
```

## Test

```typescript
import ....

// Global variables for all tests in this spec file
const ADMIN: string | undefined = process.env.USER;
const PASSWORD: string | undefined = process.env.PW;

// test.describe() defines individual test suites
// A spec file in our project covers one concrete use case of the Schulportal and may contain multiple test suites
test.describe('Testfälle für den Login', () => {
  // Local variables of the test case
  let landingPage: LandingViewPage;
  let loginPage: LoginViewPage;
  let header: HeaderPage;

  // The beforeEach hook of a test suite runs before each individual test and can establish required starting situations
  // e.g. create data needed for the test or perform login, etc.
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    loginPage = await freshLoginPage(page);
    header = new HeaderPage(page);
  });

  // A concrete test case is executed with test()
  // Ideally the individual tests are very slim because they only call the business logic steps from the pages
  // Here for example only 2 methods are called, loginPage.login() and startPage.assertServiceProvidersAreLoaded()
  test('Erfolgreicher Login', async () => {
    // In this case the StartPage is already returned by login(), so it doesn't need to be stored again via waitForPageLoad
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();
    await startPage.assertServiceProvidersAreLoaded();
  });

  // Tip: for debugging use test.only() to run only this test. test.only() must not be committed.
  test('Fehlgeschlagener Login mit falschen Daten', async () => {
    await loginPage.login('anakin', 'obi-wan');
    await loginPage.loginFailedWithWrongCredentials();
  });

  // Tip: if a single test causes problems, it can be skipped with test.skip()
  // This should only be a temporary solution and is rather to be avoided
  test.skip('Fehlgeschlagener Login mit gesperrtem Benutzer', async ({ page }: { page: Page }) => {
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();

    // The locked user is only needed in this test case, so it is created locally
    /* create locked user */
    const testSchuleId: string = await getOrganisationId(page, testschuleName)
    const rolleName: string = await generateRolleName();
    const rolleId: string = await createRolle(page, 'LEHR', testSchuleId, rolleName);
    const userinfo: UserInfo = await createPerson(page, testSchuleId, rolleId)
    await lockPerson(page, userinfo.personId, testSchuleId);

    await header.logout();
    loginPage = await freshLoginPage(page);
    await loginPage.login(userinfo.username, userinfo.password);
    await loginPage.loginFailedWithLockedUser();
  });

  test('Erfolgreicher Logout', async () => {
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();

    await header.logout();
    await landingPage.waitForPageLoad();
  });
});
```
