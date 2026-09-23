---
name: create-page-object
description: 'Creates a new Playwright page object for an admin page in the Schulportal via live MCP inspection (Playwright MCP) of the target page (data-testid attributes, interactive elements), then generates the TypeScript file per project conventions. Use when asked to create a new page object, add a page class, or implement a new page for the schulportal test automation project. Do not use for extending an existing page class (use extend-page-object) or for static/offline page-object generation from existing source (use create-playwright-page).'
---

# Create Page Object

Creates a new Playwright page object for an admin page of the Schulportal. Inspects the target page live via Playwright MCP, then generates the TypeScript class per project conventions.

## Do Not Use When / See Also
- Only extending or renaming an existing class → use [`extend-page-object`](../extend-page-object/SKILL.md) instead
- No login access to the target page is available

---

## Project Conventions

### File Naming Convention
| Type | Pattern | Example |
|-----|--------|---------|
| Convention | `<Name>.page.ts` | `PersonDetailsView.page.ts` |
| Standalone (no extend) | `<Name>.ts` or `<Name>.page.ts` | `SchulischeAngebotsverwaltungView.ts` |

### Storage Locations
```
pages/admin/personen/          ← Person views
pages/admin/organisationen/    ← Schools, Klassen (school classes)
pages/admin/rollen/            ← Rolle views
pages/admin/service-provider/  ← Service provider offerings
pages/components/              ← Reusable UI components
```

### Class Structure — with AbstractAdminPage (default)
```ts
import { expect, Page } from '@playwright/test';
import { AbstractAdminPage } from '../AbstractAdmin.page';
import { MenuBarPage } from '../../components/MenuBar.page';
// ... weitere Imports

export class MyViewPage extends AbstractAdminPage {
  private readonly someLocator: Locator;
  public readonly menu: MenuBarPage;

  constructor(protected readonly page: Page) {
    super(page);
    this.someLocator = this.page.getByTestId('some-test-id');
    this.menu = new MenuBarPage(this.page);
  }

  /* actions */
  public async waitForPageLoad(): Promise<MyViewPage> {
    await expect(this.page.getByTestId('layout-card-headline')).toHaveText('...');
    return this;
  }

  /* assertions */
  public async assertSomething(): Promise<void> {
    await expect(this.someLocator).toBeVisible();
  }
}
```

### Class Structure — Standalone (no extends)
Same shape, but: no `extends AbstractAdminPage`, no `super(page)` call, no `AbstractAdminPage` import.

### Available Helper Classes
| Class | Import | Usage |
|--------|--------|-----------|
| `DataTable` | `../../components/DataTable.page` | Tables with sorting, pagination, row selection |
| `Autocomplete` | `../../components/Autocomplete` | Search/filter dropdowns |
| `SearchFilter` | `../../components/SearchFilter` | Free-text search |
| `MenuBarPage` | `../../components/MenuBar.page` | Navigation menu |
| `AbstractAdminPage` | `../AbstractAdmin.page` | Base class for admin views |

---

## Workflow

### Phase 1 — Collect Inputs

The following information is required before implementation begins:

| Information | Required | Source |
|-------------|---------|--------|
| Class name of the new page | ✅ | User |
| File name (`*.page.ts`) | ✅ | User |
| Storage location in the project | ✅ | User |
| URL of the target page | ✅ | User |
| Which actions to cover (read / edit / delete) | ✅ | User |
| Login credentials or test user | ✅ | User / `global-setup.ts` |

> **Wait for all required information before starting Phase 2.**

### Mandatory Question — Class Type

**Ask this question explicitly before starting implementation — even if the user didn't answer it unprompted:**

> "Should the class use `extends AbstractAdminPage` (default for admin views with header/menu base functionality), or should it be a **standalone class** without inheritance?"

Wait for the answer. Only then proceed to Phase 2.

| Answer | Class declaration | `super(page)` in constructor | `AbstractAdminPage` import |
|---------|-------------------|------------------------------|---------------------------|
| `extends AbstractAdminPage` | `export class XPage extends AbstractAdminPage` | ✅ yes | ✅ yes |
| Standalone | `export class XPage` | ❌ no | ❌ no |

---

### Phase 2 — MCP Inspection of the Target Page

Use Playwright MCP to inspect the live page.

1. **Open browser** — Navigate to the application's login page
2. **Log in** — Perform the login workflow (credentials from `global-setup.ts` or from the user)
3. **Navigate to the target page** — Open the URL specified by the user
4. **Create snapshot** — Run `browser_snapshot` to capture the DOM state
5. **Document `data-testid` attributes** — List all relevant test IDs:
   - Headlines
   - Form fields and labels
   - Buttons (save, cancel, edit, delete)
   - Tables
   - Dropdowns / autocomplete fields
   - Dialogs / modals
6. **Determine interaction type** — Distinguish between:
   - Read-only (display-only)
   - Editable (input, select, checkbox)
   - Action-triggering (button, link)

**Expected result:** A list of all found `data-testid` values with their meaning.

---

### Phase 3 — Implement the Page Object

Create the TypeScript file at the specified storage location.

#### 3.1 — Choose imports
Only add imports that are actually needed (no dead code):
- `Page`, `Locator`, `expect` from `@playwright/test`
- Helper classes (`DataTable`, `Autocomplete`, etc.) only if used
- `AbstractAdminPage` only for the `extends` variant

#### 3.2 — Class declaration
```ts
export class <Name>Page {                   // Standalone
export class <Name>Page extends AbstractAdminPage {   // with extends
```

#### 3.3 — Constructor
- Declare all locators as `private readonly` fields
- Use `getByTestId(...)` for every test ID found
- Add `MenuBarPage` as `public readonly menu`
- For autocomplete fields: `new Autocomplete(this.page, this.page.getByTestId('...'))`
- For tables: `new DataTable(this.page, this.page.getByTestId('...'))`

#### 3.4 — Implement methods

**Required methods:**
```ts
public async waitForPageLoad(): Promise<MyViewPage> {
  // Wait for at least one characteristic headline or element
  // Best practice: check at least one unique headline with toHaveText()
  await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
  await expect(this.someCard).toBeVisible();
  await expect(this.headline).toContainText('...');
  return this;
}
```

**Read methods** (when data is only displayed):
```ts
public async getFieldValue(): Promise<string> {
  return await this.someLocator.innerText();
}
```

**Edit methods** (when fields are editable):
```ts
public async editField(value: string): Promise<void> {
  await this.someInput.fill(value);
}
public async saveChanges(): Promise<void> {
  await this.saveButton.click();
}
```

**Assertion methods** (`assert` prefix — per best-practices.md):
```ts
public async assertPageIsVisible(): Promise<void> {
  await expect(this.headline).toBeVisible();
}
public async assertFieldValue(expected: string): Promise<void> {
  await expect(this.someLocator).toHaveText(expected);
}
```

#### 3.5 — Comment method blocks
```ts
/* actions */
// read and edit methods

/* assertions */
// assert methods
```

---

### Phase 4 — Validation

1. **Check TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```
2. **Verify import paths** — Relative paths must be correct
3. **Optional re-check via MCP** — Run `waitForPageLoad()` on the real page and confirm it does not throw

---

## Reference Files in the Project

| File | Pattern |
|-------|---------|
| [pages/admin/service-provider/ServiceProviderManagementBySchuleView.page.ts](../../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page.ts) | Standalone class with filter autocomplete |
| [pages/admin/service-provider/ServiceProviderManagementView.page.ts](../../../pages/admin/service-provider/ServiceProviderManagementView.page.ts) | extends AbstractAdminPage, DataTable |
| [pages/admin/personen/PersonManagementView.page.ts](../../../pages/admin/personen/PersonManagementView.page.ts) | Complex example: DataTable, filter, dialogs, navigation to detail page |
| [pages/admin/rollen/RolleDetailsView.page.ts](../../../pages/admin/rollen/RolleDetailsView.page.ts) | Detail page with edit and delete actions |

Use these as worked examples instead of a separate inline sample output.

