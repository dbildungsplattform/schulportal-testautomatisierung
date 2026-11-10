import { test } from '../../base/fixtures';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrerImVorbereitungsdienstRolle, lehrkraftOeffentlichRolle } from '../../base/rollen';
import { typeLehrer } from '../../base/rollentypen';
import { email } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { gotoTargetURL } from '../../base/testHelperUtils';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';

const ADMIN: string | undefined = process.env.USER;

test.describe(`Testfälle für die Administration von Personen": Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test('Befristung beim hinzufügen von Personenkontexten', { tag: [STAGE, DEV] }, async ({ page, asLandesadmin }) => {
    let userInfoLehrer: UserInfo;
    const unbefristeteRolle: string = lehrkraftOeffentlichRolle;
    const befristeteRolle: string = lehrerImVorbereitungsdienstRolle;

    await test.step(`Testdaten: Lehrer mit einer Rolle(LEHR) und SP(email) über die api anlegen ${ADMIN}`, async () => {
      userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
        organisationName: testschuleName,
        rollenArt: typeLehrer,
        serviceProviderNames: [email],
      });
    });

    const personManagementView: PersonManagementViewPage = asLandesadmin.personManagementViewPage;

    const personDetailsView: PersonDetailsViewPage =
      await test.step(`Zu testenden Lehrer suchen und Gesamtübersicht öffnen`, async () => {
        await gotoTargetURL(page, 'admin/personen'); // Die Navigation ist nicht Bestandteil des Tests
        await personManagementView.searchAndOpenGesamtuebersicht(userInfoLehrer.username);
        return new PersonDetailsViewPage(page);
      });

    await test.step(`Ansicht für neuen Personenkontext öffnen`, async () => {
      await personDetailsView.waitForPageLoad();
      const zuordnungen = await personDetailsView.editZuordnungen();
      await zuordnungen.startAddZuordnungWorkflow();
      await personDetailsView.selectOrganisation(testschuleName);
    });

    await test.step(`Befristung bei ${unbefristeteRolle} und ${befristeteRolle} überprüfen`, async () => {
      await personDetailsView.selectRolle(befristeteRolle);
      await personDetailsView.checkBefristungAutoSelection('schuljahresende');
      await personDetailsView.clearRolle();
      await personDetailsView.selectRolle(unbefristeteRolle);
      await personDetailsView.checkBefristungAutoSelection('unbefristet');
    });
  });
});
