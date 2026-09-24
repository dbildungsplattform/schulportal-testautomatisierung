---
name: create-playwright-test
description: "Creates a new Playwright test (.spec.ts) for the Schulportal, following project conventions, page objects, API-based test-data creation, and known backend constraints. Use when asked to create a new test. Do not use for fixing an existing failing test (use run-and-fix-test) or only creating/extending a page object (use create-page-object)."
argument-hint: "Beschreibung des Testfalls oder Pfad zur CSV mit Testschritten"
---

# Create Playwright Test

Creates a new Playwright test for the Schulportal following project conventions.

## Do Not Use When / See Also
- An existing test should be fixed → use [`run-and-fix-test`](../run-and-fix-test/SKILL.md) instead
- Only a page object should be created or extended → use [`create-page-object`](../create-page-object/SKILL.md) instead
- Further references: [testdaten.md](../../../docs/testdaten.md) (API wrappers, generators, cleanup helpers), [best-practices.md](../../../docs/best-practices.md) (coding conventions), [structure.md](../../../docs/structure.md) (project structure), [tags.md](../../../docs/tags.md) (tag conventions)

---

## Project Conventions (Summary)

Full detail in `docs/best-practices.md` and `docs/structure.md`. Key rules here:

- **Tests contain no business logic** — logic, actions, and assertions belong in page objects
- **Locators only in pages** — tests only access page methods
- **One use case per file** — a `.spec.ts` covers exactly one use case
- **File name:** PascalCase, extension `.spec.ts` (e.g. `RolleAnlegen.spec.ts`)
- **Describe blocks:** short, business-oriented, in German
- **Tags:** alphabetically sorted: `{ tag: [DEV, STAGE] }`
- **`test.step()`:** only for major business phases, step names in German
- **Assertions:** `assert` prefix in page methods, prefer web-first assertions

### Reviewer Hardening (mandatory)

> Shared reuse/dedup/no-dead-code checklist — canonical version lives in
> [`create-page-object/SKILL.md`](../create-page-object/SKILL.md#3-check-reuse-and-conflicts).
> Apply it here too: reuse before reimplementing, locator deduplication, no dead code.

Additional checks specific to this skill:

- **Minimal test-data parameters:** For helpers like `createRolleAndPersonWithPersonenkontext(...)`, only set optional fields when the business case requires them.
- **Decide the Schule strategy deliberately:**
  - Default: `createSchule(...)` with a generated name.
  - Exception (static/existing) only with a short justification in the test comment or summary.

---

## API-Based Test-Data Creation — Known Backend Constraints

Full description with code examples: [docs/testdaten.md](../../../docs/testdaten.md).

| Behavior | CREATE (`POST`) | COMMIT (`PUT`) |
|---|---|---|
| Schüler without Klasse | ❌ `LERN_NOT_AT_SCHULE_AND_KLASSE` | ❌ `LERN_NOT_AT_SCHULE_AND_KLASSE` |
| 2 Klassen, same Rolle | ✅ allowed | ❌ `DUPLICATE_KLASSENKONTEXT_FOR_SAME_ROLLE` |
| Versioning (`count`/`lastModified`) | not needed | ✅ required |

---

## Available API Functions for Test-Data Creation

Full overview incl. signatures, examples, and decision guidance: [docs/testdaten.md](../../../docs/testdaten.md). Most-used entries:

| Function | Purpose |
|---|---|
| `createPersonWithPersonenkontext` | Create a Person at an existing Org + Rolle |
| `createRolleAndPersonWithPersonenkontext` | Rolle + Person + Personenkontext in one step (incl. Klasse) |
| `createSchule` / `createKlasse` | Create a Schule / Klasse |
| `deletePerson` / `deleteRolleById` / `deleteKlasseByName` | Cleanup helpers |

See [docs/testdaten.md](../../../docs/testdaten.md) for the full list, including `createPersonWithZweiKlassenKontexte`, `createTeacherAndLogin`, `prepareAndLoginUserWithPermissions`, and the API helper modules under `base/api/`.

---

## Workflow

### Phase 1 — Gather the Test Description

**Do not start** without a test description. Required inputs:

| Information | Required | Source |
|---|---|---|
| Use-case description or test steps | ✅ | User / CSV / ticket |
| Which role acts (Landesadmin, Schuladmin, …) | ✅ | User / test steps |
| Which test data is needed | ✅ | Derived from test steps |
| Tags (DEV, STAGE) | ⚪ | User (default: `[DEV]`) |

If the description is unclear → ask the user **before** creating page objects or tests.

### Phase 2 — Check Page Objects and Locators

Derive from the test steps which pages and which methods/locators are needed. Then check each page in turn:

1. **Does the page object exist** under `pages/` or `pages/admin/<area>/`?
  - **No** → invoke [`create-page-object`](../create-page-object/SKILL.md) in create mode. Only then continue here.
  - **Yes** → continue to step 2.
2. **Are all required methods/locators present in the page?**
  - **No** → invoke [`create-page-object`](../create-page-object/SKILL.md) in extend mode. Only then continue here.
   - **Yes** → continue to Phase 3.
3. **Important:** Always apply reuse-first before adding: extend/parameterize existing methods instead of reimplementing the same flow.
4. Similarly: check whether the required **API functions** for test-data setup exist in `base/api/`. If not, add them before the test (see [docs/testdaten.md](../../../docs/testdaten.md)).

> **Never skip this phase.** Tests must not contain locators directly — missing logic belongs in page objects first.

> **Unknown test IDs?** Use Playwright MCP (`run_playwright_code` / `read_page`) for live inspection of the page. Navigate as the appropriate user to the relevant UI state and read the `data-testid` attributes from the DOM. See [`create-page-object`](../create-page-object/SKILL.md) for details.

### Phase 3 — Storage Location: Reuse or Create a `.spec.ts`

Before writing, check whether a suitable `.spec.ts` already exists where the new test case can be added.

1. Search `tests/<area>/` for thematically matching files (e.g. `PersonAnlegen.spec.ts`, `KlasseBearbeiten.spec.ts`).
2. **Matching file exists?**
  - **Yes** → insert the new `test(...)` block into a suitable existing `test.describe` suite. Reuse the existing `beforeEach`; only keep an existing `afterEach` if its local cleanup is genuinely required.
   - **No** → create a new file `tests/<area>/<UseCase>.spec.ts` (PascalCase).
3. **Before inserting**, check whether the existing `beforeEach` already creates all needed test data:
   - Setup is sufficient → just add the test.
  - Test data is missing → extend the `beforeEach` (or add a nested `test.describe` with its own `beforeEach`) accordingly. All names must carry the generator prefix `TAuto-PW-…` so the global teardown cleans them up after the run.

> **Anti-pattern: duplicate describe instead of merge.**
> If an existing `beforeEach` already covers 80%+ of the needed setup (e.g. Schule, Klassen, Rolle, Schuladmin login), add the missing test data **there** instead of creating a standalone describe block with nearly identical setup. Duplicated setup means longer runtime + maintenance burden.

### Phase 4 — Implement the Test

#### 4.1 — Storage location

`tests/<area>/` (e.g. `tests/personen/`, `tests/rollen/`, `tests/schulen/`).

#### 4.2 — Basic structure (for a new file)

When reusing an existing spec file, only insert the `test(…)` block and extend `beforeEach` if needed — don't build a new `test.describe` wrapper.

```ts
import test, { expect, PlaywrightTestArgs } from '@playwright/test';
// Imports for API functions, pages, test-data generators, tags...

test.describe(`<Business use-case name>`, () => {
  test.describe(`Als <Rolle>`, () => {
    // Suite-local variables for test data
    let someId: string;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      // Login and navigation
      // Create test data via API
    });

    test(`Testfall-Beschreibung`, { tag: [DEV] }, async ({ page }: PlaywrightTestArgs) => {
      // Test steps via page methods
    });
  });
});
```

#### 4.3 — Test-data setup

- **Always API-based**, never via the UI
- **Setup belongs in `beforeEach`** (or in a `test.step('Testdaten … anlegen')` at the very start of the test) — not in the middle of the test flow
- The page must be logged in before API calls (typically `loginAndNavigateToAdministration(page)` as Landesadmin), since the wrappers authenticate via the page cookie
- For Schüler, **always create Schule + Klasse together** (constraint `LERN_NOT_AT_SCHULE_AND_KLASSE`)
- For multi-Klasse scenarios: use `createPersonWithZweiKlassenKontexte` instead of CREATE+COMMIT
- Generate test data with functions from `base/utils/generateTestdata.ts`: `generateNachname()`, `generateVorname()`, `generateSchulname()`, `generateKlassenname()`, `generateRolleName()`, `generateDienststellenNr()`, `generateKopersNr()`. All generators produce values with the prefix `TAuto-PW-…` for recognizability and collision-freedom across parallel tests.
- **Schulen are created fresh per test via API** with `createSchule(page, generateSchulname(), generateDienststellenNr())`. The static constants `testschuleName` and `ersatzTestschuleName` from [base/organisation.ts](../../../base/organisation.ts) must **not** be used for new tests; when refactoring, replace them with freshly created Schulen. Downstream API functions like `createPersonWithPersonenkontext`/`createRolleAndPersonWithPersonenkontext` are called with the dynamically generated `schuleName`.

#### 4.4 — Test logic

- Call actions via page methods, no direct locator access
- Navigate via `waitForPageLoad()` chains
- Use `test.step()` for major business phases

#### 4.5 — Cleanup

- The global teardown in [tests/global-teardown.ts](../../../tests/global-teardown.ts) deletes all Personen, Rollen, Klassen, and Schulen created with `TAuto-PW` after the test run.
- New tests therefore don't implement their own `afterEach` cleanup and don't need to collect IDs or usernames for that purpose.
- A local `afterEach` cleanup via [base/testHelperDeleteTestdata.ts](../../../base/testHelperDeleteTestdata.ts) is only allowed when data must be deleted before the end of the test run; the exception must be briefly justified in the test.

### Phase 5 — Validation

1. TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```
2. Run the test:
   ```bash
   npx playwright test <test-file> --reporter=list
   ```
3. On failure → use skill `run-and-fix-test`
4. PR quick checks on changed files:
  ```bash
  npx eslint <changed-files>
  ```
  Then briefly check manually:
  - duplicate locator strings in the same page
  - newly added but unused public methods

---

## Reference Files

| File | Pattern |
|---|---|
| `tests/personen/PersonAnlegen.spec.ts` | Standard test with API setup, Landesadmin, Schuladmin |
| `tests/personen/PersonenRolleZuordnenMehrfachbearbeitung.spec.ts` | Complex test with multi-Klasse scenarios, error-case tests |
| `tests/helpers/createKlassenAndSchuelerForSchulen.ts` | Helper for bulk test-data creation |
| `tests/helpers/prepareAndLoginUserWithPermissions.ts` | Helper for login with specific permissions |