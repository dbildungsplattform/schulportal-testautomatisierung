import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { test } from '../../base/fixtures';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';

test.describe(`Testfälle für das Personen löschen: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test('Person via Gesamtübersicht löschen', async ({ page, asLandesadmin }) => {
    const userInfo: UserInfo = await test.step('Daten anlegen', async () =>
      createPersonWithPersonenkontext(page, testschuleName, lehrkraftOeffentlichRolle));
    const personDetailsViewPage: PersonDetailsViewPage = await test.step(`Zur Gesamtübersicht navigieren`, async () => {
      const personenManagementViewPage = asLandesadmin.personManagementViewPage;
      await personenManagementViewPage.waitForPageLoad();
      return personenManagementViewPage.searchAndOpenGesamtuebersicht(userInfo.username);
    });

    const personenManagementViewPage = await test.step(`Person löschen`, async () => {
      return personDetailsViewPage.deletePerson({ clearFilter: true });
    });

    await test.step(`Löschung verifizieren`, async () => {
      await personenManagementViewPage.searchByText(userInfo.username);
      await personenManagementViewPage.checkIfPersonNotExists(userInfo.username);
    });
  });
});
