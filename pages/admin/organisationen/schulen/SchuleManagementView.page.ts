import { expect, Locator, Page } from '@playwright/test';
import { DataTable } from '../../../components/DataTable.page';
import { MenuBarPage } from '../../../components/MenuBar.page';
import { SearchFilter } from '../../../components/SearchFilter';

export class SchuleManagementViewPage {
  /* add global locators here */
  private readonly schuleTable: DataTable;
  private readonly searchFilter: SearchFilter;
  private readonly table: Locator;
  private readonly headline: Locator;
  public readonly menu: MenuBarPage;

  constructor(protected readonly page: Page) {
    this.table = this.page.getByTestId('schule-table');
    this.schuleTable = new DataTable(this.page, this.table);
    this.searchFilter = new SearchFilter(this.page);
    this.headline = this.page.getByTestId('schule-management-headline');
    this.menu = new MenuBarPage(this.page);
  }

  /* actions */
  public async waitForPageLoad(): Promise<SchuleManagementViewPage> {
    await expect(this.headline).toHaveText('Schulverwaltung');
    await expect(this.table).not.toContainText('Daten werden abgerufen...');
    return this;
  }

  public async searchByText(text: string): Promise<void> {
    await this.searchFilter.searchByText(text);
  }

  public async setPageSize(size: 5 | 30 | 50 | 100 | 300): Promise<void> {
    await this.schuleTable.setItemsPerPage(size);
  }

  public async searchAndSyncItslearning(schulname: string): Promise<void> {
    await this.searchByText(schulname);

    await this.page.getByTestId('open-schule-itslearning-sync-dialog-icon').click();
    await expect(this.page.getByTestId('schule-activate-in-itslearning-confirmation-text')).toHaveText(
      `Wollen Sie die Daten der Schule ${schulname} an itslearning übertragen?`,
    );
    await this.page.getByTestId('schule-itslearning-sync-button').click();
    await expect(this.page.getByTestId('activate-schule-sync-itslearning-success-text')).toHaveText(
      `Die Schule ${schulname} wird in itslearning angelegt.`,
    );
    await this.page.getByTestId('close-schule-sync-itslearning-dialog-button').click();
    await this.waitForPageLoad();
  }

  /* assertions */
  public async checkManagementPage(): Promise<void> {
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.headline).toHaveText('Schulverwaltung');
    await expect(this.page.getByTestId('search-filter-input')).toBeVisible();
    await expect(this.page.getByTestId('apply-search-filter-button')).toBeVisible();
    await this.checkHeaders(['Dienststellennummer', 'Schulname', 'E-Mail-Adresse', 'itslearning-Status', 'Aktion']);
  }

  public async checkHeaders(expectedHeaders: string[]): Promise<void> {
    await this.schuleTable.checkHeaders(expectedHeaders);
  }

  public async checkRowCount(rowCount: number): Promise<void> {
    await this.schuleTable.checkRowCount(rowCount);
  }

  public async checkIfSchuleExists(schule: string): Promise<void> {
    await this.schuleTable.checkIfItemIsVisible(schule);
  }
}
