import { PlaywrightTestArgs, test } from '@playwright/test';

import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { landSH } from '../../base/organisation';
import { landesadminRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateDienststellenNr, generateEmailAdress, generateSchulname } from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { SchuleCreationSuccessPage } from '../../pages/admin/organisationen/schulen/SchuleCreationSuccess.page';
import {
  SchuleCreationParams,
  SchuleCreationViewPage,
  Schulform,
} from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';
import { SchuleManagementViewPage } from '../../pages/admin/organisationen/schulen/SchuleManagementView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

test.describe(`Testfälle für das Anlegen von Schulen als Landesadmin: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let header: HeaderPage;
  let personManagementViewPage: PersonManagementViewPage;
  let schuleCreationPage: SchuleCreationViewPage;
  let landesadmin: UserInfo;
  let schuleCreationSuccessPage: SchuleCreationSuccessPage;
  let schuleManagementViewPage: SchuleManagementViewPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    header = new HeaderPage(page);
    await loginAndNavigateToAdministration(page);

    landesadmin = await createPersonWithPersonenkontext(page, landSH, landesadminRolle);

    const landingPage: LandingViewPage = await header.logout();
    const loginPage: LoginViewPage = await landingPage.navigateToLogin();

    // Erstmalige Anmeldung mit Passwortänderung
    const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
      landesadmin.username,
      landesadmin.password,
    );
    await startPage.waitForPageLoad();

    // Navigation zur Anlage von Schulen
    personManagementViewPage = await startPage.navigateToAdministration();
    schuleCreationPage = await personManagementViewPage.menu.navigateToSchuleCreation();
  });

  test(`Schulen Anlage: UI prüfen`, { tag: [DEV, STAGE] }, async () => {
    await schuleCreationPage.checkCreateForm();
  });

  test.describe('Einzelne Schule anlegen', () => {
    let schuleParams1: SchuleCreationParams;

    test.beforeEach(() => {
      // Testdaten vorbereiten
      schuleParams1 = {
        name: generateSchulname(),
        dienststellenNr: generateDienststellenNr(),
        schulform: Schulform.Oeffentlich,
        emailAdress: generateEmailAdress(),
      };
    });

    // SPSH-2954
    test(
      `Eine Schule anlegen als Landesadmin und die Bestätigungsseite vollständig prüfen`,
      { tag: [DEV, STAGE] },
      async () => {
        await test.step(`Schule anlegen`, async () => {
          schuleCreationSuccessPage = await schuleCreationPage.createSchule(schuleParams1);
        });

        await test.step(`Bestätigungsseite prüfen`, async () => {
          await schuleCreationSuccessPage.waitForPageLoad();
          await schuleCreationSuccessPage.checkSuccessfulCreation(schuleParams1);
        });
      },
    );
  });

  test.describe('Mehrere Schulen anlegen', () => {
    let schuleParams1: SchuleCreationParams;
    let schuleParams2: SchuleCreationParams;

    test.beforeEach(() => {
      // Testdaten vorbereiten
      schuleParams1 = {
        name: generateSchulname(),
        dienststellenNr: generateDienststellenNr(),
        schulform: Schulform.Oeffentlich,
        emailAdress: generateEmailAdress(),
      };

      schuleParams2 = {
        name: generateSchulname(),
        dienststellenNr: generateDienststellenNr(),
        schulform: Schulform.Ersatz,
        emailAdress: generateEmailAdress(),
      };
    });

    // SPSH-2952
    test(`2 Schulen nacheinander anlegen als Landesadmin`, { tag: [DEV, STAGE] }, async () => {
      await test.step(`Erste Schule anlegen`, async () => {
        schuleCreationSuccessPage = await schuleCreationPage.createSchule(schuleParams1);
        await schuleCreationSuccessPage.waitForPageLoad();
        await schuleCreationSuccessPage.checkSuccessfulCreation(schuleParams1);
      });

      await test.step(`Zweite Schule anlegen`, async () => {
        schuleCreationPage = await schuleCreationSuccessPage.goBackToCreateAnotherSchule();
        schuleCreationSuccessPage = await schuleCreationPage.createSchule(schuleParams2);
        await schuleCreationSuccessPage.waitForPageLoad();
        await schuleCreationSuccessPage.checkSuccessfulCreation(schuleParams2);
      });

      await test.step(`In der Ergebnisliste prüfen, dass beide Schulen vorhanden sind`, async () => {
        schuleManagementViewPage = await schuleCreationSuccessPage.goBackToList();
        // Suche nach erster Schule
        await schuleManagementViewPage.searchByText(schuleParams1.name);
        await schuleManagementViewPage.checkIfSchuleExists(schuleParams1.name);
        await schuleManagementViewPage.checkRowCount(1);

        // Suche nach zweiter Schule
        await schuleManagementViewPage.searchByText(schuleParams2.name);
        await schuleManagementViewPage.checkIfSchuleExists(schuleParams2.name);
        await schuleManagementViewPage.checkRowCount(1);
      });
    });
  });
});
