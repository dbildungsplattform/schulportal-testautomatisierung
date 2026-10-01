import { expect, Locator, Page } from '@playwright/test';
import { TOTP } from 'totp-generator';

import { getSecretFromTokenQRCode, SharedCredentialManager } from '../base/2fa';
import { PersonManagementViewPage } from './admin/personen/PersonManagementView.page';
import { ProfileViewPage } from './ProfileView.page';

export interface TwoFactorSetupResult {
  page: ProfileViewPage;
  otpSecret: string;
}

export class TwoFactorWorkflowPage {
  private expires: number | undefined;

  constructor(
    protected readonly page: Page,
    private readonly username?: string,
  ) {}

  public async completeTwoFactorAuthentication(): Promise<PersonManagementViewPage> {
    const setupButton: Locator = this.getSecondFactorSetupButtonLocator();
    const requires2FASetup: boolean = await this.isLocatorVisible(setupButton);
    let otpSecret: string | undefined;
    if (requires2FASetup) {
      const result: TwoFactorSetupResult = await this.setupTwoFactorAuthenticationFromErrorMessage();
      otpSecret = result.otpSecret;
      await this.page.goto('/admin/personen');
    }

    const otpInput: Locator = this.getOtpInputLocator();
    const requires2FA: boolean = await this.isLocatorVisible(otpInput);
    if (requires2FA) {
      await this.enterOtpForTwoFactorAuthentication(otpSecret);
    }
    return new PersonManagementViewPage(this.page).waitForPageLoad();
  }

  public async setupTwoFactorAuthenticationFromErrorMessage(): Promise<TwoFactorSetupResult> {
    await this.getSecondFactorSetupButtonLocator().click();
    return this.setupTwoFactorAuthenticationFromProfile();
  }

  public async setupTwoFactorAuthenticationFromProfile(): Promise<TwoFactorSetupResult> {
    const profileViewPage: ProfileViewPage = await new ProfileViewPage(this.page).waitForPageLoad();
    await profileViewPage.open2FADialog();
    await profileViewPage.proceedTo2FAQrCode();
    await expect(this.page.getByTestId('self-service-token-init-error-text')).toBeHidden(); // fail-fast

    const otpSecret: string = await this.getOtpSecretFromQRCode();
    const otp: string = await this.generateCurrentOtp(otpSecret);

    await profileViewPage.proceedToOtpEntry();
    await this.page.getByTestId('self-service-otp-input').locator('.v-otp-input__input').pressSequentially(otp);
    const setupButton: Locator = this.page.getByTestId('proceed-two-factor-authentication-dialog');
    await setupButton.click();
    await expect(setupButton).toBeHidden();

    this.saveOtpSecretInEnv(otpSecret); // only save the secret if setup was successful

    return { page: await new ProfileViewPage(this.page).waitForPageLoad(), otpSecret };
  }

  public async enterOtpForTwoFactorAuthentication(otpKey?: string): Promise<void> {
    const otp: string = await this.generateCurrentOtp(otpKey);
    await this.fillOtpAndConfirm(otp);
    const errorMessageLocator: Locator = this.page.getByTestId('login-error-message');
    // try to recover from possible failed attempts due to timing issues
    if (await this.isLocatorVisible(errorMessageLocator)) {
      const otp: string = await this.generateCurrentOtp(otpKey);
      await this.fillOtpAndConfirm(otp);
    }
    await expect(errorMessageLocator).toBeHidden();
  }

  /** This function swallows errors, so we can use the result to retry. */
  private async isLocatorVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ timeout: 10 * 1000, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  private async getOtpSecretFromQRCode(): Promise<string> {
    const qrCodeSrc: string | null = await this.page
      .getByTestId('software-token-dialog-qr-code')
      .locator('img')
      .getAttribute('src');
    expect(qrCodeSrc).not.toBeNull();

    const otpSecret: string | null = getSecretFromTokenQRCode(qrCodeSrc!);
    if (!otpSecret) {
      throw new Error('OTP secret not found in QR code URL');
    }
    return otpSecret;
  }

  /**
   * Saves the OTP secret in the environment, if the current user matches the worker's designated root user.
   * This should only be called during first-time 2FA setup, and not during regular login.
   * @param otpSecret
   */
  private saveOtpSecretInEnv(otpSecret: string): void {
    if (this.username) {
      const workerParallelIndex: string = process.env['TEST_PARALLEL_INDEX']!;
      if (SharedCredentialManager.getUsername(workerParallelIndex) === this.username) {
        SharedCredentialManager.setOtpSeed(otpSecret, workerParallelIndex);
      }
    }
  }

  private async fillOtpAndConfirm(otp: string): Promise<void> {
    const otpInput: Locator = this.getOtpInputLocator();
    await otpInput.fill(otp);
    await this.page.locator('#kc-login').click();
  }

  private getSecondFactorSetupButtonLocator(): Locator {
    return this.page.getByTestId('toSecondFactorSetup-button');
  }

  private getOtpInputLocator(): Locator {
    return this.page.locator('#otp');
  }

  private async generateCurrentOtp(providedKey?: string): Promise<string> {
    let key: string | undefined;
    if (providedKey) {
      key = providedKey;
    } else if (this.username) {
      const workerParallelIndex: string = process.env['TEST_PARALLEL_INDEX']!;
      // are we the workers designated root user?
      if (SharedCredentialManager.getUsername(workerParallelIndex) === this.username) {
        key = SharedCredentialManager.getOtpSeed(workerParallelIndex);
      } else if (this.username === process.env['USER']) {
        key = SharedCredentialManager.getOtpSeed();
      }
    }

    if (!key) {
      throw new Error(
        `No OTP seed found for user ${this.username} and TEST_PARALLEL_INDEX ${process.env.TEST_PARALLEL_INDEX}`,
      );
    }

    if (this.expires) {
      // if we are asked to input two OTPs in a short time, i.e. during setup,
      // we may need to wait for the next token, since repeated entry is not allowed
      const currentTime: number = Date.now();
      const timeLeft: number = this.expires - currentTime;

      await this.page.waitForTimeout(timeLeft + 100);
    }

    const {
      otp,
      expires,
    }: {
      otp: string;
      expires: number;
    } = await TOTP.generate(key);
    this.expires = expires;
    return otp;
  }
}
