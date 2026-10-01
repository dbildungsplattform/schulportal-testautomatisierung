import { expect, type Locator, Page } from '@playwright/test';
import { BaseZuordnungWorkflowPage, TestIdsType } from './BaseWorkflow.page';
import { BefristungsInput } from '../../../../components/BefristungsInput.page';

export class BefristungWorkflowPage extends BaseZuordnungWorkflowPage {
  /* add global locators here */
  protected readonly ENDPOINT: string = 'befristung-change/**';
  private readonly befristungsInput: BefristungsInput;

  protected readonly TEST_IDS: TestIdsType = {
    submitButton: 'change-befristung-submit-button',
    confirmButton: 'confirm-change-befristung-button',
    discardButton: 'befristung-discard-button',
    closeSuccessDialog: 'change-befristung-success-dialog-close-button',
    klasseSelect: 'befristung-klasse-select',
  } as const;

  constructor(protected readonly page: Page) {
    super(page);
    this.befristungsInput = new BefristungsInput(page);
  }

  /* actions */
  public async fillBefristungInput(befristung: string): Promise<void> {
    const befristungInput: Locator = this.page.getByTestId('befristung-input').locator('input');
    await befristungInput.waitFor({ state: 'visible' });
    await befristungInput.fill(befristung);
  }

  public async selectBefristungOption(option: 'unbefristet' | 'schuljahresende'): Promise<void> {
    await this.page.getByTestId(`${option}-radio-button`).locator('input').check();
  }

  /* assertions */
  public async assertErrorMessageVisibility(shouldBeVisible: boolean): Promise<void> {
    const locator: Locator = this.page.getByText('Das eingegebene Datum darf nicht in der Vergangenheit liegen.');
    if (shouldBeVisible) {
      await expect(locator).toBeVisible();
    } else {
      await expect(locator).toBeHidden();
    }
  }

  public async assertConfirmationIsVisible(oldValue: string, newValue: string): Promise<void> {
    await expect(
      this.page.getByText(`Möchten Sie die Befristung wirklich von ${oldValue} in ${newValue} ändern?`),
    ).toBeVisible();
  }

  public async assertSelectedBefristungOption(option: 'unbefristet' | 'schuljahresende'): Promise<void> {
    await this.befristungsInput.assertSelectedBefristungOption(option);
  }

  public async assertUnbefristetDisabled(): Promise<void> {
    await this.befristungsInput.assertUnbefristetDisabled();
  }
}
