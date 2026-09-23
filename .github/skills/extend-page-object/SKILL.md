---
name: extend-page-object
description: 'Extends an existing Playwright page-object class with new locators and methods for an admin page in the Schulportal. Reads the existing file, inspects the target page live via Playwright MCP as Landesadmin, and adds new elements correctly and without conflicts. Use when asked to extend, update, or add methods to an existing page object class. Do not use for creating a brand-new page class (use create-page-object).'
---

# Extend Page Object

Extends an existing Playwright page-object class with new locators and methods. First analyzes the existing file, then inspects the target page live via Playwright MCP, then adds to the TypeScript class per project conventions — without changing existing code.

## Do Not Use When / See Also
- A completely new page class should be created → use [`create-page-object`](../create-page-object/SKILL.md) instead
- No login access to the target page is available

---

## Project Conventions

Full conventions: [docs/best-practices.md](../../../docs/best-practices.md)

### Block Order in a Page Class
```
1. Fields (private readonly locators, helper classes)
2. constructor
3. /* actions */   ← read and edit methods, waitForPageLoad()
4. /* assertions */ ← methods with assert prefix
```

### Reviewer Hardening (mandatory)

> This is the canonical version of this checklist. `create-playwright-test` and
> `playwright-test-workflow` link back here instead of repeating it in full.

- **Reuse before reimplementing:** Before writing new methods, search the target file and neighboring pages for existing logic (`complete*`, `navigate*`, `setup*`, `assert*`).
- **Locator deduplication:** If a locator pattern occurs multiple times in the same page, encapsulate it as a private helper method or field.
- **No dead code:** Newly added public methods must actually be called (spec/page) or be removed again.
- **Minimally invasive extension:** Only extend/parameterize existing methods when this reduces duplication; no parallel duplicate implementations.

---

## Workflow

### Phase 1 — Collect Inputs

The following information is required before implementation begins:

| Information | Required | Source |
|-------------|---------|--------|
| Target file (path to the `.page.ts` file) | ✅ | User |
| What should be added? (description of new actions / assertions) | ✅ | User |
| URL of the target page | ✅ | User |
| Login credentials or test user | ✅ | User / `global-setup.ts` |

> **Wait for all required information before starting Phase 2.**

---

### Phase 2 — Analyze the Existing File

Read the specified file in full and create a structured overview:

#### 2.1 — Determine class type
| Class declaration | Type |
|--------------------|-----|
| `export class XPage extends AbstractAdminPage` | extends AbstractAdminPage |
| `export class XPage` | Standalone |

#### 2.2 — Inventory existing fields
List all `private readonly` and `public readonly` fields. These **must not** be overwritten by new fields with the same name.

#### 2.3 — Inventory existing methods
List all `public` and `private` methods. Never reuse a method name.

Also check:
- Does a method already exist that fully or partially covers the desired flow?
- Can the existing method be extended with optional parameters instead of introducing a new, similar method?

#### 2.4 — Inventory existing imports
List all current imports so only genuinely missing ones get added.

#### 2.5 — Identify repeated locator patterns
Look for locator patterns that would be reused by the new requirements.

- If the same pattern is used 2+ times: encapsulate via a shared field or private helper method.
- Don't introduce multiple inline variants of the same selector across different methods.

**Expected result:** Complete list of existing fields, methods, and imports as the basis for the conflict check.

---

### Phase 3 — MCP Inspection of the Target Page

Always inspect the target page as **Landesadmin** — this role sees all UI elements regardless of system permissions.

1. **Open browser** — Navigate to the application's login page
2. **Log in** — Perform the login workflow (credentials from `global-setup.ts` or from the user)
3. **Navigate to the target page** — Open the URL specified by the user
4. **Create snapshot** — Run `browser_snapshot`
5. **Document new `data-testid` attributes** — Only elements relevant to the desired new functionality that are **not yet** present in the class:
   - Buttons (new actions)
   - Form fields
   - Dialogs / modals
   - Tables, dropdowns, autocomplete fields
6. **Determine interaction type** — For each new element: read-only, editable, or action-triggering?

**Expected result:** List of all new `data-testid` values with meaning and interaction type.

---

### Phase 4 — Implementation

Extend the existing file precisely. **Never** change existing lines — additions only.

#### 4.1 — Add imports
Only add what is genuinely newly needed and not yet imported:
- `Page`, `Locator`, `expect` from `@playwright/test`
- Helper classes (`DataTable`, `Autocomplete`, `SearchFilter`, etc.) only if newly used

#### 4.2 — Add new fields in the constructor
Only when a locator is used in **multiple** new methods:
```ts
private readonly neuerButton: Locator;
// ...in the constructor:
this.neuerButton = this.page.getByTestId('neuer-button-test-id');
```
Similarly for autocomplete or DataTable:
```ts
private readonly neueAutocomplete: Autocomplete;
// ...in the constructor:
this.neueAutocomplete = new Autocomplete(this.page, this.page.getByTestId('neue-autocomplete-test-id'));
```

#### 4.3 — Insert new methods

**In the `/* actions */` block** — new action methods:
```ts
public async neueAktion(param: string): Promise<void> {
  // locator kept method-local when only used here
  const locator: Locator = this.page.getByTestId('element-test-id');
  await locator.click();
}
```

**In the `/* assertions */` block** — new assertion methods (`assert` prefix):
```ts
public async assertNeuesElementSichtbar(): Promise<void> {
  await expect(this.page.getByTestId('element-test-id')).toBeVisible();
}
```

**Best practices for assertions:**
```ts
// Prefer web-first assertions
await expect(locator).toBeVisible();           // ✅
await locator.waitFor(); expect(true).toBe(true); // ❌

// expect.soft() for non-critical multi-checks
await expect.soft(locator).toHaveText('...');

// Bundle related assertions into one method
public async assertDialogInhalte(): Promise<void> {
  await expect.soft(this.headline).toBeVisible();
  await expect.soft(this.saveButton).toBeEnabled();
}
```

---

### Phase 5 — Validation

1. **Check TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```
2. **Run lint on the affected file:**
  ```bash
  npx eslint <target-file>
  ```
3. **Verify import paths** — Relative paths must be correct
4. **Repeat the conflict check** — No existing code may have been changed
5. **Reviewer quick checks:**
  - No newly introduced, unused public method
  - No unnecessarily duplicated locator strings
  - Similar existing logic was extended/parameterized with justification instead of duplicated

---

## Reference Example

### Starting point: PersonManagementViewPage

The file [pages/admin/personen/PersonManagementView.page.ts](../../../pages/admin/personen/PersonManagementView.page.ts) is a good reference example for a complex page class with `extends AbstractAdminPage`, several helper classes, and both method blocks.

**Existing fields (excerpt):**
```ts
private readonly personTable: DataTable;
private readonly organisationAutocomplete: Autocomplete;
private readonly table: Locator;
private readonly schuelerVersetzenDialogCard: Locator;
public readonly menu: MenuBarPage;
```

**Example: correctly adding a new field + method**

Starting point — constructor ends with:
```ts
    this.passwortZuruecksetzenDialogCard = this.page.getByTestId('password-reset-layout-card');
  }
```

Extension — new field in the constructor:
```ts
    this.passwortZuruecksetzenDialogCard = this.page.getByTestId('password-reset-layout-card');
    this.lockUserDialogCard = this.page.getByTestId('lock-user-layout-card');  // NEW
  }
```

New method in the `/* actions */` block at the end of the block:
```ts
  public async lockUser(): Promise<void> {
    await this.lockUserDialogCard.getByTestId('lock-user-submit-button').click();
  }
```

New assertion in the `/* assertions */` block:
```ts
  public async assertLockDialogVisible(): Promise<void> {
    await expect(this.lockUserDialogCard).toBeVisible();
  }
```

---

## Other Reference Files in the Project

| File | Pattern |
|-------|---------|
| [pages/admin/rollen/RolleDetailsView.page.ts](../../../pages/admin/rollen/RolleDetailsView.page.ts) | Detail page with edit and delete actions |
| [pages/admin/service-provider/ServiceProviderManagementView.page.ts](../../../pages/admin/service-provider/ServiceProviderManagementView.page.ts) | extends AbstractAdminPage, DataTable |
| [pages/components/DataTable.page.ts](../../../pages/components/DataTable.page.ts) | Reusable DataTable component |
| [pages/components/Autocomplete.ts](../../../pages/components/Autocomplete.ts) | Autocomplete component |

---

## Known Vuetify Pitfalls with Autocomplete/Dropdown Interactions

- **"No data found" on dropdown open:** Vuetify autocomplete fields often load data via API only once the field becomes visible/active; opening the dropdown before the response arrives shows a false empty state. Call `waitUntilLoadingIsDone()` after opening the dropdown, before accessing content.
- **DOM detachment during `pressSequentially`:** each keystroke can trigger an API search that re-renders the result list, detaching the element between find and click. Use `click({ force: true })` to skip Playwright's stability check (accepted pattern, see `Autocomplete.openModal()`).
- **Stale overlays:** Vuetify keeps previous overlay elements in the DOM, so a global selector like `.v-overlay .v-list-item` can match already-closed dropdowns. Scope to the active overlay only: `div.v-overlay--active`.

**Robust pattern for Vuetify autocomplete selection:**
```ts
// 1. Click input and type text (triggers API search)
await selectLocator.locator('input').click();
await selectLocator.locator('input').pressSequentially(suchtext);

// 2. Wait until loading is done
const autocomplete = new Autocomplete(this.page, selectLocator);
await autocomplete.waitUntilLoadingIsDone();

// 3. Only search within the active overlay, force-click due to DOM instability
const option = this.page.locator('div.v-overlay--active')
  .getByRole('option')
  .filter({ hasText: suchtext });
await option.first().click({ force: true });
```
