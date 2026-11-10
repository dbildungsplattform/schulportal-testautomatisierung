import { test } from '../../base/fixtures';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { RolleDetailsViewPage } from '../../pages/admin/rollen/RolleDetailsView.page';
import { RolleManagementViewPage } from '../../pages/admin/rollen/RolleManagementView.page';

test.describe(`Testfälle für die Rollenbearbeitung: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  // SPSH-2948
  test('Rollennamen ändern', async ({ page, asLandesadmin, testSchule }) => {
    const newRolleName: string = generateRolleName();
    const rolleDetailsView: RolleDetailsViewPage = await test.step('Rolle zur Bearbeitung öffnen', async () => {
      const rolleName: string = generateRolleName();
      await createRolle(page, RollenArt.Leit, testSchule.id, rolleName);
      const rolleManagementViewPage: RolleManagementViewPage =
        await asLandesadmin.personManagementViewPage.menu.navigateToRolleManagement();
      await rolleManagementViewPage.setPageSize(300);
      return rolleManagementViewPage.openGesamtuebersicht(rolleName);
    });
    await rolleDetailsView.editRolle(newRolleName);
    await rolleDetailsView.rolleSuccessfullyEdited(newRolleName);
  });
});
