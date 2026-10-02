import { expect, Locator, Page } from '@playwright/test';
import { SearchFilter } from '../../components/SearchFilter';
import { ServiceProviderDeleteDialogPage } from '../../components/ServiceProviderDeleteDialog.page';
import { ServiceProviderDetailsViewPage } from './ServiceProviderDetailsView.page';

export class ServiceProviderManagementViewPage {
  private readonly searchFilter: SearchFilter;
  private readonly deleteDialog: ServiceProviderDeleteDialogPage;
  private readonly errorAlertTitle: Locator;
  private readonly errorAlertText: Locator;
  private readonly errorAlertButton: Locator;

  constructor(protected readonly page: Page) {
    this.searchFilter = new SearchFilter(this.page);
    this.deleteDialog = new ServiceProviderDeleteDialogPage(this.page);
    this.errorAlertTitle = this.page.getByTestId('service-provider-management-error-alert-title');
    this.errorAlertText = this.page.getByTestId('service-provider-management-error-alert-text');
    this.errorAlertButton = this.page.getByTestId('service-provider-management-error-alert-button');
  }

  public async waitForPageLoad(): Promise<ServiceProviderManagementViewPage> {
    await expect(this.page).toHaveURL(/\/admin\/angebote(?:\?.*)?$/);
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    return this;
  }

  private getRow(angebotName: string): Locator {
    return this.page.locator('tr').filter({ hasText: angebotName });
  }

  public async searchByName(angebotName: string): Promise<void> {
    await this.searchFilter.searchByText(angebotName);
    await expect(this.getRow(angebotName)).toBeVisible();
  }

  public async openDeleteDialog(angebotName: string): Promise<ServiceProviderDeleteDialogPage> {
    await this.getRow(angebotName).getByTestId('open-service-provider-delete-dialog-icon').click();
    await this.deleteDialog.assertConfirmationVisible(angebotName);
    return this.deleteDialog;
  }

  public async closeErrorAlertAndReturnToList(): Promise<void> {
    await this.errorAlertButton.click();
    await expect(this.errorAlertTitle).toBeHidden();
  }

  public async openServiceProviderDetailsById(angebotId: string): Promise<ServiceProviderDetailsViewPage> {
    // Navigate by id: the full Angebote list is paginated and lacks a name filter, so a row click is unreliable.
    await this.page.goto(`/admin/angebote/${encodeURIComponent(angebotId)}`);

    const detailsViewPage: ServiceProviderDetailsViewPage = new ServiceProviderDetailsViewPage(this.page);
    await detailsViewPage.waitForPageLoad();
    return detailsViewPage;
  }

  /* assertions */
  public async assertServiceProviderPresent(angebotName: string): Promise<void> {
    await expect(this.getRow(angebotName)).toBeVisible();
  }

  public async assertServiceProviderAbsent(angebotName: string): Promise<void> {
    await expect(this.getRow(angebotName)).toHaveCount(0);
  }

  public async assertDeleteErrorAlert(expectedTitle: string, expectedText: string): Promise<void> {
    await expect(this.errorAlertTitle).toHaveText(expectedTitle);
    await expect(this.errorAlertText).toHaveText(expectedText);
    await expect(this.errorAlertButton).toBeVisible();
  }
}
