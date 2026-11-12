import { expect, type Locator, Page } from '@playwright/test';
import { SchuleEditSuccessPage } from './SchuleEditSuccess.page';

export class SchuleEditViewPage {
  private readonly headline: Locator;
  private readonly form: Locator;

  constructor(protected readonly page: Page) {
    this.headline = this.page.getByTestId('layout-card-headline');
    this.form = this.page.getByTestId('schule-edit-form');
  }

  public async waitForPageLoad(): Promise<SchuleEditViewPage> {
    await expect(this.headline).toHaveText('Schule bearbeiten');
    await expect(this.form).toBeVisible();
    return this;
  }

  public async editSchule(name: string, emailAddress?: string): Promise<SchuleEditSuccessPage> {
    await this.page.getByTestId('schulname-input').locator('input').fill(name);
    if (emailAddress !== undefined) {
      await this.page.getByTestId('email-adress-input').locator('input').fill(emailAddress);
    }
    await this.page.getByTestId('schule-edit-form-submit-button').click();
    return new SchuleEditSuccessPage(this.page).waitForPageLoad();
  }
}
