import { expect, type Locator, Page } from '@playwright/test';
import { oeffentlichLandSH } from '../../../../base/organisation';
import { SchuleManagementViewPage } from './SchuleManagementView.page';
import { SchuleEditViewPage } from './SchuleEditView.page';

export interface SchuleDetails {
  name: string;
  dstNr: string;
  emailAddress: string;
}

export class SchuleDetailsViewPage {
  private readonly headline: Locator;
  private readonly detailsContainer: Locator;

  constructor(protected readonly page: Page) {
    this.headline = this.page.getByTestId('layout-card-headline');
    this.detailsContainer = this.page.getByTestId('schule-details-container');
  }

  public async waitForPageLoad(): Promise<SchuleDetailsViewPage> {
    await expect(this.headline).toHaveText('Schule bearbeiten');
    await expect(this.detailsContainer).toBeVisible();
    return this;
  }

  public async openEdit(): Promise<SchuleEditViewPage> {
    await this.page.getByTestId('schule-edit-button').click();
    return new SchuleEditViewPage(this.page).waitForPageLoad();
  }

  public async close(): Promise<SchuleManagementViewPage> {
    await this.page.getByTestId('close-layout-card-button').click();
    return new SchuleManagementViewPage(this.page).waitForPageLoad();
  }

  public async assertSchuleDetails(schule: SchuleDetails): Promise<void> {
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.page.getByTestId('schule-dienststellennummer')).toHaveText(schule.dstNr);
    await expect(this.page.getByTestId('schule-name')).toHaveText(schule.name);
    await expect(this.page.getByTestId('schule-email')).toHaveText(schule.emailAddress);
    await expect(this.page.getByTestId('schultraegerform')).toHaveText(oeffentlichLandSH);
    await expect(this.page.getByTestId('schule-itslearning-enabled')).toHaveText('Nein');
    await expect(this.page.getByTestId('close-layout-card-button')).toBeVisible();
    await expect(this.page.getByTestId('schule-edit-button')).toBeVisible();
    await expect(this.page.getByTestId('schule-edit-button')).toBeEnabled();
  }
}
