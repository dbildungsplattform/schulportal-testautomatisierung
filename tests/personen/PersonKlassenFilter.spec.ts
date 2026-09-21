import { PlaywrightTestArgs, test } from '@playwright/test';

import { createKlasse, createSchule, getKlasseId } from '../../base/api/organisationApi';
import {
  createPersonWithPersonenkontext,
  createRolleAndPersonWithPersonenkontext,
  UserInfo,
} from '../../base/api/personApi';
import { landSH } from '../../base/organisation';
import { landesadminRolle, schuelerRolle, schuladminOeffentlichRolle } from '../../base/rollen';
import { typeSchueler } from '../../base/rollentypen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateDienststellenNr,
  generateEmailAdress,
  generateKlassenname,
  generateSchulname,
} from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { SchuleCreationParams, Schulform } from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { ZuordnungenPage, ZuordnungValidationParams } from '../../pages/admin/personen/details/Zuordnungen.page';
import { AddZuordnungWorkflowPage } from '../../pages/admin/personen/details/zuordnung-workflows/AddZuordnungWorkflow.page';
import { VersetzenWorkflowPage } from '../../pages/admin/personen/details/zuordnung-workflows/VersetzenWorkflow.page';
import { HeaderPage } from '../../pages/components/Header.page';

[
  { rolleName: landesadminRolle, bezeichnung: 'Landesadmin' },
  { rolleName: schuladminOeffentlichRolle, bezeichnung: 'Schuladmin' },
].forEach(({ rolleName, bezeichnung }: { rolleName: string; bezeichnung: string }) => {
  test.describe(`Testfälle für den Klassenfilter als ${bezeichnung}: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
    let personManagementViewPage: PersonManagementViewPage;
    let schuleParams: SchuleCreationParams;
    let schuleId: string;
    let admin: UserInfo;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      personManagementViewPage = await loginAndNavigateToAdministration(page);
      schuleParams = {
        name: generateSchulname(),
        dienststellenNr: generateDienststellenNr(),
        schulform: Schulform.Oeffentlich,
        emailAdress: generateEmailAdress(),
      };
      schuleId = await createSchule(page, schuleParams.name, schuleParams.dienststellenNr);

      // Admin anlegen
      admin = await createPersonWithPersonenkontext(
        page,
        rolleName === landesadminRolle ? landSH : schuleParams.name,
        rolleName,
        undefined,
        undefined,
        generateDienststellenNr(),
      );
    });

    test.describe('Klassenfilter-Tests', () => {
      let klassenNamen: string[] = [];
      let schueler: UserInfo;
      let personDetailsViewPage: PersonDetailsViewPage;
      let zuordnungenPage: ZuordnungenPage;

      // Zweites before-each damit andere Tests später nicht beeinflusst werden
      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        // Klassen für die Schule anlegen
        const KLASSEN_COUNT: number = 40;
        klassenNamen = [];
        for (let i: number = 0; i < KLASSEN_COUNT; i++) {
          const klassenname: string = generateKlassenname();
          await createKlasse(page, schuleId, klassenname);
          klassenNamen.push(klassenname);
        }

        // Schüler anlegen
        schueler = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: schuleParams.name,
          rollenArt: typeSchueler,
          klasseId: await getKlasseId(page, klassenNamen[0]),
        });

        const landingPage: LandingViewPage = await new HeaderPage(page).logout();
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();

        // Erstmalige Anmeldung mit Passwortänderung
        const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
        await startPage.waitForPageLoad();

        // Navigation zur Ergebnisliste von Benutzern
        personManagementViewPage = await startPage.navigateToAdministration();

        // Zur Bearbeiten-Ansicht des Schülers navigieren
        if (rolleName === landesadminRolle) {
          await personManagementViewPage.filterBySchule(schuleParams.name);
        } else {
          await personManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
        }
        personDetailsViewPage = await personManagementViewPage.searchAndOpenGesamtuebersicht(schueler.username);
        await personDetailsViewPage.waitForPageLoad();
      });

      test(
        `Als ${bezeichnung}: Alle Klassen im Drop-Down bei SuS versetzen anzeigen`,
        { tag: [STAGE, DEV] },
        async () => {
          test.slow();

          let params: ZuordnungValidationParams;
          let versetzenWorkflowPage: VersetzenWorkflowPage;

          await test.step(`Zum Klassen-Drop-Down navigieren`, async () => {
            zuordnungenPage = await personDetailsViewPage.editZuordnungen();
            params = {
              organisation: schuleParams.name,
              dstNr: schuleParams.dienststellenNr,
            };
            await zuordnungenPage.selectZuordnungToEdit(params);
            versetzenWorkflowPage = await zuordnungenPage.startVersetzenWorkflow();
          });

          await test.step(`Klassen-Drop-Down überprüfen`, async () => {
            await versetzenWorkflowPage.checkKlasseDropdownVisibleAndClickable(klassenNamen);
            await versetzenWorkflowPage.discard();
          });
        },
      );

      test(
        `Als ${bezeichnung}: Alle Klassen im Drop-Down bei Schulzuordnung hinzufügen anzeigen`,
        { tag: [STAGE, DEV] },
        async () => {
          test.slow();

          let addZuordnungWorkflowPage: AddZuordnungWorkflowPage;

          await test.step(`Zum Klassen-Drop-Down navigieren`, async () => {
            zuordnungenPage = await personDetailsViewPage.editZuordnungen();
            addZuordnungWorkflowPage = await zuordnungenPage.startAddZuordnungWorkflow();
            if (rolleName === landesadminRolle) {
              await addZuordnungWorkflowPage.selectOrganisation(schuleParams.name);
            } else {
              await addZuordnungWorkflowPage.checkSelectedOrganisation(
                schuleParams.dienststellenNr + ' (' + schuleParams.name + ')',
              );
            }
            await addZuordnungWorkflowPage.selectRolle(schuelerRolle);
            await addZuordnungWorkflowPage.checkSelectedKlasse(klassenNamen[0]);
          });

          await test.step(`Klassen-Drop-Down überprüfen`, async () => {
            await addZuordnungWorkflowPage.checkKlasseDropdownVisibleAndClickable(klassenNamen);
            await addZuordnungWorkflowPage.discard();
          });
        },
      );
    });
  });
});
