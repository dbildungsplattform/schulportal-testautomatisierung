import { PlaywrightTestArgs, test } from '@playwright/test';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrerImVorbereitungsdienstRolle, lehrkraftOeffentlichRolle } from '../../base/rollen';
import { typeLehrer } from '../../base/rollentypen';
import { email } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { deletePersonenBySearchStrings, deleteRolleById } from '../../base/testHelperDeleteTestdata';
import { gotoTargetURL, loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

const ADMIN: string | undefined = process.env.USER;

// The created test data will be deleted in the afterEach block
let usernames: string[] = [];
let rolleIds: string[] = [];

test.describe(`Testfälle für die Administration von Personen": Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Login`, async () => {
      await loginAndNavigateToAdministration(page);
    });
  });

  test.afterEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Testdaten(Benutzer) löschen via API`, async () => {
      if (usernames.length > 0) {
        await deletePersonenBySearchStrings(page, usernames);
        usernames = [];
      }

      if (rolleIds.length > 0) {
        await deleteRolleById(rolleIds, page);
        rolleIds = [];
      }
    });

    await test.step(`Abmelden`, async () => {
      const header: HeaderPage = new HeaderPage(page);
      await header.logout();
    });
  });

  test(
    'Befristung beim hinzufügen von Personenkontexten',
    { tag: [STAGE, DEV] },
    async ({ page }: PlaywrightTestArgs) => {
      let userInfoLehrer: UserInfo;
      const unbefristeteRolle: string = lehrkraftOeffentlichRolle;
      const befristeteRolle: string = lehrerImVorbereitungsdienstRolle;

      await test.step(`Testdaten: Lehrer mit einer Rolle(LEHR) und SP(email) über die api anlegen ${ADMIN}`, async () => {
        userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: typeLehrer,
          serviceProviderNames: [email],
        });
        usernames.push(userInfoLehrer.username);
        rolleIds.push(userInfoLehrer.rolleId);
      });

      const personManagementView: PersonManagementViewPage = new PersonManagementViewPage(page);

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
    },
  );
});
