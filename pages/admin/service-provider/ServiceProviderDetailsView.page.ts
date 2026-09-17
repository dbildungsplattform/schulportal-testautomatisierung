import { expect, Locator, Page } from '@playwright/test';
import { DataTable } from '../../components/DataTable.page';
import { FooterDataTablePage } from '../../components/FooterDataTable.page';

type ItemsPerPage = 5 | 30 | 50 | 100 | 300;

export class ServiceProviderDetailsViewPage {
  private readonly card: Locator;
  private readonly nameField: Locator;
  private readonly sectionHeadline: Locator;
  private readonly sectionToggleButton: Locator;
  private readonly rollenerweiterungenTable: Locator;
  private readonly notAvailableHint: Locator;
  private readonly dataTable: DataTable;
  private readonly footer: FooterDataTablePage;

  constructor(protected readonly page: Page) {
    this.card = this.page.getByTestId('service-provider-details-card');
    this.nameField = this.page.getByTestId('service-provider-name');
    this.sectionHeadline = this.page.getByTestId('schulspezifische-rollenerweiterungen-section-headline');
    this.sectionToggleButton = this.page.getByTestId(
      'open-schulspezifische-rollenerweiterungen-section-headline-button',
    );
    this.rollenerweiterungenTable = this.page.getByTestId('rollenerweiterungen-table');
    this.notAvailableHint = this.page.getByText(
      'Dieses Angebot kann nicht für schulspezifische Rollenerweiterungen verwendet werden. ' +
        'In diesem Bereich werden daher keine Daten und Funktionen angeboten.',
      { exact: true },
    );
    this.dataTable = new DataTable(this.page, this.rollenerweiterungenTable);
    this.footer = new FooterDataTablePage(this.page);
  }

  /* actions */
  public async waitForPageLoad(): Promise<ServiceProviderDetailsViewPage> {
    await expect(this.page).toHaveURL(/\/admin\/angebote\/[^/]+$/);
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.card).toBeVisible();
    await expect(this.nameField).toBeVisible();
    return this;
  }

  public async expandRollenerweiterungenSection(): Promise<void> {
    await this.sectionHeadline.scrollIntoViewIfNeeded();
    await expect(this.sectionToggleButton).toHaveAttribute('aria-expanded', 'false');
    await this.sectionToggleButton.click();
    await expect(this.sectionToggleButton).toHaveAttribute('aria-expanded', 'true');
  }

  public async increaseItemsPerPage(value: ItemsPerPage): Promise<void> {
    await this.dataTable.setItemsPerPage(value);
  }

  /* assertions */
  public async assertGesamtuebersichtVisible(): Promise<void> {
    await expect(this.card).toBeVisible();
    await expect(this.nameField).toBeVisible();
  }

  public async assertSectionHeadlineVisible(): Promise<void> {
    await this.sectionHeadline.scrollIntoViewIfNeeded();
    await expect(this.sectionHeadline).toHaveText('Schulspezifische Rollenerweiterungen anzeigen');
  }

  public async assertRollenerweiterungenTableVisible(): Promise<void> {
    await expect(this.rollenerweiterungenTable).toBeVisible();
  }

  public async assertTableColumns(): Promise<void> {
    // This table hides the selection checkbox column, so there is no leading checkbox header to offset.
    const expectedHeaders: string[] = ['Dienststellennummer', 'Schulname', 'Erweiterte Rollen'];
    const headers: Locator = this.rollenerweiterungenTable.locator('thead th.v-data-table__th');
    await expect(headers).toHaveCount(expectedHeaders.length);
    for (const [index, title] of expectedHeaders.entries()) {
      await expect(headers.nth(index).locator('.v-data-table-header__content')).toHaveText(title);
    }
  }

  public async assertSchoolRow(kennung: string, schulname: string, rollenNamen: string[]): Promise<void> {
    const row: Locator = this.rollenerweiterungenTable
      .locator('tbody tr.v-data-table__tr')
      .filter({ hasText: kennung });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(schulname);
    for (const rollenName of rollenNamen) {
      await expect(row).toContainText(rollenName);
    }
  }

  public async assertSortedByDienststellennummerAscending(): Promise<void> {
    await this.dataTable.waitForDataLoad();
    const kennungen: string[] = await this.dataTable.getColumnData(0);
    const sorted: string[] = [...kennungen].sort((a: string, b: string) => a.localeCompare(b, 'de', { numeric: true }));
    expect(kennungen).toEqual(sorted);
  }

  public async assertHoverTitlesPresent(): Promise<void> {
    // Truncated cells expose the full value via the title attribute (hover tooltip).
    const rows: Locator = this.rollenerweiterungenTable.locator('tbody tr.v-data-table__tr');
    // Wait for a rendered data cell first, otherwise an empty count would pass this check vacuously.
    await expect(this.rollenerweiterungenTable.locator('.ellipsis-wrapper').first()).toBeVisible();
    const rowCount: number = await rows.count();
    for (let index: number = 0; index < rowCount; index++) {
      const row: Locator = rows.nth(index);
      for (const columnIndex of [1, 2]) {
        const wrapper: Locator = row.locator('td').nth(columnIndex).locator('.ellipsis-wrapper');
        const text: string = (await wrapper.innerText()).trim();
        await expect(wrapper).toHaveAttribute('title', text);
      }
    }
  }

  public async assertDefaultItemsPerPageIs30(): Promise<void> {
    await expect(this.footer.comboboxAnzahlEintraege.locator('.v-select__selection-text')).toHaveText('30');
  }

  public async assertRollenerweiterungenTableEmpty(): Promise<void> {
    // The parent overrides the table's no-data text with "noSchulenFound".
    await expect(this.rollenerweiterungenTable).toContainText('Keine Schulen gefunden.');
  }

  public async assertNotAvailableHint(): Promise<void> {
    await expect(this.notAvailableHint).toBeVisible();
  }
}
