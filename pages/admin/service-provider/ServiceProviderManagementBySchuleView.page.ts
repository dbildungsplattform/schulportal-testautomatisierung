import { expect, Locator, Page } from '@playwright/test';
import { Autocomplete } from '../../components/Autocomplete';
import { DataTable } from '../../components/DataTable.page';
import { FooterDataTablePage } from '../../components/FooterDataTable.page';
import { ServiceProviderDetailsBySchuleViewPage } from './ServiceProviderDetailsBySchuleView.page';

export class ServiceProviderManagementBySchuleViewPage {
  private readonly resultTable: Locator;
  private readonly dataTable: DataTable;
  private readonly footer: FooterDataTablePage;
  private readonly schuleAutocomplete: Autocomplete;
  private readonly schuleFilterInput: Locator;

  constructor(protected readonly page: Page) {
    this.resultTable = this.page.getByTestId('result-table');
    this.dataTable = new DataTable(this.page, this.resultTable);
    this.footer = new FooterDataTablePage(this.page);
    this.schuleAutocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('service-provider-management-by-schule-organisation-select'),
    );
    this.schuleFilterInput = this.page
      .getByTestId('service-provider-management-by-schule-organisation-select')
      .locator('input');
  }

  private async waitForResultTableLoad(): Promise<void> {
    await expect(this.resultTable).not.toContainText('Daten werden abgerufen...');
  }

  public async waitForPageLoad(): Promise<ServiceProviderManagementBySchuleViewPage> {
    await expect(this.page).toHaveURL(/\/admin\/angebote\/schulspezifisch(?:\?.*)?$/);
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.page.getByTestId('reset-filter-button')).toBeVisible();
    return this;
  }

  public async filterBySchule(schuleName: string): Promise<void> {
    await this.schuleAutocomplete.searchByTitle(schuleName);
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

  /* assertions */

  public async assertHeadline(schuleName?: string): Promise<void> {
    const expectedText: string = schuleName ? `Angebotsverwaltung ${schuleName}` : 'Angebotsverwaltung';
    await expect(this.page.getByTestId('layout-card-headline')).toHaveText(expectedText);
  }

  public async assertSchuleFilterPreselectedAndDisabled(schuleName: string): Promise<void> {
    await this.schuleAutocomplete.isDisabled();
    await this.schuleAutocomplete.assertTextSoft(schuleName);
  }

  public async assertNoSchuleSelectedInFilter(): Promise<void> {
    await expect(this.schuleFilterInput).toHaveValue('');
  }

  public async assertSelectableSchulen(schulNamen: string[]): Promise<void> {
    await this.schuleAutocomplete.checkVisibleDropdownOptions(schulNamen, false, undefined, true);
  }

  public async assertChooseSchuleFirstHint(): Promise<void> {
    await expect(this.resultTable).toContainText('Bitte wählen Sie zunächst im Filter eine Schule aus.');
  }

  public async assertNoServiceProvidersFound(): Promise<void> {
    await expect(this.resultTable).toContainText('Keine passenden Angebote gefunden.');
  }

  public async checkHeaders(expectedHeaders: string[]): Promise<void> {
    // Unlike other tables in this project, this table hides the selection checkbox column, so no offset is needed.
    const headers: Locator = this.resultTable.locator('thead th.v-data-table__th');
    await expect(headers).toHaveCount(expectedHeaders.length);
    for (const [index, headerText] of expectedHeaders.entries()) {
      await expect(headers.nth(index).locator('.v-data-table-header__content')).toHaveText(headerText);
    }
  }

  public async assertServiceProviderRow(angebotName: string, kategorie: string, providedBy: string): Promise<void> {
    await this.dataTable.checkCellInRow(angebotName, 0, kategorie);
    await this.dataTable.checkCellInRow(angebotName, 2, providedBy);
  }

  public async assertPaginationVisible(): Promise<void> {
    await expect(this.footer.comboboxAnzahlEintraege).toBeVisible();
    await expect(this.footer.textAktuelleSeite).toBeVisible();
  }
}
