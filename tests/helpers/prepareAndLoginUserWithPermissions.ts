import { Page } from '@playwright/test';
import { getOrganisationId } from '../../base/api/organisationApi';
import { addOrganisationenToPerson, createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { RolleCase } from '../../base/rollen';
import { schulportaladmin } from '../../base/sp';
import { HeaderPage } from '../../pages/components/Header.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';

/**
 * Prepares a test user with the specified system rights and logs them into the application.
 *
 * Steps performed by this function:
 * 1. Creates a new user with a role and person context for the main test school.
 * 2. Assigns the provided system rights (`permissions`) to the user's role.
 * 3. Adds a second school to the user's person context for multi-school scenarios.
 * 4. Logs out any existing session.
 * 5. Logs in with the newly created user and completes the mandatory password change.
 * 6. Navigates to the Administration view to ensure the user session is ready for tests.
 *
 * @param page - The Playwright `Page` object representing the browser page.
 * @param rolle - The role case containing permissions and organisations to assign.
 *
 * @example
 * ```ts
 * await prepareAndLoginUserWithPermissions(page, {
 *   name: 'My role',
 *   permissions: [RollenSystemRechtEnum.PersonenVerwalten],
 *   organisations: [testschuleName, testschule665Name],
 * });
 * ```
 */
export async function prepareAndLoginUserWithPermissions(page: Page, rolle: RolleCase): Promise<UserInfo> {
  // Create a new user with role and person context
  const userInfo: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
    organisationName: rolle.organisations[0],
    rollenArt: rolle.rollenArt,
    serviceProviderNames: [schulportaladmin],
    systemrechte: new Set(rolle.permissions),
  });

  // Assign all organisations to the person
  if (rolle.organisations.length > 1) {
    const organisationIds: string[] = await Promise.all(
      rolle.organisations.map((name) => getOrganisationId(page, name)),
    );
    await addOrganisationenToPerson(page, userInfo.personId, organisationIds, userInfo.rolleId);
  }

  // Logout any existing session
  const header: HeaderPage = new HeaderPage(page);
  await header.logout();

  // Navigate to login page and login with the newly created user
  const landingPage: LandingViewPage = new LandingViewPage(page);
  const loginPage: LoginViewPage = await landingPage.navigateToLogin();
  const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(userInfo.username, userInfo.password);

  // Wait for the start page to load and go to administration
  await startPage.waitForPageLoad();
  await startPage.navigateToAdministration();
  return userInfo;
}
