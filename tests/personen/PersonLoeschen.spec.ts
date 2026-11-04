import { PlaywrightTestArgs, test } from '@playwright/test';

import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

test.describe(`Testfälle für das Personen löschen: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let userInfo: UserInfo;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Login`, async () => {
      await loginAndNavigateToAdministration(page);
    });

    await test.step(`Daten anlegen`, async () => {
      userInfo = await createPersonWithPersonenkontext(page, testschuleName, lehrkraftOeffentlichRolle);
    });
  });

  test.afterEach(async ({ page }: PlaywrightTestArgs) => {
    const header: HeaderPage = new HeaderPage(page);
    await header.logout();
  });

  test('Person via Gesamtübersicht löschen', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
    const personDetailsViewPage: PersonDetailsViewPage = await test.step(`Zur Gesamtübersicht navigieren`, async () => {
      const personenManagementViewPage: PersonManagementViewPage = new PersonManagementViewPage(page);
      await personenManagementViewPage.waitForPageLoad();
      return personenManagementViewPage.searchAndOpenGesamtuebersicht(userInfo.username);
    });

    const personenManagementViewPage: PersonManagementViewPage = await test.step(`Person löschen`, async () => {
      return personDetailsViewPage.deletePerson({ clearFilter: true });
    });

    await test.step(`Löschung verifizieren`, async () => {
      await personenManagementViewPage.searchByText(userInfo.username);
      await personenManagementViewPage.checkIfPersonNotExists(userInfo.username);
    });
  });
});
