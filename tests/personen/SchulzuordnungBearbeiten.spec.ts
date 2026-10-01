import { PlaywrightTestArgs, test } from '@playwright/test';
import { RollenArt, RollenMerkmal } from '../../base/api/generated';
import {
  createRolleAndPersonWithPersonenkontext,
  setTimeLimitPersonenkontext,
  UserInfo,
} from '../../base/api/personApi';
import { testschuleDstNr, testschuleName } from '../../base/organisation';
import { email } from '../../base/sp';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  formatDateDMY,
  generateCurrentDate,
  generateKopersNr,
  generateRolleName,
} from '../../base/utils/generateTestdata';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';

test.describe(`Testfälle für Schulzuordnung bearbeiten: ENV: ${process.env.ENV} URL: ${process.env.FRONTEND_URL}`, () => {
  let personManagementView: PersonManagementViewPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    personManagementView = await loginAndNavigateToAdministration(page);
  });

  test('Befristung einer Schulzuordnung von einem Lehrer durch einen Landesadmin bearbeiten', async ({
    page,
  }: PlaywrightTestArgs) => {
    let userInfoLehrer: UserInfo;
    const nameRolle: string = generateRolleName();
    const timeLimitTeacherRolle: string = formatDateDMY(generateCurrentDate({ days: 3, months: 5 }));
    let timeLimitTeacherRolleNew: string;

    // ---------- Testdaten ----------
    await test.step('Testdaten: Lehrer mit Rolle und Schulzuordnung anlegen', async () => {
      userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
        organisationName: testschuleName,
        rollenArt: RollenArt.Lehr,
        serviceProviderNames: [email],
        rollenName: nameRolle,
      });

      await setTimeLimitPersonenkontext(
        page,
        userInfoLehrer.personId,
        userInfoLehrer.organisationId,
        userInfoLehrer.rolleId,
        generateCurrentDate({ days: 3, months: 5 }),
      );
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
      await personDetailsView.selectSchulzuordnungCheckbox(testschuleName);
    });

    // ---------- Open Befristung dialog ----------
    await test.step('Befristung im Bearbeitungsmodus öffnen', async () => {
      await personDetailsView.openBefristungDialog();
    });

    // ---------- Validate invalid and valid dates ----------
    await test.step('Ungültige und gültige Befristungen eingeben', async () => {
      await personDetailsView.performBefristungValidation();
      timeLimitTeacherRolleNew = formatDateDMY(generateCurrentDate({ days: 0, months: 8 }));
      await personDetailsView.setFinalBefristung(timeLimitTeacherRolleNew);
    });

    // ---------- Submit and confirm ----------
    await test.step('Gültige Befristung speichern', async () => {
      await personDetailsView.submitBefristungChange(timeLimitTeacherRolle, timeLimitTeacherRolleNew);
    });

    // ---------- Review and final save ----------
    await test.step('In der Änderungsübersicht die Befristung der Rolle überprüfen und das Speichern final bestätigen', async () => {
      await personDetailsView.reviewAndSaveBefristungChange({
        dstNr: testschuleDstNr,
        schuleName: testschuleName,
        nameRolle,
        oldDate: timeLimitTeacherRolle,
        newDate: timeLimitTeacherRolleNew,
      });
    });

    // ---------- Verify final state ----------
    await test.step('In der Gesamtübersicht überprüfen, dass die Schulzuordnung mit dem korrekten Datum angezeigt wird', async () => {
      await personDetailsView.validateEntireNameSchulzuordnung(
        testschuleDstNr,
        testschuleName,
        nameRolle,
        'rgb(0, 30, 73)',
        'person-zuordnungen-section-view',
        timeLimitTeacherRolleNew,
      );
    });
  });

  test('Prüfen, dass eine Person mit einer befristeten Rolle wie z.B. LiV, nicht die Option "Unbefristet" bekommen kann wenn man eine Befristung bearbeitet', async ({
    page,
  }: PlaywrightTestArgs) => {
    let userInfoLehrer: UserInfo;
    const nameRolle: string = generateRolleName();

    await test.step('Testdaten: Lehrer mit einer Rolle (LiV) mit den Merkmalen "BefristungsPflicht" und "KopersPflicht" und einer Schulzuordnung anlegen', async () => {
      userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
        organisationName: testschuleName,
        rollenArt: RollenArt.Lehr,
        serviceProviderNames: [email],
        rollenName: nameRolle,
        koPersNr: generateKopersNr(),
        rollenMerkmalNamen: new Set<RollenMerkmal>([RollenMerkmal.BefristungPflicht, RollenMerkmal.KopersPflicht]),
      });
    });

    const personDetailsView: PersonDetailsViewPage = await test.step('Gesamtübersicht öffnen', async () => {
      const view: PersonDetailsViewPage = await personManagementView.searchAndOpenGesamtuebersicht(
        userInfoLehrer.username,
      );
      await view.waitForPageLoad();
      return view;
    });

    await test.step('Schulzuordnung im Bearbeitungsmodus öffnen', async () => {
      await personDetailsView.editZuordnungen();
      await personDetailsView.selectSchulzuordnungCheckbox(testschuleName);
    });

    await test.step('Befristung im Bearbeitungsmodus öffnen und prüfen, dass "Unbefristet" deaktiviert ist', async () => {
      await personDetailsView.openBefristungDialog();
      await personDetailsView.assertUnbefristetIsDisabled();
    });
  });
});
