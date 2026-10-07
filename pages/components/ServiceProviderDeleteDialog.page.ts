import { expect, Locator, Page } from '@playwright/test';

export class ServiceProviderDeleteDialogPage {
  private readonly confirmationText: Locator;
  private readonly cancelButton: Locator;
  private readonly deleteButton: Locator;
  private readonly successText: Locator;
  private readonly closeSuccessButton: Locator;

  constructor(protected readonly page: Page) {
    this.confirmationText = this.page.getByTestId('service-provider-delete-confirmation-text');
    this.cancelButton = this.page.getByTestId('cancel-service-provider-delete-dialog-button');
    this.deleteButton = this.page.getByTestId('service-provider-delete-button');
    this.successText = this.page.getByTestId('service-provider-delete-complete-text');
    this.closeSuccessButton = this.page.getByTestId('close-service-provider-delete-success-dialog-button');
  }

  /* actions */
  public async confirmDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  public async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.cancelButton).toBeHidden();
  }

  public async closeSuccessDialog(): Promise<void> {
    await this.closeSuccessButton.click();
    await expect(this.closeSuccessButton).toBeHidden();
  }

  /* assertions */
  public async assertConfirmationVisible(angebotName: string): Promise<void> {
    await expect(this.confirmationText).toHaveText(`Möchten Sie das Angebot ${angebotName} wirklich löschen?`);
    await expect(this.cancelButton).toBeVisible();
    await expect(this.deleteButton).toBeVisible();
  }

  public async assertSuccessVisible(angebotName: string): Promise<void> {
    await expect(this.successText).toHaveText(`Das Angebot ${angebotName} wurde erfolgreich gelöscht.`);
    await expect(this.closeSuccessButton).toBeVisible();
  }
}
