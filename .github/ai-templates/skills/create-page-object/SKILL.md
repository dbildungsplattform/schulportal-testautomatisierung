---
name: create-page-object
description: 'Creates or extends a Schulportal Playwright page object through live UI inspection and targeted frontend/backend source inspection. Use for a new page class, or to add page-object actions, assertions, or locators. Do not use for static/offline generation from source alone (use create-playwright-page), test creation, or fixing a failing test.'
---

# Create Page Object

Creates a missing page object or extends an existing one. Inspect only the behavior requested, then make the smallest page-object change that exposes it to tests.

## Do Not Use When / See Also
- Creating a Playwright spec → [`create-playwright-test`](../create-playwright-test/SKILL.md)
- Fixing an existing failing test → [`run-and-fix-test`](../run-and-fix-test/SKILL.md)
- Generating a page object from source without live inspection → use `create-playwright-page`
- No authenticated access to the target behavior and source inspection cannot establish it → ask the user for access or clarification

## Required Outcome

- One frontend view per page object.
- Locators stay inside the page object; tests use public actions and `assert*` methods.
- Every page object exposes `waitForPageLoad()` and navigation methods return the destination page type.
- One-off locators stay method-local; locators reused by multiple methods become fields or private helpers.
- Requested public methods count as intended API usage; do not require an existing spec call site.
- Prefer project helpers such as `DataTable`, `Autocomplete`, `SearchFilter`, `MenuBarPage`, and `AbstractAdminPage` when the neighboring implementation establishes their use.
- Follow the compact structures in [page-object-patterns.md](./references/page-object-patterns.md) when needed.

## Workflow

### 1. Resolve Inputs and Mode

From the request and repository evidence, resolve the requested behavior, acting role, target URL/view, target class, path, and whether the page object already exists. Ask only for values that cannot be derived reliably.

- Existing class: **extend mode**. Read the complete target file and inspect only nearby pages needed to find reusable behavior.
- Missing class: **create mode**. Infer name, path, and inheritance from the route and neighboring page objects. Ask when multiple choices remain plausible.

Do not require the user to confirm values already established by code. Never request credentials through chat; use the configured authenticated workflow or ask the user to enter secrets directly when required.

### 2. Inspect the Owning Surfaces

Inspect the live page as the actual acting role. Navigate to the required state and collect only selectors and interaction semantics needed by the requested methods. Prefer `getByTestId`; use role, label, placeholder, or text only when no test ID exists.

Use source inspection only when it resolves uncertainty:

| Repository | Path | Read-only purpose |
|---|---|---|
| E2E | current repository | Existing page objects, helpers, specs, and API wrappers |
| Frontend | `../schulportal-client` | Routes, permissions, view/component behavior, labels, and `data-testid` values |
| Backend | `../dbildungs-iam-server` | Controllers, DTOs, Swagger annotations, permissions, and endpoint behavior |

Before reading another repository, read its instructions: `../schulportal-client/AGENTS.md` for the frontend and `../dbildungs-iam-server/.github/copilot-instructions.md` for the backend. Frontend and backend access is read-only: report missing test IDs, application defects, or contract changes; do not edit those repositories. Load backend context only when frontend/live inspection cannot resolve API behavior, authorization, DTO shape, or API-backed setup.

For Vuetify autocomplete instability, load [vuetify-autocomplete.md](./references/vuetify-autocomplete.md).

### 3. Check Reuse and Conflicts

In extend mode, inventory only what affects the requested change: relevant imports, fields, methods, and repeated locator patterns.

- Reuse existing actions and assertions before adding new ones.
- Narrowly parameterize or refactor an existing method when that removes duplication while preserving current behavior.
- Do not add a parallel implementation of the same flow.
- Do not overwrite field or method names.

### 4. Implement

- Preserve block order: fields, constructor, `/* actions */`, `/* assertions */`.
- Import only used symbols and helpers.
- Use explicit member visibility and return types.
- Add `AbstractAdminPage`, `MenuBarPage`, and helper classes only when needed.
- Use web-first assertions and await every Playwright operation.
- Keep the change limited to requested behavior.

### 5. Detect API-Client Drift and Hand Off

Generated clients are read-only. Treat the client as missing or stale only with concrete evidence, such as a backend operation/type absent from generated code or a signature mismatch. Backend modification time alone is not evidence.

If drift blocks the work, stop and tell the user:

> The generated API client appears missing or stale.
> E2E client: run `npm run generate-api` in `schulportal-testautomatisierung`.
> Frontend client: run `npm run generate-client` in `schulportal-client` if the frontend consumes the changed contract.
> Generated files will not be edited manually.

Do not run generation from this skill. Resume after the user completes or explicitly delegates the handoff.

### 6. Validate

After every TypeScript edit, check editor TypeScript and ESLint diagnostics. With explicit user approval for commands, run the documented checks:

```bash
npm run type-check
npx eslint <target-file>
```

When practical, re-run the changed page-object behavior against the live page as the acting role. Confirm imports resolve, no requested method duplicates existing behavior, and locator strings are not unnecessarily repeated.

