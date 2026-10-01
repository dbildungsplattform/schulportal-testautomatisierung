import { Browser, BrowserContext, chromium, Page, Request, Response } from '@playwright/test';
import path from 'node:path';
import { TOTP } from 'totp-generator';

import { getSecretFromTokenQRCode, SharedCredentialManager } from '../base/2fa';
import { Class2FAApi } from '../base/api/generated';
import { getOrganisationId } from '../base/api/organisationApi';
import { construct2FAApi, createPerson, UserInfo } from '../base/api/personApi';
import { getRolleId } from '../base/api/rolleApi';
import { landSH } from '../base/organisation';
import { landesadminRolle } from '../base/rollen';
import { loginAndNavigateToAdministration } from '../base/testHelperUtils';
import { generateNachname, generateVorname } from '../base/utils/generateTestdata';
import { HeaderPage } from '../pages/components/Header.page';
import FromAnywhere from '../pages/FromAnywhere';
import { LandingViewPage } from '../pages/LandingView.page';
import { LoginViewPage } from '../pages/LoginView.page';
import { StartViewPage } from '../pages/StartView.page';
import { workers } from '../playwright.config';

const FRONTEND_URL: string = process.env.FRONTEND_URL ?? '';

function encodeNumberAsLetters(num: number): string {
  let encoded: string = '';
  let n: number = num;
  while (n > 0) {
    const remainder: number = (n - 1) % 26;
    encoded = String.fromCharCode(65 + remainder) + encoded;
    n = Math.floor((n - 1) / 26);
  }
  return encoded;
}

/**
 * Global setup – runs ONCE per Playwright run
 */
export default async function globalSetup(): Promise<void> {
  console.log('Global setup started');

  const browser: Browser = await chromium.launch();
  const context: BrowserContext = await browser.newContext({
    baseURL: FRONTEND_URL,
    ignoreHTTPSErrors: true,
  });

  const page: Page = await context.newPage();

  try {
    // ---------------------------------------------------------------------
    // LOGIN
    // ---------------------------------------------------------------------
    console.log('Login');
    await loginAndNavigateToAdministration(page, process.env.USER!, process.env.PW!);

    // ---------------------------------------------------------------------
    // BOOTSTRAP ADMINS
    // ---------------------------------------------------------------------
    console.log('Bootstrap Admins');
    console.log(`Creating ${workers} admins`);

    const organisationId: string = await getOrganisationId(page, landSH);
    const rolleId: string = await getRolleId(page, landesadminRolle);

    const userInfos: UserInfo[] = [];
    for (let index = 0; index < workers; index++) {
      const userInfo = await createPerson(page, {
        organisationId,
        rolleId,
        familienname: generateNachname() + encodeNumberAsLetters(index + 1),
        vorname: generateVorname(),
      });
      userInfos.push(userInfo);
    }

    const header: HeaderPage = new HeaderPage(page);
    await header.logout();

    SharedCredentialManager.init();
    const twoFactorApi: Class2FAApi = construct2FAApi(page);

    for (const [index, userInfo] of userInfos.entries()) {
      const page: Page = await context.newPage();
      try {
        const landingPage: LandingViewPage = await FromAnywhere(page).start();
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();
        const startPage: StartViewPage = await loginPage.login(userInfo.username, userInfo.password);
        const password: string = await loginPage.updatePassword();
        await startPage.waitForPageLoad();
        SharedCredentialManager.setUsername(userInfo.username, index);
        SharedCredentialManager.setPassword(password, index);

        const initTokenResponse: string = await twoFactorApi.privacyIdeaAdministrationControllerInitializeSoftwareToken(
          {
            tokenInitBodyParams: {
              personId: userInfo.personId,
            },
          },
        );
        const otpSecret: string | null = getSecretFromTokenQRCode(initTokenResponse);
        if (!otpSecret) throw new Error(`Setting up 2FA for ${userInfo.username} failed`);

        const otp: { otp: string; expires: number } = await TOTP.generate(otpSecret!);
        await twoFactorApi.privacyIdeaAdministrationControllerVerifyTokenRaw({
          tokenVerifyBodyParams: {
            personId: userInfo.personId,
            otp: otp.otp,
          },
        });
        SharedCredentialManager.setOtpSeed(otpSecret!, index);

        const header: HeaderPage = new HeaderPage(page);
        await header.logout();
        await page.close();
        console.log(`| ${index.toString().padStart(2, '0')} | ${userInfo.username.padStart(32, ' ')} |`);
      } catch (error) {
        const screenshotPath: string = path.join('playwright-report', `error-creating-admin-${index}.png`);
        await page.screenshot({ path: screenshotPath });
        console.error(`Error creating admin ${index}:`, error);
        throw error;
      } finally {
        await page.close();
      }
    }

    console.log(userInfos.map((info: UserInfo) => `Created user: ${info.username}`).join('\n'));
  } catch (error) {
    console.error('Error during global setup:', error);
    const screenshotPath: string = `error-global-setup.png`;
    await page.screenshot({ path: screenshotPath });
    const requests: Request[] = await page.requests();
    for (const request of requests) {
      await logRequest(request);
    }
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('Global setup completed');
}

async function logRequest(r: Request): Promise<void> {
  const res: Response | null = await r.response();
  console.log(`>> ${r.method()} ${r.url()} ${res?.status()}`);
}
