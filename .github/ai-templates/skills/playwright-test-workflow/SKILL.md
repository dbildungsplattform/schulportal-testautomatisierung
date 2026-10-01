---
name: playwright-test-workflow
description: 'End-to-end workflow that orchestrates create-page-object,
  create-playwright-test, and run-and-fix-test to turn a test description into a green
  Playwright test. Use when the user wants to automate a test end-to-end from a
  description. Do not use for a single sub-step only — use create-page-object or
  run-and-fix-test directly.'
---

# Playwright Test Workflow

Orchestrates the full path from a test description to a green test.
Invokes `create-page-object`, `create-playwright-test`, and `run-and-fix-test` in the correct order.

## Do Not Use When / See Also
- Only a page object should be created or extended → [`create-page-object`](../create-page-object/SKILL.md)
- Only a failing test should be fixed → [`run-and-fix-test`](../run-and-fix-test/SKILL.md)
- No login access to the target environment is available

---

## Workflow

### Phase 1 — Gather the Test Description

**Do not start** without complete inputs.

| Information | Required | Source |
|---|---|---|
| Business description of the test case (steps, goal) | ✅ | User / ticket |
| Acting role (Landesadmin, Schuladmin, …) | ✅ | User / description |
| Affected page(s) / URL(s) | ✅ | User / description |
| Tags (DEV, STAGE) | ⚪ | User (default: `[DEV]`) |

If the description is incomplete → ask the user **before** starting Phase 2.

**Expected result:** Complete test description including role and pages is available.

---

### Phase 2 — Check and Prepare Page Objects

Derive from the test description all required pages and methods.
For each required page, in turn:

#### Step 2.1 — Create or extend the page object

- Search `pages/` and `pages/admin/<area>/` for the page.
- **Missing page object** → run [`create-page-object`](../create-page-object/SKILL.md) in create mode.
- **Existing page object** → read it and continue with step 2.2.

#### Step 2.2 — Are all required methods and locators present?

- Read the existing page file and compare it against the requirements from the test description.
- **Check reuse-first:** before writing new methods, search `pages/` for existing logic (e.g. similar names like `complete*`, `navigate*`, `setup*`, `assert*`).
  - If matching logic exists: extend/parameterize the existing method instead of duplicating.
  - Only add a new method if no matching method exists.
- **Missing methods / locators** → run [`create-page-object`](../create-page-object/SKILL.md) in extend mode.
- **Everything present** → continue directly with Phase 3.

#### Step 2.3 — Check locator repetition and dead code

> See [`create-page-object`](../create-page-object/SKILL.md#3-check-reuse-and-conflicts) for
> the full reuse/dedup/no-dead-code checklist — apply it here too.

**Expected result:** All required page objects exist and contain all
required methods and locators.

---

### Phase 3 — Analyze Test-Data Needs and Check API Wrappers

Derive all required test-data constellations from the test description,
**before** starting the test implementation.

#### Step 3.1 — Derive test-data constellations

For each scenario in the description, determine:

| What | Question |
|---|---|
| Entities | Which Personen, Schulen, Klassen, Rollen, admins are needed? |
| Constellations | Positive cases, conflict cases, multi-Klasse scenarios? |
| Preconditions | Must certain roles/contexts already exist before the test? |
| Cleanup | Which entities does the global teardown remove via the `TAuto-PW` prefix? Is a local cleanup before test-run end exceptionally required? |

#### Step 3.2 — Check required API wrappers

Check in `base/api/` and `tests/helpers/` whether all helper functions for test-data setup exist.
Reference: [docs/testdaten.md](../../../docs/testdaten.md).

- **All wrappers present** → continue with step 3.3.
- **Missing wrappers** → add them to `base/api/` before the test implementation, then continue with step 3.3.

> **Constraint reminder:** Always create Schüler with Schule + Klasse together (`LERN_NOT_AT_SCHULE_AND_KLASSE`).
> Multi-Klasse scenarios: `createPersonWithZweiKlassenKontexte` instead of CREATE+COMMIT.
> Always create Schulen dynamically via API — no static constants from `base/organisation.ts`.

#### Step 3.3 — Present the test-data plan to the user for approval

**Before creating test data, output the plan in structured form and wait for confirmation.**

Output format:

```
## Test-Data Plan — Please review and confirm

### Scenarios and constellations
| Scenario | Entities | Constellation | Cleanup |
|---|---|---|---|
| Scenario 1 | 1x Schule, 2x Klasse, 3x Schüler (1 Klasse), 1x Schuladmin | Positive case | Schüler, Schule, Klassen |
| ... | ... | ... | ... |

### API functions (beforeEach)
- `createSchule(...)` → schoolA
- `createKlasse(...)` → classA1, classA2
- `createRolleAndPersonWithPersonenkontext(...)` × 3 → studentsSingleClass_A
- ...

### Cleanup
- Global teardown deletes Personen, Rollen, Klassen, and Schulen with the prefix `TAuto-PW` after the test run.
- Only list a local `afterEach` cleanup when there is a justified need, i.e. data must be removed before the test run ends.

---
Please confirm (yes) or specify changes.
```

> **Wait for the user's approval before starting Phase 4.**
> On change requests: adjust the plan and present it again.

#### Step 3.4 — Keep the approved test-data plan for Phase 4

Once the user approves, keep the finalized plan in context — no working file is needed;
it is passed directly to `create-playwright-test` in Phase 4.

**Expected result:** The user has approved the test-data plan.
The `beforeEach` setup will be implemented in Phase 4 exactly per this plan.

---

### Phase 4 — Create the Test

Fully run skill [`create-playwright-test`](../create-playwright-test/SKILL.md).
Pass the test description from Phase 1 and the approved test-data plan from Phase 3 as input.

**Expected result:** A new `.spec.ts` file was created (or an existing describe block
was extended) — including a complete `beforeEach` setup; the data is cleaned up by the global teardown.

---

### Phase 5 — Run and Fix the Test

Fully run skill [`run-and-fix-test`](../run-and-fix-test/SKILL.md).
Pass the test file path from Phase 4 as input.

**Expected result:** Test runs green. Brief summary: what was created,
what was changed.

---

### Phase 6 — PR Hardening (mandatory before completion)

Before the workflow counts as "done", run the following checks:

1. **TypeScript check:** `npx tsc --noEmit`
2. **Lint affected files:** `npx eslint <changed-files>`
3. **Reuse/dedup/no-dead-code checklist:** see [`create-page-object`](../create-page-object/SKILL.md#3-check-reuse-and-conflicts).
4. **Minimize test-data parameters and decide the Schule strategy:** see [`create-playwright-test`](../create-playwright-test/SKILL.md#reviewer-hardening-mandatory).

**Expected result:** Test is green **and** the code is reviewer-ready (low duplication, no dead code, clear test-data decisions).

---

## Flow Overview

```mermaid
flowchart TD
    A[Test description] --> B[Phase 1: check inputs]
    B --> C{Page object\nexists?}
    C -- No --> D[create-page-object]
    D --> E{Methods\ncomplete?}
    C -- Yes --> E
    E -- No --> F[create-page-object: extend mode]
    F --> G[Phase 3: analyze test data]
    E -- Yes --> G
    G --> G2{API wrapper\npresent?}
    G2 -- No --> G3[Add wrapper]
    G3 --> H[create-playwright-test]
    G2 -- Yes --> H
    H --> I[run-and-fix-test]
    I --> J[Test green ✅]