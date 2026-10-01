import { expect, Page } from '@playwright/test';
import { BaseZuordnungWorkflowPage, TestIdsType } from './BaseWorkflow.page';
import { Autocomplete } from '../../../../components/Autocomplete';

export class VersetzenWorkflowPage extends BaseZuordnungWorkflowPage {
  /* add global locators here */
  private readonly schule: Autocomplete;
  private readonly klasse: Autocomplete;
  protected readonly ENDPOINT: string = 'personenkontext-workflow/**';

  protected readonly TEST_IDS: TestIdsType = {
    submitButton: 'klasse-change-submit-button',
    confirmButton: 'confirm-change-klasse-button',
    discardButton: 'klasse-change-discard-button',
    closeSuccessDialog: 'change-klasse-success-dialog-close-button',
    klasseSelect: 'klasse-change-klasse-select',
  } as const;

  constructor(protected readonly page: Page) {
    super(page);
    this.schule = new Autocomplete(this.page, this.page.getByTestId('klasse-change-schule-select'));
    this.klasse = new Autocomplete(this.page, this.page.getByTestId(this.TEST_IDS.klasseSelect));
  }

  /* actions */
  public async selectSchule(schule: string): Promise<void> {
    await this.schule.searchByTitle(schule, false);
  }

  public async selectKlasse(klasse: string): Promise<void> {
    await this.klasse.searchByTitle(klasse, false);
  }

  /* assertions */
  public async checkSelectedSchule(schule: string): Promise<void> {
    await this.schule.assertTextHard(schule);
  }

  public async checkSelectedKlasse(klasse: string): Promise<void> {
    await this.klasse.assertTextHard(klasse);
  }

  public async checkConfirmation(from: string, to: string): Promise<void> {
    await expect(this.page.getByTestId('change-klasse-confirmation-dialog-text')).toContainText(
      `Wollen Sie den Schüler aus Klasse ${from} in Klasse ${to} versetzen?`,
    );
  }
}
