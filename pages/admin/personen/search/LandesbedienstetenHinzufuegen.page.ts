import { expect, Locator, Page } from '@playwright/test';
import { Autocomplete } from '../../../components/Autocomplete';
import { LandesbedienstetenSuccessPage } from './LandesbedienstetenSucess.page';

export class LandesbedienstetenHinzufuegenPage {
  constructor(protected readonly page: Page) {}
  /* add global locators here */
  private readonly headline: Locator = this.page.getByTestId('add-state-employee-headline');
  private readonly closeButtonX: Locator = this.page.getByTestId('close-layout-card-button');
  //Formular
  private readonly form: Locator = this.page.getByTestId('person-creation-form');
  private readonly mandatoryFieldsNotice: Locator = this.form.getByTestId('mandatory-fields-notice');
  private readonly hasNoKopersCheckbox: Locator = this.form.getByTestId('has-no-kopersnr-checkbox');
  // Inputfelder für die Dateneingabe bzw. Überprüfung der Werte
  private readonly vornameTextInputfield: Locator = this.form.getByTestId('add-person-vorname-input').locator('input');
  private readonly nachnameTextInputfield: Locator = this.form
    .getByTestId('add-person-familienname-input')
    .locator('input');
  private readonly kopersTextInputfield: Locator = this.form.getByTestId('kopersnr-input').locator('input');

  private readonly organisationAutocomplete: Autocomplete = new Autocomplete(
    this.page,
    this.page.getByTestId('personenkontext-create-organisation-select'),
  );

  private readonly rolleAutocomplete: Autocomplete = new Autocomplete(
    this.page,
    this.page.getByTestId('rollen-select'),
  );

  private readonly unbefristetRadio: Locator = this.form.getByTestId('unbefristet-radio-button');
  private readonly bisSchuljahresendeRadioInput: Locator = this.page.locator(
    'input[type="radio"][value="schuljahresende"][aria-label^="Bis Schuljahresende"]',
  );

  //Headlines
  private readonly personalInfoHeadline: Locator = this.form.getByTestId('personal-info-headline');
  private readonly organisationHeadline: Locator = this.form.getByTestId('organisation-assign-headline');
  private readonly rolleHeadline: Locator = this.form.getByTestId('rolle-assign-headline');
  private readonly befristungHeadline: Locator = this.form.getByTestId('befristung-assign-headline');
  //Buttons
  private readonly abbrechenButton: Locator = this.form.getByTestId('person-creation-form-discard-button');
  private readonly landesbedienstetenHinzufuegenButton: Locator = this.form.getByTestId(
    'person-creation-form-submit-button',
  );

  /* Bestaetigungspopup */
  private readonly confirmPopupHeadline: Locator = this.page.getByTestId('add-person-confirmation-dialog-headline');
  private readonly confirmPopupText: Locator = this.page.getByTestId('add-person-confirmation-text');
  private readonly confirmPopupAbbrechenButton: Locator = this.page.getByTestId(
    'cancel-add-person-confirmation-button',
  );
  private readonly confirmPopupLandesbedienstetenHinzufuegenButton: Locator =
    this.page.getByTestId('confirm-add-person-button');

  /* actions */
  public async waitForPageLoad(): Promise<void> {
    await expect(this.headline).toHaveText('Landesbediensteten hinzufügen');
    await this.personalInfoHeadline.waitFor({ state: 'visible' });
    await expect(this.personalInfoHeadline).toHaveText('1. Persönliche Informationen');
  }

  public async checkInitialFormState(vorname: string, nachname: string, kopers: string): Promise<void> {
    await expect(this.headline).toHaveText('Landesbediensteten hinzufügen');
    await expect(this.mandatoryFieldsNotice).toHaveText('Mit * markierte Felder sind Pflichtangaben.');
    await expect(this.closeButtonX).toBeVisible();
    await expect(this.vornameTextInputfield).toBeVisible();
    await expect(this.nachnameTextInputfield).toBeVisible();
    await expect(this.kopersTextInputfield).toBeVisible();
    await expect(this.hasNoKopersCheckbox).toBeVisible();
    await this.organisationAutocomplete.isVisible();
    await expect(this.abbrechenButton).toBeVisible();
    await expect(this.landesbedienstetenHinzufuegenButton).toBeVisible();
    await expect(this.personalInfoHeadline).toBeVisible();
    await expect(this.organisationHeadline).toBeVisible();
    await expect(this.landesbedienstetenHinzufuegenButton).toBeDisabled();
    // Persönliche Daten sind vorausgefüllt
    await this.personalDataAreFilled(vorname, nachname, kopers);
  }

  public async additionalCheckInitialFormState(organisation: string): Promise<void> {
    await expect(this.rolleHeadline).toBeVisible();
    expect(this.rolleAutocomplete.isVisible()).toBeTruthy();
    await this.organisationIsFilledAndDisabled(organisation);
  }

  public async organisationIsFilledAndDisabled(organisation: string): Promise<void> {
    await this.organisationAutocomplete.assertTextHard(organisation);
    await this.organisationAutocomplete.isDisabled();
  }

  public async personalDataAreFilled(vorname: string, nachname: string, kopers: string): Promise<void> {
    await expect(this.vornameTextInputfield).toHaveValue(vorname);
    await expect(this.nachnameTextInputfield).toHaveValue(nachname);
    await expect(this.kopersTextInputfield).toHaveValue(kopers);
  }

  public async selectOrganisation(organisation: string): Promise<void> {
    await this.organisationAutocomplete.searchByTitle(organisation, false);
    await expect(this.rolleHeadline).toBeVisible();
    expect(this.rolleAutocomplete.isVisible()).toBeTruthy();
  }

  public async assertAllMenuItemsForOrganisation(expectedOrganisations: string[]): Promise<void> {
    await this.organisationAutocomplete.assertAllMenuItems(expectedOrganisations);
  }

  public async selectRolle(rolle: string): Promise<void> {
    await this.rolleAutocomplete.searchByTitle(rolle, true);
    await expect(this.befristungHeadline).toBeVisible();
  }

  public async selectRolleAndConfirm(rolle: string): Promise<void> {
    await this.selectRolle(rolle);
    await this.landesbedienstetenHinzufuegenButton.click();
  }

  public async addLandesbedienstetenWithOrgaAndRolle(organisation: string, rolle: string): Promise<void> {
    await this.selectOrganisation(organisation);
    await this.selectRolle(rolle);
    await this.landesbedienstetenHinzufuegenButton.click();
  }

  public async verifyAddEmployeePopupIsShown(rolle: string, username: string): Promise<void> {
    await expect(this.confirmPopupHeadline).toHaveText('Landesbediensteten hinzufügen');
    await expect(this.confirmPopupText).toBeVisible();
    await expect(this.confirmPopupAbbrechenButton).toBeVisible();
    await expect(this.confirmPopupAbbrechenButton).toBeEnabled();
    await expect(this.confirmPopupLandesbedienstetenHinzufuegenButton).toBeVisible();
    await expect(this.confirmPopupLandesbedienstetenHinzufuegenButton).toBeEnabled();
    await expect(this.confirmPopupText).toContainText(`Wollen Sie ${username} als ${rolle} hinzufügen?`);
  }

  public async checkIfBefristungIsEnforced(): Promise<void> {
    await expect(this.befristungHeadline).toBeVisible();
    await expect(this.form.getByTestId('befristung-input')).toBeVisible();
    await expect(this.bisSchuljahresendeRadioInput).toBeVisible();
    await expect(this.unbefristetRadio).toBeVisible();
    await expect(this.bisSchuljahresendeRadioInput).toBeChecked();
    await expect(this.landesbedienstetenHinzufuegenButton).toBeEnabled();
  }

  public async clickAbbrechenOnConfirmationPopup(): Promise<void> {
    await this.confirmPopupAbbrechenButton.click();
    await expect(this.confirmPopupAbbrechenButton).toBeHidden();
    await expect(this.confirmPopupLandesbedienstetenHinzufuegenButton).toBeHidden();
    await expect(this.confirmPopupHeadline).toBeHidden();
    await expect(this.confirmPopupText).toBeHidden();
  }

  public async clickLandesbedienstetenHinzufügenOnConfirmationPopup(): Promise<LandesbedienstetenSuccessPage> {
    const landesbedienstetenSuccessPage: LandesbedienstetenSuccessPage = new LandesbedienstetenSuccessPage(this.page);
    await this.confirmPopupLandesbedienstetenHinzufuegenButton.click();
    await landesbedienstetenSuccessPage.waitForPageLoad();
    return landesbedienstetenSuccessPage;
  }
}
