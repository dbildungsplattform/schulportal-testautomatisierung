import { expect, Page } from '@playwright/test';
import { RolleForm } from '../../../components/RolleForm';
import { Alert } from '../../components/Alert';
import { RolleCreationSuccessPage } from './RolleCreationSuccess.page';
import { RolleCreationParams, RolleCreationViewPage } from './RolleCreationView.page';

export class RolleCreationWorkflow {
  private readonly rolleForm: RolleForm;

  constructor(protected readonly page: Page) {
    this.rolleForm = new RolleForm(page);
  }

  /* actions */
  public async waitForPageLoad(): Promise<void> {
    await expect(this.page.getByTestId('rolle-creation-headline')).toHaveText('Neue Rolle hinzufügen');
  }

  public async selectAdministrationsebene(schulname: RolleCreationParams['administrationsebene']): Promise<void> {
    await this.rolleForm.adminstrationsebene.inputElement.searchByTitle(schulname, false);
  }

  public async selectName(name: RolleCreationParams['name']): Promise<void> {
    await this.rolleForm.enterRollenname(name);
  }

  public async selectArt(rollenart: RolleCreationParams['rollenart']): Promise<void> {
    await this.rolleForm.rollenart.inputElement.selectByTitle(rollenart);
  }

  public async selectMerkmale(merkmale: RolleCreationParams['merkmale']): Promise<void> {
    for (const merkmal of merkmale) {
      await this.rolleForm.merkmale.inputElement.selectByTitle(merkmal);
    }
  }

  public async selectSystemrechte(systemrechte: RolleCreationParams['systemrechte']): Promise<void> {
    for (const systemrecht of systemrechte) {
      await this.page.getByTestId('systemrechte-select').scrollIntoViewIfNeeded();
      await this.rolleForm.systemrechte.inputElement.selectByTitle(systemrecht);
    }
  }

  public async selectServiceProviders(serviceProviders: RolleCreationParams['serviceProviders']): Promise<void> {
    for (const provider of serviceProviders) {
      await this.rolleForm.angebote.inputElement.selectByTitle(provider);
    }
  }

  public async selectServiceProvidersByPosition(positions: number[]): Promise<void> {
    await this.rolleForm.angebote.inputElement.selectByPosition(positions);
  }

  public async submit(): Promise<RolleCreationSuccessPage> {
    await this.page.getByTestId('rolle-form-submit-button').click();
    return new RolleCreationSuccessPage(this.page).waitForPageLoad();
  }

  public async submitWithDuplicateNameError(): Promise<Alert<RolleCreationViewPage>> {
    await this.page.getByTestId('rolle-form-submit-button').click();
    return new Alert(
      this.page,
      {
        title: 'Fehler beim Anlegen der Rolle',
        button: 'Zurück zur Rollenanlage',
        text: 'Der Rollenname ist bereits vergeben. Bitte korrigieren Sie Ihre Eingabe.',
      },
      new RolleCreationViewPage(this.page),
    );
  }

  /* assertions */
  public async checkMessage(label: keyof RolleCreationParams, value: string): Promise<void> {
    switch (label) {
      case 'administrationsebene':
        await expect(this.rolleForm.adminstrationsebene.messages).toHaveText(value);
        break;
      case 'rollenart':
        await expect(this.rolleForm.rollenart.messages).toHaveText(value);
        break;
      case 'name':
        await expect(this.rolleForm.rollenname.messages).toHaveText(value);
        break;
    }
  }
}
