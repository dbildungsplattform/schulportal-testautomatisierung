import { expect, Locator, Page } from '@playwright/test';
import { waitForAPIResponse } from '../../../../base/api/baseApi';
import { formatDateDMY, generateCurrentDate } from '../../../../base/utils/generateTestdata';
import { ZuordnungenPage, ZuordnungValidationParams } from './Zuordnungen.page';
import { PersonManagementViewPage } from '../PersonManagementView.page';
import { Autocomplete } from '../../../components/Autocomplete';

interface PersonDetailsValidationParams {
  username: string;
}

interface LockValidationParams {
  locked: boolean;
  from?: string;
  until?: string;
  reason?: string;
  organisation?: string;
}

interface AddSchulzuordnungParams {
  schuleName: string;
  rolleName: string;
  befristung: undefined | 'schuljahresende';
  /** Expected role name shown in the confirmation dialog, defaults to rolleName */
  confirmationRolleName?: string;
}

interface ChangeBefristungParams {
  dstNr: string;
  schuleName: string;
  nameRolle: string;
  oldDate: string;
  newDate: string;
}

export class PersonDetailsViewPage {
  private readonly zuordnungSection: ZuordnungenPage;

  // Befristung change locators
  private readonly buttonBefristungAendern: Locator;
  private readonly buttonBefristungAendernSubmit: Locator;
  private readonly buttonBefristungAendernConfirm: Locator;
  private readonly buttonBefristungAendernSave: Locator;
  private readonly buttonBefristungAendernSuccessClose: Locator;
  private readonly inputBefristung: Locator;
  private readonly errorTextInputBefristung: Locator;
  private readonly radioButtonBefristungSchuljahresende: Locator;
  private readonly radioButtonUnbefristet: Locator;

  // Add Schulzuordnung locators
  private readonly buttonAddSchulzuordnung: Locator;
  private readonly buttonBefristetSchuljahresende: Locator;
  private readonly buttonBefristungUnbefristet: Locator;
  private readonly buttonSubmitAddSchulzuordnung: Locator;
  private readonly buttonConfirmAddSchulzuordnung: Locator;
  private readonly buttonSaveZuordnung: Locator;
  private readonly buttonCloseZuordnungSuccess: Locator;

  constructor(protected readonly page: Page) {
    this.zuordnungSection = new ZuordnungenPage(page);

    // Befristung change
    this.buttonBefristungAendern = page.getByTestId('befristung-change-button');
    this.buttonBefristungAendernSubmit = page.getByTestId('change-befristung-submit-button');
    this.buttonBefristungAendernConfirm = page.getByTestId('confirm-change-befristung-button');
    this.buttonBefristungAendernSave = page.getByTestId('zuordnung-changes-save-button');
    this.buttonBefristungAendernSuccessClose = page.getByTestId('change-befristung-success-dialog-close-button');
    this.inputBefristung = page.locator('[data-testid="befristung-input"] input');
    this.errorTextInputBefristung = page.getByText('Das eingegebene Datum darf nicht in der Vergangenheit liegen.');
    this.radioButtonBefristungSchuljahresende = page.getByTestId('schuljahresende-radio-button');
    this.radioButtonUnbefristet = page.getByTestId('unbefristet-radio-button');

    // Add Schulzuordnung
    this.buttonAddSchulzuordnung = page.getByTestId('zuordnung-create-button');
    this.buttonBefristetSchuljahresende = page.getByLabel('Bis Schuljahresende (31.07.');
    this.buttonBefristungUnbefristet = page.getByLabel('Unbefristet');
    this.buttonSubmitAddSchulzuordnung = page.getByTestId('zuordnung-creation-submit-button');
    this.buttonConfirmAddSchulzuordnung = page.getByTestId('confirm-zuordnung-dialog-addition');
    this.buttonSaveZuordnung = page.getByTestId('zuordnung-changes-save-button');
    this.buttonCloseZuordnungSuccess = page.getByTestId('close-zuordnung-create-success-button');
  }

  /* ------------------------------------------------------------------ */
  /* actions                                                              */
  /* ------------------------------------------------------------------ */

  public async waitForPageLoad(): Promise<void> {
    await expect(this.page.getByTestId('person-details-headline')).toHaveText('Benutzer bearbeiten');
  }

  public async selectOrganisation(organisation: string): Promise<void> {
    const organisationAutocomplete: Autocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('personenkontext-create-organisation-select'),
    );
    await organisationAutocomplete.searchByTitle(organisation, false, 'personenkontext-workflow/**');
  }

  public async selectRolle(rolle: string): Promise<void> {
    const rolleAutocomplete: Autocomplete = new Autocomplete(this.page, this.page.getByTestId('rolle-select'));
    await rolleAutocomplete.searchByTitle(rolle, true);
    await expect(this.radioButtonUnbefristet).toBeVisible();
  }

  public async changePassword(fullName: string): Promise<void> {
    await this.page.getByTestId('open-password-reset-dialog-button').click();
    const successText: Locator = this.page.getByTestId('password-reset-info-text');
    await expect(successText).toContainText(
      `Sind Sie sicher, dass Sie das Passwort für ${fullName} zurücksetzen möchten?`,
    );
    await this.page.getByTestId('password-reset-button').click();
    await expect(successText).toContainText(`Das Passwort wurde erfolgreich zurückgesetzt.`);
    await this.page.getByTestId('close-password-reset-dialog-button').click();
  }

  public async editZuordnungen(): Promise<ZuordnungenPage> {
    await this.zuordnungSection.editZuordnungen();
    return this.zuordnungSection;
  }

  public async selectSchulzuordnungCheckbox(schuleName: string): Promise<void> {
    await this.page.getByTestId('person-zuordnungen-section-edit').getByTitle(schuleName).getByRole('checkbox').click();
  }

  /** Opens the Befristung dialog and asserts the radio button options are visible */
  public async openBefristungDialog(): Promise<void> {
    await this.buttonBefristungAendern.click();
    await expect(this.radioButtonBefristungSchuljahresende).toBeVisible();
    await expect(this.radioButtonUnbefristet).toBeVisible();
  }

  /**
   * Fills invalid dates and verifies the error appears each time,
   * then fills a valid intermediate date and verifies the error clears.
   * Does NOT set the final date — call setFinalBefristung() after this.
   */
  public async performBefristungValidation(): Promise<void> {
    // today — invalid
    await this.inputBefristung.fill(formatDateDMY(generateCurrentDate({ days: 0, months: 0 })));
    await expect(this.errorTextInputBefristung).toBeVisible();

    // past date — invalid
    await this.inputBefristung.fill(formatDateDMY(generateCurrentDate({ days: 0, months: -3 })));
    await expect(this.errorTextInputBefristung).toBeVisible();

    // future date — valid, error must clear
    await this.inputBefristung.fill(formatDateDMY(generateCurrentDate({ days: 22, months: 6 })));
    await expect(this.errorTextInputBefristung).toBeHidden();
  }

  /** Fills the final Befristung date and asserts no error is shown */
  public async setFinalBefristung(date: string): Promise<void> {
    await this.inputBefristung.fill(date);
    await expect(this.errorTextInputBefristung).toBeHidden();
  }

  /** Submits the Befristung change and asserts the confirmation dialog shows the correct dates */
  public async submitBefristungChange(oldDate: string, newDate: string): Promise<void> {
    await this.buttonBefristungAendernSubmit.click();
    await expect(
      this.page.getByText(`Möchten Sie die Befristung wirklich von ${oldDate} in ${newDate} ändern?`),
    ).toBeVisible();
    await this.buttonBefristungAendernConfirm.click();
  }

  /** Asserts the review heading, validates old/new date colors, then saves and closes */
  public async reviewAndSaveBefristungChange(params: {
    dstNr: string;
    schuleName: string;
    nameRolle: string;
    oldDate: string;
    newDate: string;
  }): Promise<void> {
    const { dstNr, schuleName, nameRolle, oldDate, newDate }: ChangeBefristungParams = params;

    await expect(
      this.page.getByRole('heading', {
        name: 'Bitte prüfen und abschließend speichern, um die Aktion auszuführen:',
      }),
    ).toBeVisible();

    // old date shown in red (removed)
    await this.validateEntireNameSchulzuordnung(
      dstNr,
      schuleName,
      nameRolle,
      'rgb(244, 67, 54)',
      'person-zuordnungen-section-edit',
      oldDate,
    );

    // new date shown in green (added)
    await this.validateEntireNameSchulzuordnung(
      dstNr,
      schuleName,
      nameRolle,
      'rgb(76, 175, 80)',
      'person-zuordnungen-section-edit',
      newDate,
    );

    await this.buttonBefristungAendernSave.click();
    await this.buttonBefristungAendernSuccessClose.click();
    await waitForAPIResponse(this.page, 'organisationen/parents-by-ids');
  }

  /** Asserts the new Schulzuordnung appears in green, then saves and closes */
  public async reviewAndSaveZuordnungAddition(params: {
    dstNr: string;
    schuleName: string;
    nameRolle: string;
  }): Promise<void> {
    const { dstNr, schuleName, nameRolle }: { dstNr: string; schuleName: string; nameRolle: string } = params;

    await expect(
      this.page.getByRole('heading', {
        name: 'Bitte prüfen und abschließend speichern, um die Aktion auszuführen:',
      }),
    ).toBeVisible();

    // new zuordnung shown in green (wird hinzugefügt)
    await this.validateEntireNameSchulzuordnung(
      dstNr,
      schuleName,
      nameRolle,
      'rgb(76, 175, 80)',
      'person-zuordnungen-section-edit',
    );

    await this.buttonSaveZuordnung.click();
    await this.buttonCloseZuordnungSuccess.click();
    await waitForAPIResponse(this.page, 'organisationen/parents-by-ids');
  }

  /**
   * Full flow for adding a new Schulzuordnung:
   * 1. Clicks "Schulzuordnung hinzufügen"
   * 2. Selects the organisation and rolle
   * 3. Sets the Befristung option (unbefristet or schuljahresende)
   * 4. Submits, confirms the dialog
   * 5. Saves and closes the success dialog
   * 6. Waits for API response
   *
   * Note: call editZuordnungen() before this method to enter edit mode first.
   */
  public async prepareSchulzuordnung(params: AddSchulzuordnungParams): Promise<void> {
    const { schuleName, rolleName, befristung, confirmationRolleName }: AddSchulzuordnungParams = params;

    await this.buttonAddSchulzuordnung.click();

    await this.selectOrganisation(schuleName);
    await this.selectRolle(rolleName);

    await this.buttonBefristetSchuljahresende.waitFor({ state: 'visible' });

    if (befristung === 'schuljahresende') {
      await this.buttonBefristetSchuljahresende.click();
    } else {
      await this.buttonBefristungUnbefristet.click();
    }

    // wait for the submit button to become enabled before clicking
    await expect(this.buttonSubmitAddSchulzuordnung).toBeEnabled();
    await this.buttonSubmitAddSchulzuordnung.click();

    const dialogRolleName: string = confirmationRolleName ?? rolleName;
    await expect(this.page.getByText(`Wollen Sie die Schulzuordnung als ${dialogRolleName} hinzufügen?`)).toBeVisible();
    await this.buttonConfirmAddSchulzuordnung.click();
  }

  public async addSoftwareToken(): Promise<void> {
    const dialogHeadline: Locator = this.page
      .getByTestId('two-factor-authentication-dialog')
      .getByTestId('layout-card-headline');

    await this.page.getByTestId('open-2FA-dialog-icon').click();
    await expect(dialogHeadline).toHaveText('Zwei-Faktor-Authentifizierung einrichten');
    await expect(this.page.getByTestId('software-token-radio-button')).toHaveText('Software-Token einrichten');
    await expect(
      this.page.getByText('Ein QR-Code wird generiert, welcher direkt eingescannt oder ausgedruckt werden kann.'),
    ).toBeVisible();
    await this.page.getByTestId('proceed-two-factor-authentication-dialog-button').click();
    await waitForAPIResponse(this.page, '2fa-token/**/');
    await expect(dialogHeadline).toHaveText('Software-Token einrichten');
    await expect(this.page.getByTestId('software-token-dialog-text')).toHaveText('QR-Code scannen oder ausdrucken.');
    await this.page.getByTestId('close-software-token-dialog-button').click();
  }

  public async resetSoftwareToken(): Promise<void> {
    const button2FA: Locator = this.page.getByTestId('open-2FA-dialog-icon');
    const buttonResetConfirm: Locator = this.page.getByTestId('two-way-authentification-set-up-button');

    await expect(button2FA).toHaveText('Token zurücksetzen');
    await button2FA.click();

    await expect(buttonResetConfirm).toHaveText('Zurücksetzen');
    await buttonResetConfirm.click();

    await expect(buttonResetConfirm).toHaveText('Schließen');
    await buttonResetConfirm.click();
  }

  public async clearRolle(): Promise<void> {
    const rolleAutocomplete: Autocomplete = new Autocomplete(this.page, this.page.getByTestId('rolle-select'));
    await rolleAutocomplete.clear();
  }

  public async createInbetriebnahmePasswort(): Promise<string> {
    await this.page.getByTestId('open-device-password-dialog-button').click();
    await this.page.getByTestId('password-reset-button').click();
    await waitForAPIResponse(this.page, 'personen/**/uem-password');
    await expect(this.page.getByTestId('password-reset-info-text')).toContainText(
      'Das Passwort wurde erfolgreich erzeugt.',
    );
    const newPassword: string = await this.page
      .getByTestId('password-output-field')
      .locator('input[type="password"]')
      .inputValue();
    await this.page.getByTestId('close-password-reset-dialog-button').click();
    await this.waitForPageLoad();
    return newPassword;
  }

  public async lockPerson(until?: string): Promise<void> {
    await this.page.getByTestId('open-lock-dialog-button').click();
    await expect(this.page.getByTestId('person-lock-card').getByTestId('layout-card-headline')).toHaveText(
      'Benutzer sperren',
    );
    await expect(this.page.getByTestId('person-lock-card').getByRole('combobox', { name: 'Öffnen' })).toHaveValue(
      'Land Schleswig-Holstein',
    );
    await expect(this.page.getByTestId('lock-user-info-text')).toHaveText(
      'Für die Dauer der Sperre hat der Benutzer keinen Zugriff mehr auf das Schulportal SH und die daran angeschlossenen Dienste.',
    );
    const befristungInput: Locator = this.page.getByTestId('befristung-input').getByPlaceholder('TT.MM.JJJJ');
    if (until) {
      await this.page.getByTestId('befristet-radio-button').getByLabel('Befristet').click();
      await expect(befristungInput).toBeVisible();
      await befristungInput.fill(until);
    } else {
      await expect(befristungInput).toBeHidden();
    }
    await this.page.getByTestId('lock-user-button').click();
  }

  public async deletePerson(options?: { clearFilter?: boolean }): Promise<PersonManagementViewPage> {
    await this.page.getByTestId('open-person-delete-dialog-button').click();
    await this.page.getByTestId('person-delete-button').click();
    await this.page.getByTestId('close-person-delete-success-dialog-button').click();
    const personManagementViewPage: PersonManagementViewPage = new PersonManagementViewPage(this.page);
    if (options?.clearFilter) {
      await personManagementViewPage.resetFilter();
    }
    return personManagementViewPage.waitForPageLoad();
  }

  public async resetPasswordAndCopyNew(): Promise<string> {
    await this.page.getByTestId('open-password-reset-dialog-button').click();
    await expect(this.page.getByTestId('password-reset-dialog-header')).toBeVisible();
    await this.page.getByTestId('password-reset-button').click();
    await this.page.getByTestId('password-reset-info-text').waitFor({ state: 'visible' });
    const newPassword: string = await this.page
      .getByTestId('password-output-field')
      .locator('input[type="password"]')
      .inputValue();
    await this.page.getByTestId('close-password-reset-dialog-button').click();
    return newPassword;
  }

  /* ------------------------------------------------------------------ */
  /* assertions                                                           */
  /* ------------------------------------------------------------------ */

  public async checkSections(expectedOptionalSections?: {
    twoFactor?: boolean;
    inbetriebnahmePasswort?: boolean;
  }): Promise<void> {
    await expect(this.page.getByTestId('password-reset-section-headline')).toBeVisible();
    await expect(this.page.getByTestId('zuordnungen-section-headline')).toBeVisible();
    await expect(this.page.getByTestId('status-section-headline')).toBeVisible();

    if (expectedOptionalSections?.twoFactor) {
      await expect(this.page.getByTestId('two-factor-section-headline')).toBeVisible();
    }

    if (expectedOptionalSections?.inbetriebnahmePasswort) {
      await expect(this.page.getByTestId('device-password-section-headline')).toBeVisible();
    }
  }

  public async checkInformation(params: PersonDetailsValidationParams): Promise<void> {
    await expect(this.page.getByTestId('person-username')).toHaveText(params.username);
  }

  public async check2FASetup(hasBeenSetup: boolean): Promise<void> {
    if (hasBeenSetup) {
      await expect(this.page.getByTestId('software-factor-setup-text')).toBeVisible();
      await expect(this.page.getByTestId('two-factor-reset-info-text')).toBeVisible();
    } else {
      await expect(this.page.getByTestId('two-factor-not-setup-text')).toBeVisible();
    }
  }

  public async checkSectionsNotVisible(sections: { twoFactor?: boolean }): Promise<void> {
    if (sections.twoFactor) {
      await expect(this.page.getByTestId('two-factor-section-headline')).toBeHidden();
      await expect(this.page.getByTestId('software-factor-setup-text')).toBeHidden();
      await expect(this.page.getByTestId('two-factor-reset-info-text')).toBeHidden();
      await expect(this.page.getByTestId('two-factor-not-setup-text')).toBeHidden();
      await expect(this.page.getByTestId('open-2FA-dialog-icon')).toBeHidden();
    }
  }

  public async checkBefristungAutoSelection(option: 'unbefristet' | 'schuljahresende'): Promise<void> {
    if (option === 'schuljahresende') {
      await expect(this.buttonBefristetSchuljahresende).toBeChecked();
    } else {
      await expect(this.buttonBefristungUnbefristet).toBeChecked();
    }
  }

  public async checkZuordnungExists(params: ZuordnungValidationParams): Promise<void> {
    await this.zuordnungSection.checkZuordnungExists(params);
  }

  public async checkPendingText(): Promise<void> {
    await expect(this.page.getByTestId('check-and-save-headline')).toBeVisible();
  }

  public async checkPendingZuordnungen(params: ZuordnungValidationParams): Promise<void> {
    await this.zuordnungSection.checkPendingZuordnungen(params);
  }

  public async checkSelectedBefristungOption(option: 'unbefristet' | 'schuljahresende'): Promise<void> {
    await this.zuordnungSection.checkSelectedBefristungOption(option);
  }

  public async checkPersonLock(params: LockValidationParams): Promise<void> {
    const icon: Locator = this.page.getByTestId('person-lock-info').locator('i');

    if (params.locked) {
      await expect(icon).toBeVisible();
      await expect(this.page.getByTestId('user-lock-status-text')).toHaveText('Dieser Benutzer ist gesperrt.');
      if (params.from) {
        await expect(this.page.getByTestId('lock-info-1-attribute')).toHaveText(params.from);
      }
      if (params.until) {
        await expect(this.page.getByTestId('lock-info-2-attribute')).toHaveText(params.until);
      }
    } else {
      await expect(icon).toBeHidden();
      await expect(this.page.getByTestId('user-lock-status-text')).toHaveText('Dieser Benutzer ist aktiv.');
    }
  }

  public async validateEntireNameSchulzuordnung(
    dstNr: string,
    schuleName: string,
    nameRolle: string,
    textColor: string,
    sectionTestId: string,
    befristungLehrerRolle?: string,
  ): Promise<void> {
    const expectedText: string = befristungLehrerRolle
      ? `${dstNr} (${schuleName}): ${nameRolle} (befristet bis ${befristungLehrerRolle})`
      : `${dstNr} (${schuleName}): ${nameRolle}`;

    await expect(this.page.getByTestId(sectionTestId).getByText(expectedText)).toHaveCSS('color', textColor);
  }

  public async assertUnbefristetIsDisabled(): Promise<void> {
    await expect(this.radioButtonBefristungSchuljahresende).toBeVisible();
    await expect(this.radioButtonUnbefristet).toBeVisible();
    await expect(this.radioButtonUnbefristet).toBeDisabled();
  }
}
