import { type Page } from '@playwright/test';

import { LoginViewPage } from '../pages/LoginView.page';
import { StartViewPage } from '../pages/StartView.page';
import { PersonManagementViewPage } from '../pages/admin/personen/PersonManagementView.page';
import { SharedCredentialManager } from './2fa';
import { freshLoginPage } from './api/personApi';
import { HeaderPage } from '../pages/components/Header.page';
import { LandingViewPage } from '../pages/LandingView.page';

export async function gotoTargetURL(page: Page, target: string): Promise<void> {
  await page.goto(target);
}

export async function login(
  page: Page,
  username: string | undefined = SharedCredentialManager.getUsername(process.env['TEST_PARALLEL_INDEX']),
  password: string | undefined = SharedCredentialManager.getPassword(process.env['TEST_PARALLEL_INDEX']),
): Promise<StartViewPage> {
  const loginPage: LoginViewPage = await freshLoginPage(page);
  if (!username) throw new Error('No username provided for login');
  if (!password) throw new Error('No password provided for login');
  const startPage: StartViewPage = await loginPage.login(username, password);
  return startPage.waitForPageLoad();
}

export async function loginAndNavigateToAdministration(
  page: Page,
  username: string | undefined = SharedCredentialManager.getUsername(process.env['TEST_PARALLEL_INDEX']),
  password: string | undefined = SharedCredentialManager.getPassword(process.env['TEST_PARALLEL_INDEX']),
): Promise<PersonManagementViewPage> {
  const startPage: StartViewPage = await login(page, username, password);
  const personManagementPage: PersonManagementViewPage = await startPage.navigateToAdministration();
  return personManagementPage.waitForPageLoad();
}

export async function logout(page: Page): Promise<LandingViewPage> {
  const header: HeaderPage = new HeaderPage(page);
  return header.logout();
}
