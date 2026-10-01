import { PlaywrightTestArgs, test } from '@playwright/test';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName, testschuleDstNr } from '../../base/organisation';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { RollenArt } from '../../base/api/generated';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { email } from '../../base/sp';
import { createRolle } from '../../base/api/rolleApi';
import { getOrganisationId } from '../../base/api/organisationApi';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';

test.describe(`Testfälle für Schulzuordnung hinzufügen: ENV: ${process.env.ENV} URL: ${process.env.FRONTEND_URL}`, () => {
  let personManagementView: PersonManagementViewPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    personManagementView = await loginAndNavigateToAdministration(page);
  });

  test('Unbefristete Schulzuordnung einem Lehrer durch einen Landesadmin hinzufügen', async ({
    page,
  }: PlaywrightTestArgs) => {
    let userInfoLehrer: UserInfo;
    const nameRolleNeu: string = generateRolleName();

    // ---------- Testdaten ----------
    await test.step('Testdaten: Lehrer mit Rolle und bestehender Schulzuordnung anlegen und neue Rolle für die neue Schulzuordnung anlegen', async () => {
      userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
        organisationName: testschuleName,
        rollenArt: RollenArt.Lehr,
        serviceProviderNames: [email],
      });
      const organisationId: string = await getOrganisationId(page, testschuleName);
      await createRolle(page, RollenArt.Lehr, organisationId, nameRolleNeu);
    });

    // ---------- Open person ----------
    const personDetailsView: PersonDetailsViewPage = await test.step('Gesamtübersicht öffnen', async () => {
      const view: PersonDetailsViewPage = await personManagementView.searchAndOpenGesamtuebersicht(
        userInfoLehrer.username,
      );
      await view.waitForPageLoad();
      return view;
    });

    // ---------- Open edit mode ----------
    await test.step('Schulzuordnung im Bearbeitungsmodus öffnen', async () => {
      await personDetailsView.editZuordnungen();
    });

    // ---------- Prepare new Schulzuordnung ----------
    await test.step('Neue unbefristete Schulzuordnung vorbereiten', async () => {
      await personDetailsView.prepareSchulzuordnung({
        schuleName: testschuleName,
        rolleName: nameRolleNeu,
        befristung: undefined,
      });
    });

    // ---------- Review and final save ----------
    await test.step('In der Änderungsübersicht die neue Schulzuordnung überprüfen und das Speichern final bestätigen', async () => {
      await personDetailsView.reviewAndSaveZuordnungAddition({
        dstNr: testschuleDstNr,
        schuleName: testschuleName,
        nameRolle: nameRolleNeu,
      });
    });

    // ---------- Verify final state ----------
    await test.step('In der Gesamtübersicht überprüfen, dass die neue Schulzuordnung angezeigt wird', async () => {
      await personDetailsView.validateEntireNameSchulzuordnung(
        testschuleDstNr,
        testschuleName,
        nameRolleNeu,
        'rgb(0, 30, 73)',
        'person-zuordnungen-section-view',
      );
    });
  });
});
