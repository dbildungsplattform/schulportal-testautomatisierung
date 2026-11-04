import { PlaywrightTestArgs, test } from '@playwright/test';

import { getOrganisationId } from '../../base/api/organisationApi';
import { createPersonWithPersonenkontext } from '../../base/api/personApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { testschuleName } from '../../base/organisation';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { Alert } from '../../pages/components/Alert';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { RolleDetailsViewPage } from '../../pages/admin/rollen/RolleDetailsView.page';
import { RolleManagementViewPage } from '../../pages/admin/rollen/RolleManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

test.describe(`Testfälle für die Rollenlöschung: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let rolleDetailsView: RolleDetailsViewPage;
  let rolleName: string;
  let personManagementView: PersonManagementViewPage;
  let rolleManagementViewPage: RolleManagementViewPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    personManagementView = await loginAndNavigateToAdministration(page);
    const organisationId: string = await getOrganisationId(page, testschuleName);
    rolleName = generateRolleName();
    await createRolle(page, RollenArt.Leit, organisationId, rolleName);

    rolleManagementViewPage = await personManagementView.menu.navigateToRolleManagement();
    await rolleManagementViewPage.setPageSize(300);
    rolleDetailsView = await rolleManagementViewPage.openGesamtuebersicht(rolleName);
  });

  test.afterEach(async ({ page }: PlaywrightTestArgs) => {
    const header: HeaderPage = new HeaderPage(page);
    await header.logout();
  });

  test('Erfolgreich löschen', { tag: [DEV, STAGE] }, async () => {
    rolleManagementViewPage = await rolleDetailsView.deleteRolle();
    await rolleManagementViewPage.setPageSize(300);
    await rolleManagementViewPage.checkIfRolleDoesNotExist(rolleName);
  });

  // SPSH-2949
  test('Vergebene Rolle löschen und Fehlermeldung prüfen', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
    await test.step('Rolle einer Person zuordnen', async () => {
      await createPersonWithPersonenkontext(page, testschuleName, rolleName);
    });
    const alert: Alert<RolleManagementViewPage> = await rolleDetailsView.attemptDeletionOfAssignedRolle();
    await alert.assertExpectedTexts();
    rolleManagementViewPage = await (await alert.confirm()).waitForPageLoad();
    await rolleManagementViewPage.setPageSize(300);
    await rolleManagementViewPage.checkIfRolleExists(rolleName);
  });
});
