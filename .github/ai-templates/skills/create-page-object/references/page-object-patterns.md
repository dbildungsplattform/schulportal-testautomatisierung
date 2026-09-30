# Page Object Patterns

Load this reference when creating a page class or when local structure is unclear. Existing neighboring page objects remain the primary source of truth.

## File Placement

| Area | Location |
|---|---|
| Personen | `pages/admin/personen/` |
| Organisationen, Schulen, Klassen | `pages/admin/organisationen/` |
| Rollen | `pages/admin/rollen/` |
| Service providers | `pages/admin/service-provider/` |
| Reusable UI components | `pages/components/` |

Prefer `<Name>.page.ts`. Preserve an established neighboring naming pattern when it differs.

## Admin Page

```ts
import { expect, type Locator, type Page } from '@playwright/test';
import { AbstractAdminPage } from '../AbstractAdmin.page';

export class ExampleViewPage extends AbstractAdminPage {
  private readonly headline: Locator;

  public constructor(protected readonly page: Page) {
    super(page);
    this.headline = this.page.getByTestId('example-headline');
  }

  /* actions */

  public async waitForPageLoad(): Promise<ExampleViewPage> {
    await expect(this.headline).toBeVisible();
    return this;
  }

  /* assertions */

  public async assertHeadline(expected: string): Promise<void> {
    await expect(this.headline).toHaveText(expected);
  }
}
```

For a standalone class, omit `extends AbstractAdminPage`, its import, and `super(page)`.

## Locator Placement

Keep a locator local when one method uses it:

```ts
public async save(): Promise<void> {
  await this.page.getByTestId('save-button').click();
}
```

Use a field or private helper when multiple methods share it. Wrap tables, autocomplete fields, and search controls with the repository's existing helper classes when their behavior is needed.

## Reference Implementations

| File | Pattern |
|---|---|
| [ServiceProviderManagementBySchuleView.page.ts](../../../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page.ts) | Standalone page with autocomplete |
| [ServiceProviderManagementView.page.ts](../../../../pages/admin/service-provider/ServiceProviderManagementView.page.ts) | `AbstractAdminPage` and `DataTable` |
| [PersonManagementView.page.ts](../../../../pages/admin/personen/PersonManagementView.page.ts) | Complex page with dialogs and navigation |
| [RolleDetailsView.page.ts](../../../../pages/admin/rollen/RolleDetailsView.page.ts) | Detail page with edit and delete actions |
| [DataTable.page.ts](../../../../pages/components/DataTable.page.ts) | Reusable table component |
| [Autocomplete.ts](../../../../pages/components/Autocomplete.ts) | Reusable autocomplete component |
