import { expect, Page, type Locator, type Response } from '@playwright/test';

const noDataMessage: string = 'Keine Daten gefunden.';
export class Autocomplete {
  private readonly overlayLocator: Locator;
  private readonly itemsLocator: Locator;
  private readonly modalToggle: Locator;
  private readonly inputLocator: Locator;
  private readonly loadingLocator: Locator;

  constructor(
    private readonly page: Page,
    private readonly locator: Locator,
  ) {
    this.overlayLocator = this.page.locator('div.v-overlay.v-menu');
    this.itemsLocator = this.page.locator('.v-overlay .v-list-item');
    this.modalToggle = this.locator.locator('.v-field__append-inner');
    this.inputLocator = this.locator.locator('.v-field__input input');
    this.loadingLocator = this.locator.locator('.v-field__loader');
  }

  private async getOverlayLocator(): Promise<Locator> {
    const menuId: string | null = await this.inputLocator.getAttribute('aria-controls');
    if (!menuId) {
      // fallback to the previous behavior if aria-controls isn't set for some reason
      return this.page.locator('div.v-overlay.v-menu.v-overlay--active');
    }
    return this.page.locator(`#${menuId}`);
  }

  private async waitForData(): Promise<void> {
    const overlay: Locator = await this.getOverlayLocator();
    await expect(overlay).not.toHaveText(noDataMessage);
  }
  public async selectByPosition(selection: number[]): Promise<string[]> {
    const selectedItems: string[] = [];
    await this.openModal();
    await this.waitForData();
    const items: Locator = this.itemsLocator;
    for (const index of selection) {
      const item: Locator = items.nth(index);
      selectedItems.push(await item.locator('.v-list-item-title').innerText());
      await item.click();
    }
    await this.closeModal();
    return selectedItems;
  }

  /**
   * Opens the modal, selects the title, closes the modal
   * @param title
   */
  public async selectByTitle(title: string): Promise<void> {
    await this.openModal();
    await this.waitForData();
    const item: Locator = this.itemsLocator.filter({
      has: this.page.getByText(title, { exact: true }),
    });
    await item.waitFor({ state: 'visible' });
    await item.click();
    await this.closeModal();
    await item.waitFor({ state: 'hidden' });
  }

  /*
  force: true skips the actionability checks (including the "is this 
  element the topmost event target" check) and dispatches the click 
  directly. This is the standard Playwright workaround for Vuetify 
  layouts where grid wrappers overlap interactive sub-elements.
  */
  public async openModal(): Promise<void> {
    await this.modalToggle.click({ force: true });
  }

  public async closeModal(): Promise<void> {
    // Escape nur drücken, wenn das Menü-Overlay noch offen ist – sonst
    // würde Escape den umschließenden Dialog (falls vorhanden) schließen.
    const menuOpen: boolean = await this.overlayLocator
      .first()
      .isVisible()
      .catch((): boolean => false);
    if (menuOpen) {
      await this.page.keyboard.press('Escape');
    }
    // Innerhalb eines Vuetify-Dialogs liegt admin-headline hinter dem Dialog-Scrim
    // und ist nicht klickbar. Den Klick deshalb nur außerhalb von Dialogen ausführen.
    const dialogOpen: boolean = await this.page
      .locator('.v-dialog .v-overlay__content')
      .first()
      .isVisible()
      .catch((): boolean => false);
    if (!dialogOpen) {
      await this.page.getByTestId('admin-headline').click();
    }
  }

  public async toggleModal(): Promise<void> {
    await this.modalToggle.click({ force: true });
  }

  public async clear(): Promise<void> {
    await this.inputLocator.clear();
  }

  // only works on comboboxes, where loading is set properly
  public async waitUntilLoadingIsDone(): Promise<void> {
    await expect(this.loadingLocator.getByRole('progressbar')).toBeHidden();
  }

  public async searchAndSelectMultipleByTitle(titles: string[]): Promise<void> {
    await this.openModal();
    await expect(this.itemsLocator.first()).toBeVisible();
    for (const title of titles) {
      await this.inputLocator.pressSequentially(title);
      await this.waitUntilLoadingIsDone();
      const item: Locator = this.itemsLocator.filter({
        hasText: new RegExp(`^${title}$`),
      });
      await expect(item).toBeVisible();
      await item.click();
      await expect(item).toHaveAttribute('aria-selected', 'true');
      await this.inputLocator.clear();
      await this.waitUntilLoadingIsDone();
      await expect(this.itemsLocator.first()).toBeVisible();
    }
    await this.closeModal();
  }

  public async searchByTitle(
    searchString: string,
    exactMatch: boolean = false,
    endpoint?: string,
    expectedHeaderText?: string,
  ): Promise<void> {
    const currentValue: string | null = await this.inputLocator.textContent();
    if (currentValue === searchString) {
      return;
    }
    await this.openModal();
    // Wait until the dropdown data has finished updating before typing, e.g. the
    // "X Klassen gefunden" header only shows the final count once loading is done.
    if (expectedHeaderText) {
      await expect(this.overlayLocator.locator('.filter-header')).toContainText(expectedHeaderText);
    }
    await this.clear();
    // Start listening BEFORE typing so we don't miss the response
    const responsePromise: Promise<Response> | null = endpoint
      ? this.page.waitForResponse('/api/' + endpoint + '*')
      : null;
    await this.inputLocator.pressSequentially(searchString);
    await this.waitForData();
    let item: Locator;

    if (exactMatch) {
      item = this.itemsLocator.filter({
        hasText: new RegExp(`^${searchString}$`),
      });
    } else {
      item = this.itemsLocator.filter({
        has: this.page.getByText(searchString),
      });
    }

    // When creating a Landesadministrator, after selecting a Land as an organisation, we must wait for the personenkontext workflow endpoint to return rollen,
    // because in that case the API call takes longer than in other cases.
    // This only occurs in the test case 'Einen Benutzer mit der Rolle Landesadmin anlegen' (Person.spec.ts),
    // in all other test cases we don't need the parameter 'endpoint'
    if (responsePromise) {
      await responsePromise;
    }
    await item.click();
    await this.closeModal();
  }

  /**
   * Expects the modal to be open
   * @param title
   */
  public async selectByName(name: string): Promise<void> {
    const option: Locator = this.itemsLocator.filter({
      hasText: name,
    });
    await option.click();
  }

  public async clickClearIcon(): Promise<void> {
    await this.locator.locator('.v-field__clearable').click();
  }

  /* assertions */
  public async assertThatNoDataWasFound(): Promise<void> {
    await expect(this.overlayLocator).toHaveText(noDataMessage);
  }

  public async validateItemNotExists(searchString: string, exactMatch: boolean = false): Promise<void> {
    await this.inputLocator.click();
    await this.inputLocator.fill(searchString);
    let item: Locator;

    if (exactMatch) {
      item = this.itemsLocator.filter({
        // use regex to search for an exact match
        hasText: new RegExp(`^${searchString}$`),
      });
    } else {
      // search for a string inside the item title
      item = this.itemsLocator.filter({
        has: this.page.getByText(searchString),
      });
    }

    await expect(item).toBeHidden();
  }

  public async validateItemExists(searchString: string, exactMatch: boolean = false): Promise<void> {
    await this.inputLocator.click();
    await this.inputLocator.fill(searchString);
    let item: Locator;

    if (exactMatch) {
      item = this.itemsLocator.filter({
        // use regex to search for an exact match
        hasText: new RegExp(`^${searchString}$`),
      });
    } else {
      // search for a string inside the item title
      item = this.itemsLocator.filter({
        has: this.page.getByText(searchString),
      });
    }

    await expect(item).toBeVisible();
  }

  public async assertTextHard(text: string): Promise<void> {
    await expect(this.locator).toHaveText(text);
  }

  public async assertTextSoft(text: string): Promise<void> {
    await expect(this.locator).toContainText(text);
  }

  public async assertAllMenuItems(expectedTexts: string[]): Promise<void> {
    await this.inputLocator.click();
    await expect(this.itemsLocator).toHaveText(expectedTexts);
  }

  public async isVisible(): Promise<void> {
    await expect(this.locator).toBeVisible();
  }

  public async isDisabled(): Promise<void> {
    await expect(this.inputLocator).toBeDisabled();
  }

  public async checkVisibleDropdownOptions(
    items: string[],
    exactCount: boolean = false,
    filterHeaderText?: string,
    partialMatch: boolean = false,
  ): Promise<void> {
    await this.inputLocator.click();
    const sortedItems: string[] = [...items].sort((a: string, b: string) =>
      a.localeCompare(b, 'de', { numeric: true }),
    );
    if (filterHeaderText) {
      await expect(this.overlayLocator.locator('.filter-header')).toContainText(filterHeaderText);
    }
    const options: Locator = this.overlayLocator.getByRole('option');
    if (exactCount) {
      const expectedCount: number = filterHeaderText ? sortedItems.length + 1 : sortedItems.length;
      await expect(options).toHaveCount(expectedCount, { timeout: 5000 });
    }

    // Virtual scroll only renders a subset of items at a time, so scroll the
    // list container incrementally and collect item text as it comes into view,
    // rather than scrolling to a specific (possibly unrendered) option.
    const listContainer: Locator = this.overlayLocator.locator('.v-list');
    const seen = new Set<string>();
    let previousScrollTop = -1;

    // Some options render additional text around the expected value (e.g. a
    // Dienststellennummer prefix), so allow substring matching when requested.
    const isSeen = (item: string): boolean =>
      partialMatch ? [...seen].some((text: string): boolean => text.includes(item)) : seen.has(item);

    for (let i = 0; i < 100; i++) {
      const texts: string[] = await options.allInnerTexts();
      texts.forEach((text: string): void => void seen.add(text.trim()));

      const missing: string[] = sortedItems.filter((item: string): boolean => !isSeen(item));
      if (missing.length === 0) {
        break;
      }

      const { scrollTop, scrollHeight, clientHeight } = await listContainer.evaluate(
        (el: Element): { scrollTop: number; scrollHeight: number; clientHeight: number } => ({
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        }),
      );
      if (scrollTop === previousScrollTop || scrollTop + clientHeight >= scrollHeight - 1) {
        break; // reached bottom or stopped making progress
      }
      previousScrollTop = scrollTop;
      await listContainer.evaluate((el: Element): void => {
        el.scrollBy(0, el.clientHeight);
      });
      // Give the virtual scroller enough time to render the newly revealed items
      // before the next read; too short a wait flakes on the last batch under load.
      await this.page.waitForTimeout(150);
    }

    const stillMissing: string[] = sortedItems.filter((item: string): boolean => !isSeen(item));
    expect(
      stillMissing,
      `Expected these items in the dropdown but never rendered them: ${stillMissing.join(', ')}`,
    ).toEqual([]);
  }

  public async checkAllDropdownOptionsClickable(items: string[], filterHeaderText?: string): Promise<void> {
    const sortedItems: string[] = [...items].sort((a: string, b: string) =>
      a.localeCompare(b, 'de', { numeric: true }),
    );
    await this.openModal();
    // Wait until the dropdown data has finished updating (e.g. after changing the
    // school filter) before typing – otherwise stale options remain and cause
    // strict-mode violations when filtering by name.
    if (filterHeaderText) {
      await expect(this.overlayLocator.locator('.filter-header')).toContainText(filterHeaderText);
    }
    await expect(this.itemsLocator.first()).toBeVisible();
    for (const item of sortedItems) {
      await this.inputLocator.pressSequentially(item);
      await this.waitUntilLoadingIsDone();
      const option: Locator = this.itemsLocator.filter({
        hasText: new RegExp(`^${item}$`),
      });
      await expect(option).toBeVisible();
      await option.click();
      await expect(option).toHaveAttribute('aria-selected', 'true');
      await this.inputLocator.clear();
      await this.waitUntilLoadingIsDone();
      await expect(this.itemsLocator.first()).toBeVisible();
    }
    await this.closeModal();
  }

  public async clickDropdownOption(item: string): Promise<void> {
    const option: Locator = this.page.getByRole('option', { name: item, exact: false });
    await expect(option).toBeVisible();
    await option.scrollIntoViewIfNeeded();
    await option.click({ force: true });
  }
}
