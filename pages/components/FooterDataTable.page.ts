import { type Locator, Page } from '@playwright/test';

export class FooterDataTablePage {
  /* since the footer is within Vuetify's jurisdiction,
        we cannot specify test ids for Playwright and heavily rely on classes as locators */
  readonly page: Page;
  readonly comboboxAnzahlEintraege: Locator;
  readonly textAktuelleSeite: Locator;
  readonly textLetzteSeite: Locator;

  constructor(page: Page) {
    this.page = page;

    // Locator for the dropdown to select the number of entries per page
    this.comboboxAnzahlEintraege = page.locator('.v-data-table-footer__items-per-page .v-input');

    // Locator to identify the current page number
    this.textAktuelleSeite = page.locator('.v-data-table-footer__info');

    // Locator to identify the last page
    this.textLetzteSeite = page.locator('.v-pagination__next button:not(.v-btn--disabled)');
  }
}
