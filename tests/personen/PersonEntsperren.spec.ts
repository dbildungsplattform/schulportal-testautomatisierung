import { test, type PlaywrightTestArgs } from '@playwright/test';

import { getOrganisationId } from '../../base/api/organisationApi';
import { createPersonWithPersonenkontext, freshLoginPage, lockPerson, type UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';
import { LoginViewPage } from '../../pages/LoginView.page';

test.describe('PersonEntsperren', () => {
  test('Should allow an unlocked user to log in', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
    const user: UserInfo = await test.step('Gesperrten Benutzer anlegen', async () => {
      await loginAndNavigateToAdministration(page);
      const userInfo: UserInfo = await createPersonWithPersonenkontext(page, testschuleName, lehrkraftOeffentlichRolle);
      const organisationId: string = await getOrganisationId(page, testschuleName);
      await lockPerson(page, userInfo.personId, organisationId);
      await new HeaderPage(page).logout();
      return userInfo;
    });

    await test.step('Anmeldung bei gesperrtem Benutzer abweisen', async () => {
      const loginPage: LoginViewPage = await freshLoginPage(page);
      await loginPage.login(user.username, user.password);
      await loginPage.loginFailedWithLockedUser();
    });

    await test.step('Benutzer entsperren', async () => {
      const personManagementPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
      const personDetailsPage: PersonDetailsViewPage = await personManagementPage.searchAndOpenGesamtuebersicht(
        user.username,
      );
      await personDetailsPage.checkPersonLock({ locked: true });
      await personDetailsPage.unlockPerson();
      await new HeaderPage(page).logout();
    });

    await test.step('Erfolgreiche Anmeldung nach Entsperrung prüfen', async () => {
      const loginPage: LoginViewPage = await freshLoginPage(page);
      await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
      await new HeaderPage(page).checkIfIconsAreVisible();
      await new HeaderPage(page).logout();
    });
  });
});
