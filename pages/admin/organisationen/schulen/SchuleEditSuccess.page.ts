import { expect, type Locator, Page } from '@playwright/test';
import { oeffentlichLandSH } from '../../../../base/organisation';
import { SchuleDetails, SchuleDetailsViewPage } from './SchuleDetailsView.page';
import { SchuleManagementViewPage } from './SchuleManagementView.page';

export class SchuleEditSuccessPage {
  private readonly successMessage: Locator;

  constructor(protected readonly page: Page) {
    this.successMessage = this.page.getByTestId('schule-success-text');
  }

  public async waitForPageLoad(): Promise<SchuleEditSuccessPage> {
    await expect(this.successMessage).toHaveText('Die Daten der Schule wurden erfolgreich geändert.');
    return this;
  }

  public async goBackToSchule(): Promise<SchuleDetailsViewPage> {
    await this.page.getByTestId('back-to-schule-button').click();
    return new SchuleDetailsViewPage(this.page).waitForPageLoad();
  }

  public async goBackToList(): Promise<SchuleManagementViewPage> {
    await this.page.getByTestId('back-to-list-button').click();
    return new SchuleManagementViewPage(this.page).waitForPageLoad();
  }

  public async assertSuccessfulUpdate(schule: SchuleDetails): Promise<void> {
    await expect(this.page.getByTestId('schule-success-icon')).toBeVisible();
    await expect(this.page.getByTestId('following-data-created-text')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-form-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-form')).toHaveText(oeffentlichLandSH);
    await expect(this.page.getByTestId('created-schule-dienststellennummer-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-dienststellennummer')).toHaveText(schule.dstNr);
    await expect(this.page.getByTestId('created-schule-name-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-name')).toHaveText(schule.name);
    await expect(this.page.getByTestId('created-schule-email-label')).toBeVisible();
    await expect(this.page.getByTestId('created-schule-email')).toHaveText(schule.emailAddress);
    await expect(this.page.getByTestId('close-layout-card-button')).toBeVisible();
    await expect(this.page.getByTestId('back-to-list-button')).toBeVisible();
    await expect(this.page.getByTestId('back-to-schule-button')).toBeVisible();
  }
}
