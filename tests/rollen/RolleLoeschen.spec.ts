import { test as baseTest } from '../../base/fixtures';

import { createPersonWithPersonenkontext } from '../../base/api/personApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { Alert } from '../../pages/components/Alert';
import { RolleDetailsViewPage } from '../../pages/admin/rollen/RolleDetailsView.page';
import { RolleManagementViewPage } from '../../pages/admin/rollen/RolleManagementView.page';

interface RolleFixture {
  rolleName: string;
  rolleDetailsView: RolleDetailsViewPage;
}

const test = baseTest.extend<{ rolle: RolleFixture }>({
  rolle: async ({ page, asLandesadmin: asLandesadmin, testSchule }, use) => {
    const rolleName: string = generateRolleName();
    await createRolle(page, RollenArt.Leit, testSchule.id, rolleName);
    const rolleManagementViewPage: RolleManagementViewPage =
      await asLandesadmin.personManagementViewPage.menu.navigateToRolleManagement();
    await rolleManagementViewPage.setPageSize(300);
    const rolleDetailsView: RolleDetailsViewPage = await rolleManagementViewPage.openGesamtuebersicht(rolleName);
    await use({ rolleName, rolleDetailsView });
  },
});

test.describe(`Testfälle für die Rollenlöschung: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test('Erfolgreich löschen', async ({ rolle }) => {
    const { rolleDetailsView, rolleName } = rolle;
    const rolleManagementViewPage: RolleManagementViewPage = await rolleDetailsView.deleteRolle();
    await rolleManagementViewPage.setPageSize(300);
    await rolleManagementViewPage.checkIfRolleDoesNotExist(rolleName);
  });

  // SPSH-2949
  test('Vergebene Rolle löschen und Fehlermeldung prüfen', async ({ page, rolle, testSchule }) => {
    const { rolleDetailsView, rolleName } = rolle;
    await test.step('Rolle einer Person zuordnen', async () => {
      await createPersonWithPersonenkontext(page, testSchule.name, rolleName);
    });
    const alert: Alert<RolleManagementViewPage> = await rolleDetailsView.attemptDeletionOfAssignedRolle();
    await alert.assertExpectedTexts();
    const rolleManagementViewPage: RolleManagementViewPage = await (await alert.confirm()).waitForPageLoad();
    await rolleManagementViewPage.setPageSize(300);
    await rolleManagementViewPage.checkIfRolleExists(rolleName);
  });
});
