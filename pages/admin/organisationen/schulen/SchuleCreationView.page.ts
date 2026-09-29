import { expect, type Locator, Page } from '@playwright/test';
import { SchuleCreationSuccessPage } from './SchuleCreationSuccess.page';

export enum Schulform {
  Oeffentlich = 'öffentlich',
  Ersatz = 'ersatz',
}

export interface SchuleCreationParams {
  name: string;
  dienststellenNr: string;
  schulform: Schulform;
  emailAdress: string;
}

export class SchuleCreationViewPage {
  private readonly headline: Locator = this.page.getByTestId('schule-creation-headline');
  private readonly oeffentlicheSchuleOption: Locator = this.page.getByTestId('schulform-radio-button-0');
  private readonly ersatzSchuleOption: Locator = this.page.getByTestId('schulform-radio-button-1');
  private readonly dienststellenNrInputContainer: Locator = this.page.getByTestId('dienststellennummer-input');
  private readonly schulnameInputContainer: Locator = this.page.getByTestId('schulname-input');
  private readonly emailAdressInputContainer: Locator = this.page.getByTestId('email-adress-input');
  private readonly schuleVerwerfenButton: Locator = this.page.getByTestId('schule-creation-form-discard-button');
  private readonly schuleAnlegenButton: Locator = this.page.getByTestId('schule-creation-form-submit-button');

  constructor(protected readonly page: Page) {}

  /* actions */
  public async waitForPageLoad(): Promise<SchuleCreationViewPage> {
    await this.headline.waitFor({ state: 'visible' });
    await expect(this.headline).toHaveText('Neue Schule hinzufügen');
    return this;
  }

  public async createSchule(params: SchuleCreationParams): Promise<SchuleCreationSuccessPage> {
    const dienststellenNrInput: Locator = this.dienststellenNrInputContainer.locator('input');
    const schuleNameInput: Locator = this.schulnameInputContainer.locator('input');

    if (params.schulform === Schulform.Oeffentlich) {
      await this.oeffentlicheSchuleOption.click();
    } else {
      await this.ersatzSchuleOption.click();
    }

    await dienststellenNrInput.waitFor({ state: 'visible' });
    await dienststellenNrInput.fill(params.dienststellenNr);

    await schuleNameInput.waitFor({ state: 'visible' });
    await schuleNameInput.fill(params.name);

    const emailAdressInput: Locator = this.emailAdressInputContainer.locator('input');
    await emailAdressInput.waitFor({ state: 'visible' });
    await emailAdressInput.fill(params.emailAdress);

    await this.schuleAnlegenButton.waitFor({ state: 'visible' });
    await this.schuleAnlegenButton.click();

    return new SchuleCreationSuccessPage(this.page);
  }

  public async createAnother(): Promise<void> {
    await this.page.getByTestId('create-another-schule-button').click();
  }

  /* assertions */
  public async checkCreateForm(): Promise<void> {
    await expect(this.page.getByTestId('schule-creation-form')).toBeVisible();
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.headline).toHaveText('Neue Schule hinzufügen');
    await expect(this.page.getByTestId('close-layout-card-button')).toBeVisible();
    await expect(this.page.getByTestId('mandatory-fields-notice')).toHaveText(
      'Mit * markierte Felder sind Pflichtangaben.',
    );

    await expect(this.page.getByText('1. Schulform zuordnen', { exact: false })).toBeVisible();
    await expect(this.oeffentlicheSchuleOption).toBeVisible();
    await expect(this.ersatzSchuleOption).toBeVisible();

    await expect(this.page.getByText('2. Dienststellennummer eingeben', { exact: false })).toBeVisible();
    await expect(this.dienststellenNrInputContainer).toBeVisible();

    await expect(this.page.getByText('3. Schulname eingeben', { exact: false })).toBeVisible();
    await expect(this.schulnameInputContainer).toBeVisible();

    await expect(this.page.getByText('4. E-Mail-Adresse eingeben', { exact: false })).toBeVisible();
    await expect(this.emailAdressInputContainer).toBeVisible();

    await expect(this.schuleVerwerfenButton).toBeVisible();
    await expect(this.schuleAnlegenButton).toBeVisible();
  }
}
