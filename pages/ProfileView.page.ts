import { expect, type Locator, Page } from '@playwright/test';
import { RollenArt } from '../base/api/generated';
import { LoginViewPage } from './LoginView.page';

export interface Zuordnung {
  dienststellennummer?: string;
  kopersnummer?: string;
  organisationsname: string;
  klassenName?: string;
  rollenart: RollenArt;
  rollenname: string;
}

export interface PersoenlicheDaten {
  kopersnummer?: string;
  nachname: string;
  rollenart: RollenArt;
  username: string;
  vorname: string;
}

export class ProfileViewPage {
  /* add global locators here */
  readonly loginViewPage: LoginViewPage;

  constructor(protected readonly page: Page) {
    this.loginViewPage = new LoginViewPage(page);
  }

  /* actions */
  public async waitForPageLoad(): Promise<ProfileViewPage> {
    await this.page.getByTestId('profile-headline').waitFor({ state: 'visible' });
    await expect(this.page.getByTestId('profile-headline')).toHaveText('Mein Profil');
    await expect(this.page.getByTestId('loading-spinner')).toBeHidden();
    return this;
  }

  public async getFirstSchuleName(): Promise<string> {
    return this.page.getByTestId('schule-value-1').innerText();
  }

  public async changePassword(username: string, password: string): Promise<string> {
    const passwordInput: Locator = this.page.getByTestId('password-input');
    const loginButton: Locator = this.page.getByTestId('login-button');

    await this.page.getByTestId('open-change-password-dialog-button').click();
    await this.page.getByTestId('change-password-button').click();

    await expect(this.page.getByTestId('login-prompt-text')).toHaveText('Bitte geben Sie Ihr aktuelles Passwort ein.');

    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(password);

    await loginButton.waitFor({ state: 'visible' });
    await loginButton.click();

    const newPassword: string = await this.loginViewPage.updatePassword();
    await this.page.getByTestId('close-password-changed-dialog-button').click();

    await expect(this.page.getByTestId('profile-headline')).toHaveText('Mein Profil');
    return newPassword;
  }

  public async resetInbetriebnahmePasswort(): Promise<string> {
    /* zuordnung card for password reset */
    await expect(this.page.getByTestId('reset-device-password-card-headline')).toBeVisible();
    await expect(this.page.getByTestId('device-password-info-text')).toBeVisible();
    await this.page.getByTestId('open-device-password-dialog-button').click();

    /* reset dialog */
    await expect(this.page.getByTestId('password-reset-dialog-header')).toHaveText('Inbetriebnahme-Passwort erzeugen');
    await expect(this.page.getByTestId('password-reset-info-text')).toHaveText(
      'Bitte notieren Sie sich das Passwort oder drucken Sie es aus. Nach dem Schließen des Dialogs wird das Passwort' +
        ' nicht mehr angezeigt. Sie benötigen dieses Passwort ausschließlich zur erstmaligen Anmeldung an Ihrem neuen LK-Endgerät.',
    );
    await this.page.getByTestId('password-reset-button').click();

    await this.validatePasswordResetDialog();

    const newPassword: string = await this.page
      .getByTestId('password-output-field')
      .locator('input[type="password"]')
      .inputValue();

    await this.page.getByTestId('close-password-reset-dialog-button').click();
    await expect(this.page.getByTestId('profile-headline')).toBeVisible();
    return newPassword;
  }

  public async openChangePasswordDialog(): Promise<void> {
    const changeButton: Locator = this.page.getByTestId('open-change-password-dialog-button');
    await expect(changeButton).toBeEnabled();
    await changeButton.click();

    const confirmButton: Locator = this.page.getByTestId('change-password-button');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
  }

  public async navigateBackToProfile(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  public async open2FADialog(): Promise<void> {
    await expect(this.page.getByTestId('two-factor-card')).toBeVisible();
    await expect(this.page.getByTestId('open-2FA-self-service-dialog-icon')).toBeEnabled();
    await this.page.getByTestId('open-2FA-self-service-dialog-icon').click();
  }

  public async proceedTo2FAQrCode(): Promise<void> {
    await this.page.getByTestId('proceed-two-factor-authentication-dialog').click();
  }

  public async proceedToOtpEntry(): Promise<void> {
    await this.page.getByTestId('proceed-two-factor-authentication-dialog').click();
  }

  public async close2FADialog(): Promise<void> {
    await this.page.getByTestId('close-two-factor-authentication-dialog').click();
  }

  /* assertions */
  public async submitEmptyOtpAndCheckError(): Promise<void> {
    await this.page.getByTestId('proceed-two-factor-authentication-dialog').click();
    await expect(this.page.getByTestId('self-service-otp-error-text')).toHaveText(
      'Das Einmalpasswort muss angegeben werden.',
    );
  }

  public async assertPersonalData(persoenlicheDaten: PersoenlicheDaten): Promise<void> {
    await expect(this.page.getByTestId('layout-card-headline-persoenliche-daten')).toHaveText('Persönliche Daten');
    await expect(this.page.getByTestId('fullname-label')).toHaveText('Vor- und Nachname:');
    await expect(this.page.getByTestId('fullname-value')).toHaveText(
      persoenlicheDaten.vorname + ' ' + persoenlicheDaten.nachname,
    );
    await expect(this.page.getByTestId('username-label')).toHaveText('Benutzername:');
    await expect(this.page.getByTestId('username-value')).toHaveText(persoenlicheDaten.username);

    if (persoenlicheDaten.rollenart === 'LEHR') {
      await expect(this.page.getByTestId('kopersnummer-label')).toHaveText('KoPers.-Nr.:');
      await expect(this.page.getByTestId('kopersnummer-value')).toBeVisible();
    } else {
      await expect(this.page.getByTestId('kopersnummer-label')).toBeHidden();
      await expect(this.page.getByTestId('kopersnummer-value')).toBeHidden();
    }
    await expect(this.page.getByTestId('info-icon')).toBeVisible();
  }

  // For each zuordnung, check if card is visible and contains the correct data
  public async assertZuordnungen(zuordnungen: Zuordnung[]): Promise<void> {
    for (let i: number = 0; i < zuordnungen.length; i++) {
      const index: number = i + 1;
      const zuordnung: Zuordnung = zuordnungen[i];

      await Promise.all([
        expect(this.page.getByTestId(`zuordnung-card-${index}-headline`)).toHaveText(
          zuordnungen.length === 1 ? 'Schulzuordnung' : `Schulzuordnung ${index}`,
        ),
        expect(this.page.getByTestId(`schule-label-${index}`)).toHaveText('Schule:'),
        expect(this.page.getByTestId(`schule-value-${index}`)).toHaveText(zuordnung.organisationsname),
        expect(this.page.getByTestId(`rolle-label-${index}`)).toHaveText('Rolle:'),
        expect(this.page.getByTestId(`rolle-value-${index}`)).toHaveText(zuordnung.rollenname),
      ]);

      if (zuordnung.klassenName) {
        await expect(this.page.getByTestId(`klasse-label-${index}`)).toHaveText('Klasse:');
        await expect(this.page.getByTestId(`klasse-value-${index}`)).toHaveText(zuordnung.klassenName);
      }

      if (zuordnung.rollenart === RollenArt.Sysadmin) {
        await Promise.all([
          expect(this.page.getByTestId(`dienststellennummer-label-${index}`)).toBeHidden(),
          expect(this.page.getByTestId(`dienststellennummer-value-${index}`)).toBeHidden(),
        ]);
      }

      if (['LEIT', 'LEHR', 'LERN', 'SCHULADMIN'].includes(zuordnung.rollenart)) {
        await Promise.all([
          expect(this.page.getByTestId(`dienststellennummer-label-${index}`)).toHaveText('DStNr.:'),
          expect(this.page.getByTestId(`dienststellennummer-value-${index}`)).toHaveText(
            zuordnung.dienststellennummer!,
          ),
        ]);
      }
    }
  }

  public async assertPasswordCard(): Promise<void> {
    await expect(this.page.getByTestId('new-password-card')).toBeVisible();
    await expect(this.page.getByTestId('open-change-password-dialog-button')).toBeEnabled();
  }

  public async assert2FACard(): Promise<void> {
    await expect(this.page.getByTestId('two-factor-card')).toBeVisible();
    await expect(this.page.getByTestId('open-2FA-self-service-dialog-icon')).toBeEnabled();
  }

  public async assertNo2FACard(): Promise<void> {
    await expect(this.page.getByTestId('two-factor-card')).toBeHidden();
    await expect(this.page.getByTestId('open-2FA-self-service-dialog-icon')).toBeHidden();
  }

  public async validatePasswordResetDialog(): Promise<void> {
    await expect(this.page.getByTestId('password-reset-info-text')).toHaveText(`
      Das Passwort wurde erfolgreich zurückgesetzt. Bitte notieren Sie sich das Passwort oder drucken Sie es aus.
      Nach dem Schließen des Dialogs wird das Passwort nicht mehr angezeigt.
      Sie benötigen dieses Passwort ausschließlich zur erstmaligen Anmeldung an Ihrem neuen LK-Endgerät.
    `);
    await expect(this.page.getByTestId('password-output-field').locator('input')).toBeVisible();
    await expect(this.page.getByTestId('password-output-field').locator('input')).toHaveAttribute('readonly');
    await expect(this.page.getByTestId('show-password-icon')).toBeVisible();
    await expect(this.page.getByTestId('copy-password-icon')).toBeVisible();
  }

  public async assertPasswordDialogUsernamePrompt(username: string): Promise<void> {
    await expect(this.page.getByTestId('attempted-username')).toHaveText(username);
    await expect(this.page.getByTestId('login-prompt-text')).toHaveText('Bitte geben Sie Ihr aktuelles Passwort ein.');
    await expect(this.page.getByTestId('password-input')).toBeEnabled();
  }

  public async assertPasswordCardVisible(): Promise<void> {
    await expect(this.page.getByTestId('new-password-card')).toBeVisible();
  }

  public async assertPasswordDialogState(username: string): Promise<void> {
    const usernameField: Locator = this.page.getByTestId('attempted-username');
    const loginPrompt: Locator = this.page.getByTestId('login-prompt-text');
    const passwordInput: Locator = this.page.getByTestId('password-input');

    await expect(usernameField).toHaveText(username);
    await expect(loginPrompt).toHaveText('Bitte geben Sie Ihr aktuelles Passwort ein.');
    await expect(passwordInput).toBeEnabled();
  }

  public async assert2FADialogIntro(): Promise<void> {
    await expect(this.page.getByTestId('layout-card-headline')).toHaveText('2FA einrichten');
    await expect(this.page.getByTestId('self-service-dialog-info-text')).toContainText('QR-Code generiert');
    await expect(this.page.getByTestId('self-service-dialog-warning-text')).toContainText(
      'App auf Ihrem Endgerät installiert',
    );
    await expect(this.page.getByTestId('proceed-two-factor-authentication-dialog')).toHaveText('Weiter');
    await expect(this.page.getByTestId('close-two-factor-authentication-dialog')).toHaveText('Abbrechen');
  }

  public async assert2FAQrCodeDisplayed(): Promise<void> {
    await expect(this.page.getByTestId('layout-card-headline')).toHaveText('Software-Token einrichten');
    await expect(this.page.getByTestId('self-service-dialog-qr-info-text')).toHaveText(
      'Bitte scannen Sie den QR-Code mit Ihrer 2FA-App (z.B. FreeOTP).',
    );
    await expect(this.page.getByTestId('software-token-dialog-qr-code')).toBeVisible();
  }

  public async assert2FAOtpEntryPrompt(): Promise<void> {
    await expect(this.page.getByTestId('layout-card-headline')).toHaveText('Zwei-Faktor-Authentifizierung (2FA)');
    await expect(this.page.getByTestId('self-service-otp-entry-info-text')).toHaveText(
      'Bitte geben Sie das angezeigte Einmalpasswort ein, um die Einrichtung abzuschließen.',
    );
    await expect(this.page.getByTestId('self-service-otp-input')).toBeVisible();
  }
}
