import { expect, type Locator, Page } from '@playwright/test';
import { waitForAPIResponse } from '../../base/api/baseApi';

type ItemsPerPage = 5 | 30 | 50 | 100 | 300;

export class DataTable {
  /* since the table is within Vuetify's jurisdiction,
      we cannot specify test ids for Playwright and heavily rely on classes as locators */
  readonly tableLocator: Locator;
  readonly selectedCountLocator: Locator | undefined;
  readonly footer: Locator;

  constructor(
    protected readonly page: Page,
    locator: Locator,
    selectedCountLocator?: Locator,
  ) {
    this.tableLocator = locator;
    this.selectedCountLocator = selectedCountLocator;
    this.footer = this.page.locator('.v-data-table-footer');
  }

  /* actions */

  public async waitForDataLoad(): Promise<void> {
    await expect(this.tableLocator).not.toContainText('Daten werden abgerufen...');
  }

  public getRow(expectedText: string): Locator {
    return this.tableLocator.locator(`tr:has-text("${expectedText}")`);
  }

  public async toggleSelectAllRows(select: boolean): Promise<void> {
    const checkbox: Locator = this.tableLocator.locator('thead input[type="checkbox"]').first();

    // Checkbox has 3 states (checked, unchecked, mixed), so max 2 clicks needed to reach desired state
    for (let i: number = 0; i < 2; i++) {
      if ((await checkbox.isChecked()) === select) break;
      await checkbox.click();
    }
  }

  public async selectRow(text: string): Promise<void> {
    const row: Locator = this.getRow(text);
    const rowCheckbox: Locator = row.locator('.v-selection-control');
    await rowCheckbox.click();
  }

  public async clickColumnHeader(columnName: string, endpoint?: string): Promise<void> {
    const header: Locator = this.tableLocator.locator('th').filter({ hasText: columnName });
    await header.click();

    if (endpoint) {
      await waitForAPIResponse(this.page, endpoint);
    }
    await this.page.waitForTimeout(500);
    await this.waitForDataLoad();
  }

  public async setItemsPerPage(value: ItemsPerPage): Promise<void> {
    await this.footer.locator('.v-data-table-footer__items-per-page .v-field__append-inner').click();
    await this.page.locator('.v-list-item').getByText(value.toString(), { exact: true }).click();
    await expect(this.footer.locator('.v-select__selection-text')).toHaveText(value.toString());
    await expect(this.page.locator('.v-overlay__content.v-select__content')).toBeHidden();
  }

  public async goToFirstPage(): Promise<void> {
    await this.page.locator('.v-pagination__first button:not(.v-btn--disabled)').click();
    await this.waitForDataLoad();
  }

  public async goToPreviousPage(): Promise<void> {
    await this.page.locator('.v-pagination__prev button:not(.v-btn--disabled)').click();
    await this.waitForDataLoad();
  }

  public async goToNextPage(): Promise<void> {
    await this.page.locator('.v-pagination__next button:not(.v-btn--disabled)').click();
    await this.waitForDataLoad();
  }

  public async goToLastPage(): Promise<void> {
    await this.page.locator('.v-pagination__last button:not(.v-btn--disabled)').click();
    await this.waitForDataLoad();
  }

  private getRows(): Locator {
    return this.tableLocator.locator('tbody tr.v-data-table__tr');
  }

  /**
   * NOTE: This function DOES NOT WAIT and returns what is on screen immediately!
   * @param columnIndex
   * @returns
   */
  public async getColumnData(columnIndex: number): Promise<string[]> {
    await this.waitForDataLoad();

    const rows: Locator[] = await this.getRows().all();
    const pageData: string[] = [];

    for (const row of rows) {
      const cell: Locator = row.locator('td').nth(columnIndex);
      const text: string | null = await cell.textContent();
      if (text) pageData.push(text.trim());
    }

    return pageData;
  }

  public getColumn(columnIndex: number): Locator {
    const rows: Locator = this.getRows();
    return rows.locator(`td.v-data-table__td:nth-child(${columnIndex + 1})`); // nth-child is 1-based
  }

  /* assertions */
  public async checkCurrentPageNumber(expectedPageNumber: number): Promise<void> {
    const currentPageNumberElement: Locator = this.page.locator('.v-pagination__item');
    const currentPageNumberText: string | null = await currentPageNumberElement.textContent();

    expect(Number(currentPageNumberText)).toBe(expectedPageNumber);
  }

  public async hasMultiplePages(): Promise<boolean> {
    const nextPageBtn: Locator = this.page.locator('.v-pagination__next button');
    return await nextPageBtn.isEnabled();
  }

  public async checkHeaders(expectedHeaders: string[]): Promise<void> {
    const tableHeaders: Locator[] = await this.tableLocator.locator('thead th.v-data-table__th').all();
    const tableHeadersCount: number = tableHeaders.length - 1; // frist th is for checkbox

    expect(tableHeadersCount).toEqual(expectedHeaders.length);

    for (let i: number = 0; i < tableHeadersCount; i++) {
      const cell: Locator = tableHeaders[i + 1].locator('.v-data-table-header__content');

      await expect(cell).toBeVisible();
      await expect(cell).toHaveText(expectedHeaders[i]);
    }
  }

  public async checkRowSelected(rowIdentifier: string): Promise<void> {
    const row: Locator = this.getRow(rowIdentifier);
    const rowCheckbox: Locator = row.locator('.v-selection-control');
    await expect(rowCheckbox.locator('input[type="checkbox"]')).toBeChecked();
  }

  public async checkRowCount(expectedRowCount: number): Promise<void> {
    const tableRows: Locator = this.getRows();
    await expect(tableRows).toHaveCount(expectedRowCount);
  }

  public async checkTableData(checkTableRow: (row: Locator) => Promise<void>): Promise<void> {
    const tableRows: Locator = this.getRows();
    for (const row of await tableRows.all()) {
      await checkTableRow(row);
    }
  }

  public async checkIfItemIsNotVisible(expectedText: string): Promise<void> {
    await expect(this.tableLocator.getByRole('cell', { name: expectedText, exact: true })).toBeHidden();
  }

  public async checkIfItemIsVisible(expectedText: string): Promise<void> {
    await expect(this.tableLocator.getByRole('cell', { name: expectedText, exact: true })).toBeVisible();
  }

  public async checkIfColumnHeaderSorted(
    columnName: string,
    sortingStatus: 'ascending' | 'descending' | 'not-sortable',
  ): Promise<void> {
    const header: Locator = this.tableLocator
      .locator('th')
      .filter({ has: this.page.getByText(columnName, { exact: true }) });

    if (sortingStatus === 'ascending') {
      await expect(header.locator('.mdi-arrow-up')).toBeVisible();
    } else if (sortingStatus === 'descending') {
      await expect(header.locator('.mdi-arrow-down')).toBeVisible();
    } else if (sortingStatus === 'not-sortable') {
      await expect(header).not.toHaveClass(/v-data-table__th--sortable/);
    }
  }

  public async checkIfColumnDataSorted(columnIndex: number, sortOrder: 'ascending' | 'descending'): Promise<void> {
    const columnLocator: Locator = this.getColumn(columnIndex);
    const sortedData: string[] = (await this.getColumnData(columnIndex)).sort((a: string, b: string): number => {
      const comparison: number = a.localeCompare(b, 'de', { numeric: true });
      return sortOrder === 'ascending' ? comparison : -comparison;
    });
    for (const [index, data] of sortedData.entries()) {
      await expect(columnLocator.nth(index)).toHaveText(data);
    }
  }

  public async checkCellInRow(rowIdentifier: string, cellIndex: number, expectedText: string): Promise<void> {
    const row: Locator = this.getRow(rowIdentifier);
    const cell: Locator = row.locator('td').nth(cellIndex);
    await expect(cell).toContainText(expectedText);
  }

  public async assertSelectedRowsByCount(expectedCount: number): Promise<void> {
    if (this.selectedCountLocator) {
      if (expectedCount > 0) {
        await expect(this.selectedCountLocator).toContainText(`${expectedCount} ausgewählt`);
      } else {
        await expect(this.selectedCountLocator).toBeHidden();
      }
    }
    const selectedRows: Locator = this.tableLocator.locator('tbody input[type="checkbox"]:checked');
    await expect(selectedRows).toHaveCount(expectedCount);
  }
}
