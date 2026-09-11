import { expect, Page } from '@playwright/test';
import { Autocomplete } from '../../components/Autocomplete';
import { ServiceProviderDetailsBySchuleViewPage } from './ServiceProviderDetailsBySchuleView.page';

export class ServiceProviderManagementBySchuleViewPage {
  constructor(protected readonly page: Page) {}

  private async waitForResultTableLoad(): Promise<void> {
    await expect(this.page.getByTestId('result-table')).not.toContainText('Daten werden abgerufen...');
  }

  public async waitForPageLoad(): Promise<ServiceProviderManagementBySchuleViewPage> {
    await expect(this.page).toHaveURL(/\/admin\/angebote\/schulspezifisch(?:\?.*)?$/);
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.page.getByTestId('reset-filter-button')).toBeVisible();
    return this;
  }

  public async filterBySchule(schuleName: string): Promise<void> {
    const schuleAutocomplete: Autocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('service-provider-management-by-schule-organisation-select'),
    );
    await schuleAutocomplete.searchByTitle(schuleName);
    await this.waitForResultTableLoad();
    await expect(this.page.getByTestId('layout-card-headline')).toContainText(schuleName);
  }

  public async openServiceProviderByName(angebotName: string): Promise<ServiceProviderDetailsBySchuleViewPage> {
    const row = this.page.locator('tr').filter({ hasText: angebotName });
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    await row.click();

    const detailsViewPage: ServiceProviderDetailsBySchuleViewPage = new ServiceProviderDetailsBySchuleViewPage(this.page);
    await detailsViewPage.waitForPageLoad();
    return detailsViewPage;
  }

  public async openServiceProviderDetailsById(
    angebotId: string,
    organisationId: string,
  ): Promise<ServiceProviderDetailsBySchuleViewPage> {
    // The frontend row click can omit the required orga query for multi-school users, causing the route guard to redirect back to the management page.
    await this.page.goto(
      `/admin/angebote/schulspezifisch/${encodeURIComponent(angebotId)}?orga=${encodeURIComponent(organisationId)}`,
    );
    await expect(this.page).toHaveURL((url: URL): boolean => {
      return (
        url.pathname === `/admin/angebote/schulspezifisch/${encodeURIComponent(angebotId)}` &&
        url.searchParams.get('orga') === organisationId
      );
    });

    const detailsViewPage: ServiceProviderDetailsBySchuleViewPage = new ServiceProviderDetailsBySchuleViewPage(this.page);
    await detailsViewPage.waitForPageLoad();
    await detailsViewPage.assertRollenerweiterungBearbeitenVisible();
    return detailsViewPage;
  }

  public async openServiceProviderDetails(
    angebotName: string,
    schuleName?: string,
  ): Promise<ServiceProviderDetailsBySchuleViewPage> {
    if (schuleName) {
      await this.filterBySchule(schuleName);
    }

    const detailsViewPage: ServiceProviderDetailsBySchuleViewPage = await this.openServiceProviderByName(angebotName);
    await detailsViewPage.assertRollenerweiterungBearbeitenVisible();
    return detailsViewPage;
  }
}
