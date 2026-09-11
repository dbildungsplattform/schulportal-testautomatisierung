# Testing — schulportal-testautomatisierung

> **Scope:** All Playwright test work in this repository (`tests/`, `pages/`, `base/`).
> **Framework:** Playwright E2E (`@playwright/test`), TypeScript ESM.
> **Goal:** High-signal, low-token instructions for reliable AI-assisted test implementation.

---

## 1. Stack & Reality Check

Use only repository-valid tooling and commands.

| Area | Source of truth |
|---|---|
| Test framework | `@playwright/test` (Playwright E2E) |
| Test config | `playwright.config.ts` |
| Setup lifecycle | `tests/global-setup.ts` |
| Teardown lifecycle | `tests/global-teardown.ts` |
| Command list | `package.json` scripts + Playwright CLI |
| Tags | `base/tags.ts` |

Hard facts from current config:
- `testDir`: `./tests`
- `workers`: `4`
- `timeout`: `90s` (webkit `150s`)
- `retries`: `2` on CI, `0` locally
- `maxFailures`: `2`
- `globalSetup` + `globalTeardown` are enabled

---

## 2. Repository Boundaries

### In scope
- E2E spec authoring (`*.spec.ts`) in `tests/`
- Page Object updates in `pages/`
- Test/API helpers in `base/` (non-generated only)

### Out of scope
- Unit/component testing guidance (Vitest, jsdom, Vue Test Utils, Pinia testing)
- Frontend app implementation details from `schulportal-client`

### Generated code
- Never edit `base/api/generated/` directly.
- If API contract changed, regenerate via `npm run generate-api`.

---

## 3. TypeScript — Mandatory Rules

These rules are enforced by ESLint in CI (`npm run lint:ci`). AI-generated code MUST comply on first output.

| Rule | Severity | Requirement |
|---|---|---|
| `@typescript-eslint/explicit-function-return-type` | `error` | Every function MUST declare a return type. Relaxed for test/describe/step callbacks in `tests/**/*.ts` only — still applies to helper functions defined in test files. |
| `@typescript-eslint/no-explicit-any` | `error` | `any` is forbidden everywhere — use `unknown` + type narrowing. |
| `@typescript-eslint/no-floating-promises` | `error` | Every Promise MUST be awaited, returned, or explicitly voided. Backs the async correctness rules in Section 9. |
| `@typescript-eslint/no-inferrable-types` | `off` | Explicit annotations on inferrable types are permitted and encouraged for clarity. |
| `@typescript-eslint/no-unused-vars` | `error` | Prefix intentionally unused params/vars with `_`. |
| `no-param-reassign` | `warn` | Avoid reassigning function parameters. |

Class members in page objects and helpers SHOULD declare `public` or `private` explicitly. This is a project convention, not enforced by ESLint in this repository, but code reviews expect it.

---

## 4. Project Conventions vs. Official Playwright Best Practices

Playwright's official docs recommend a selector priority of `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId`. This project deliberately uses `getByTestId` as the primary selector because test IDs are stable across UI refactors and German-language label changes. Use role/label/text selectors only as a fallback when a test ID is unavailable.

Other deliberate conventions:

| Official Practice | Project Convention |
|---|---|
| Use fixtures for reusable setup | Global setup/teardown is primary; custom fixtures in `base/fixtures.ts` are recommended where sensible, not mandatory. |
| Avoid `nth()` / `first()` / `last()` | Same — avoid positional selectors. They are fragile when lists reorder. |
| Avoid `page.evaluate()` where Playwright API suffices | Same — prefer Playwright locators and interactions. |
| Don't test third-party components | Same — test the application, not Vuetify internals. |

---

## 5. Commands (Allowed Set)

Only suggest/use commands that are valid in this repo.

### npm scripts
- `npm ci`
- `npm run lint`
- `npm run lint:ci`
- `npm run type-check`
- `npm run format`
- `npm run check-format`
- `npm run generate-api`

### Playwright CLI
- `npx playwright install --with-deps`
- `npx playwright test`
- `npx playwright test --project chromium`
- `npx playwright test -g "@dev"`
- `npx playwright test --trace on`
- `PWDEBUG=1 npx playwright test`
- `npx playwright show-report`

Required runtime env for normal execution:
- `USER`, `PW`, `FRONTEND_URL`

Conditional env:
- `OTP_SEED_B32` (2FA)
- `LDAP_URL`, `LDAP_ADMIN_USER`, `LDAP_ADMIN_PASSWORD` (LDAP scenarios)

---

## 6. Mandatory POM Contract

Every page object models one frontend view and is split into:
1. **Locators** (encapsulated in page)
2. **Actions** (public test-facing interactions)
3. **Assertions** (public `assert*` methods)

Mandatory rules:
- Each page exposes `public async waitForPageLoad(): Promise<...>`.
- Tests must call page methods, never page locators directly.
- Keep one-off locators method-local; keep reused locators class-level.
- Public methods for test use; private methods for internal helpers.
- Navigation methods should return the destination page type.

Import `test` from `base/fixtures` when a spec needs the WebKit animation-disabling fix. Custom fixtures are recommended where sensible, not mandatory; prefer global setup/teardown for shared lifecycle.

Compact pattern:
```ts
export class ExampleViewPage {
  constructor(protected readonly page: Page) {}

  public async waitForPageLoad(): Promise<ExampleViewPage> {
    await expect(this.page.getByTestId('example-title')).toBeVisible();
    return this;
  }

  public async submit(): Promise<NextViewPage> {
    await this.page.getByTestId('submit-button').click();
    return new NextViewPage(this.page);
  }

  public async assertSuccess(): Promise<void> {
    await expect(this.page.getByTestId('success-message')).toBeVisible();
  }
}
```

---

## 7. Spec Authoring Rules

### Structure
- One spec file = one business use case.
- Keep specs orchestration-focused; put UI logic in page objects.
- Use `test.describe()` only where it improves grouping clarity.

### `test.step()` usage
- Use only for major fachliche phases: setup, action, verification.
- Keep step titles short, German, and outcome-focused.

### Parallel safety
- No module-level mutable state for created data.
- Keep state test-local or suite-local inside `test.describe()`.
- Ensure each test can run independently.

### Tags
- Import tags from `base/tags.ts` (`DEV`, `STAGE`, `SMOKE`).
- Tag array must be alphabetically ordered (e.g. `[DEV, STAGE]`).

---

## 8. Selector Strategy

Primary selector policy:
- Prefer `getByTestId(...)` with stable `data-testid` values.
- Avoid brittle deep CSS/XPath selector chains.

Naming convention for frontend test IDs:
- Kebab-case, e.g. `username-input`, `person-table`.
- Must be unique per page.
- Dynamic repeated elements should include unique suffixes (e.g. model id).

Vuetify limitation:
- If only top-level component has `data-testid`, chain to inner element:
  `page.getByTestId('search-filter-input').locator('input')`

---

## 9. Async & Wait Strategy

Mandatory:
- Await all Playwright interactions and assertions.
- Prefer web-first assertions (`expect(locator).toBeVisible()` etc.).

Preferred:
- Use `expect.soft(...)` for non-critical multi-assertion checks.
- Use polling assertions (`toPass`) instead of manual retry loops.

Avoid:
- Hardcoded sleeps/timeouts (`waitForTimeout`) unless strictly justified.
- Manual `waitFor` + separate `expect` where a direct web-first assertion is sufficient.

---

## 10. Test Data Lifecycle

### Global setup
`tests/global-setup.ts`:
- Logs in with initial admin credentials
- Creates worker-aligned admin users
- Bootstraps 2FA credentials

### Global teardown
`tests/global-teardown.ts`:
- Cleans data with `TAuto`-style prefixes
- Deletes persons, roles, classes, schools, and related service-provider data

Rules:
- Prefer API helpers in `base/api/*.ts` for test data creation.
- Do not handcraft duplicate cleanup flows in each spec when global teardown already covers lifecycle.
- Keep generated test data uniquely prefixed to remain cleanup-safe.

---

## 11. Security & Reliability Guardrails

- Never hardcode credentials, OTP seeds, LDAP secrets, or environment URLs in test code.
- Never log sensitive values (`USER`, `PW`, `OTP_SEED_B32`, LDAP passwords).
- Keep selectors and assertions deterministic to reduce flakiness.
- Use page-object boundaries consistently to minimize UI-change blast radius.

---

## 12. Anti-Patterns (Do Not Introduce)

| Anti-pattern | Do instead |
|---|---|
| Using Vitest/unit-testing conventions in this repo | Use Playwright E2E conventions only |
| Editing `base/api/generated/` manually | Regenerate client (`npm run generate-api`) |
| Tests reaching into page locators | Expose and call page methods |
| Missing `await` on async UI actions/assertions | Await all interactions/assertions |
| Hardcoded `waitForTimeout(...)` control flow | Prefer web-first assertions/polling |
| Shared mutable module-level test state | Keep test-local/suite-local state |
| Deep brittle selectors | Prefer stable `getByTestId(...)` selectors |
| Using `nth()` / `first()` / `last()` positional selectors | Rely on unique test IDs or meaningful text/role selectors |
| Using `page.evaluate()` where a Playwright locator exists | Use Playwright locators and interactions |
| Asserting Vuetify internal DOM structure | Assert user-visible behavior through stable selectors |

---

## 13. Quick Implementation Checklist (AI)

Before finishing a testing task, verify:
- Scope stays inside Playwright E2E repository conventions.
- Proposed commands are valid for this repo.
- Spec/page responsibilities remain separated (orchestration vs UI logic).
- Tags and selector strategy follow project rules.
- No generated API edits and no sensitive-data leakage.
- Async interactions are awaited and waits use web-first assertions.
