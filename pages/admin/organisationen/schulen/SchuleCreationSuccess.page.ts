import { expect, Page } from '@playwright/test';
import { SchuleCreationViewPage, Schulform, type SchuleCreationParams } from './SchuleCreationView.page';
import { SchuleManagementViewPage } from './SchuleManagementView.page';

export class SchuleCreationSuccessPage {
  /* add global locators here */

  constructor(protected readonly page: Page) {}

  /* actions */
  public async waitForPageLoad(): Promise<void> {
    return this.page.getByTestId('schule-success-text').waitFor({ state: 'visible' });
  }

  public async goBackToCreateAnotherSchule(): Promise<SchuleCreationViewPage> {
    await this.page.getByTestId('create-another-schule-button').click();
    return new SchuleCreationViewPage(this.page);
  }

  public async goBackToList(): Promise<SchuleManagementViewPage> {
    await this.page.getByTestId('back-to-list-button').click();
    return new SchuleManagementViewPage(this.page);
  }

  /* assertions */
  public async checkSuccessfulCreation(params: SchuleCreationParams): Promise<void> {
    // header
    await expect(this.page.getByTestId('schule-creation-headline')).toHaveText('Neue Schule hinzufügen');
    await expect(this.page.getByTestId('schule-success-icon')).toBeVisible();
    await expect(this.page.getByTestId('schule-success-text')).toBeVisible();

    // buttons
    await expect(this.page.getByTestId('close-layout-card-button')).toBeVisible();
    await expect(this.page.getByTestId('create-another-schule-button')).toBeVisible();
    await expect(this.page.getByTestId('back-to-list-button')).toBeVisible();

    // key column
    await expect(this.page.getByTestId('following-data-created-text')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-form-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-dienststellennummer-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-name-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-emailAdress-label')).toBeVisible();

    // value column
    const schulform: string =
      params.schulform === Schulform.Oeffentlich
        ? 'Öffentliche Schulen Land Schleswig-Holstein'
        : 'Ersatzschulen Land Schleswig-Holstein';
    await expect(this.page.getByTestId('created-schule-form')).toHaveText(schulform);
    await expect(this.page.getByTestId('created-schule-dienststellennummer')).toHaveText(params.dienststellenNr);
    await expect(this.page.getByTestId('created-schule-name')).toHaveText(params.name);
    await expect(this.page.getByTestId('created-schule-emailAdress')).toHaveText(params.emailAdress);
  }
}
