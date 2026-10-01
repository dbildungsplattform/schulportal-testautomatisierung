import { expect, Locator, Page } from '@playwright/test';

export class BefristungsInput {
  private readonly unbefristetRadioButton: Locator;
  private readonly schuljahresendeRadioButton: Locator;

  constructor(protected readonly page: Page) {
    this.unbefristetRadioButton = this.page.getByTestId('unbefristet-radio-button').locator('input');
    this.schuljahresendeRadioButton = this.page.getByTestId('schuljahresende-radio-button').locator('input');
  }

  public async assertSelectedBefristungOption(option: 'unbefristet' | 'schuljahresende'): Promise<void> {
    if (option === 'schuljahresende') await expect(this.schuljahresendeRadioButton).toBeChecked();
    if (option === 'unbefristet') await expect(this.unbefristetRadioButton).toBeChecked();
  }

  public async assertUnbefristetDisabled(): Promise<void> {
    await expect(this.unbefristetRadioButton).toBeDisabled();
  }
}
