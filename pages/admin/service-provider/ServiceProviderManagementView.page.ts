import { expect, Page } from '@playwright/test';
import { ServiceProviderDetailsViewPage } from './ServiceProviderDetailsView.page';

export class ServiceProviderManagementViewPage {
  constructor(protected readonly page: Page) {}

  public async waitForPageLoad(): Promise<ServiceProviderManagementViewPage> {
    await expect(this.page).toHaveURL(/\/admin\/angebote(?:\?.*)?$/);
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    return this;
  }

  public async openServiceProviderDetailsById(angebotId: string): Promise<ServiceProviderDetailsViewPage> {
    // Navigate by id: the full Angebote list is paginated and lacks a name filter, so a row click is unreliable.
    await this.page.goto(`/admin/angebote/${encodeURIComponent(angebotId)}`);

    const detailsViewPage: ServiceProviderDetailsViewPage = new ServiceProviderDetailsViewPage(this.page);
    await detailsViewPage.waitForPageLoad();
    return detailsViewPage;
  }
}
