import { PlaywrightTestArgs, test } from '@playwright/test';
import { getOrganisationId } from '../../base/api/organisationApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { testschuleName } from '../../base/organisation';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { RolleDetailsViewPage } from '../../pages/admin/rollen/RolleDetailsView.page';
import { RolleManagementViewPage } from '../../pages/admin/rollen/RolleManagementView.page';

test.describe(`Testfälle für die Rollenbearbeitung: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let rolleDetailsView: RolleDetailsViewPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step('Anmelden und zur Rollenbearbeitung navigieren', async () => {
      const personManagementView: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
      const organisationId: string = await getOrganisationId(page, testschuleName);
      const rolleName: string = generateRolleName();
      await createRolle(page, RollenArt.Leit, organisationId, rolleName);
      const rolleManagementViewPage: RolleManagementViewPage =
        await personManagementView.menu.navigateToRolleManagement();
      await rolleManagementViewPage.setPageSize(300);
      rolleDetailsView = await rolleManagementViewPage.openGesamtuebersicht(rolleName);
    });
  });

  // SPSH-2948
  test('Rollennamen ändern', { tag: [DEV, STAGE] }, async () => {
    const newRolleName: string = generateRolleName();
    await rolleDetailsView.editRolle(newRolleName);
    await rolleDetailsView.rolleSuccessfullyEdited(newRolleName);
  });
});
