import { PlaywrightTestArgs, test } from '@playwright/test';

import { createKlasse, getOrganisationId } from '../../base/api/organisationApi';
import { addOrganisationenToPerson, createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { getRolleId } from '../../base/api/rolleApi';
import { landSH } from '../../base/organisation';
import { landesadminRolle, schuladminOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateDienststellenNr, generateKlassenname, generateSchulname } from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { KlasseManagementViewPage } from '../../pages/admin/organisationen/klassen/KlasseManagementView.page';
import { SchuleCreationSuccessPage } from '../../pages/admin/organisationen/schulen/SchuleCreationSuccess.page';
import {
  SchuleCreationParams,
  SchuleCreationViewPage,
  Schulform,
} from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

[
  { organisationsName: landSH, rolleName: landesadminRolle, bezeichnung: 'Landesadmin' },
  { rolleName: schuladminOeffentlichRolle, bezeichnung: 'Schuladmin (1 Schule)' },
  { rolleName: schuladminOeffentlichRolle, bezeichnung: 'Schuladmin (2 Schulen)' },
].forEach(
  ({
    organisationsName,
    rolleName,
    bezeichnung,
  }: {
    organisationsName?: string;
    rolleName: string;
    bezeichnung: string;
  }) => {
    test.describe(`Testfälle für die Ergebnisliste von Klassen als ${bezeichnung}: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
      const hasMultipleSchulen: boolean = bezeichnung !== 'Schuladmin (1 Schule)';
      let klasseManagementViewPage: KlasseManagementViewPage;
      let personManagementViewPage: PersonManagementViewPage;
      let schuleParams: SchuleCreationParams;
      let schuleId: string;
      let generierteKlassenNamen: string[] = [];

      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        const header: HeaderPage = new HeaderPage(page);
        personManagementViewPage = await loginAndNavigateToAdministration(page);

        // Schule anlegen
        let schuleCreationViewPage: SchuleCreationViewPage =
          await personManagementViewPage.menu.navigateToSchuleCreation();
        schuleParams = {
          name: generateSchulname(),
          dienststellenNr: generateDienststellenNr(),
          schulform: Schulform.Oeffentlich,
        };
        let schuleSuccessPage: SchuleCreationSuccessPage = await schuleCreationViewPage.createSchule(schuleParams);
        await schuleSuccessPage.waitForPageLoad();
        schuleId = await getOrganisationId(page, schuleParams.name);

        const adminOrganisation: string = organisationsName || schuleParams.name;
        const admin: UserInfo = await createPersonWithPersonenkontext(page, adminOrganisation, rolleName);

        // Bei Schuladmin mit 2 Schulen: zweite Schule anlegen
        if (hasMultipleSchulen) {
          const zweiteSchule: SchuleCreationParams = {
            name: generateSchulname(),
            dienststellenNr: generateDienststellenNr(),
            schulform: Schulform.Oeffentlich,
          };
          schuleCreationViewPage = await schuleSuccessPage.goBackToCreateAnotherSchule();
          schuleSuccessPage = await schuleCreationViewPage.createSchule(zweiteSchule);
          await schuleSuccessPage.waitForPageLoad();
          const zweiteSchuleId: string = await getOrganisationId(page, zweiteSchule.name);

          const rolleId: string = await getRolleId(page, rolleName);
          await addOrganisationenToPerson(page, admin.personId, [schuleId, zweiteSchuleId], rolleId);
        }

        generierteKlassenNamen = await Promise.all(
          Array.from({ length: 5 }, async () => {
            const klassenname: string = generateKlassenname();
            await createKlasse(page, schuleId, klassenname);
            return klassenname;
          }),
        );

        const landingPage: LandingViewPage = await header.logout();
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();

        // Anmeldung mit Passwortänderung
        const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
        await startPage.waitForPageLoad();

        // Navigation zur Klassenliste
        personManagementViewPage = await startPage.navigateToAdministration();
        klasseManagementViewPage = await personManagementViewPage.menu.navigateToKlasseManagement();
      });

      test.describe('UI Tests ohne Datenanlage', () => {
        // SPSH-2853
        test(`Als ${bezeichnung}: Klasse Ergebnisliste: UI prüfen`, { tag: [DEV, STAGE] }, async () => {
          await klasseManagementViewPage.checkManagementPage(hasMultipleSchulen);
        });
      });

      test.describe('Mit Klassendatenanlage', () => {
        // SPSH-2855
        test(
          `Als ${bezeichnung}: Jede Klasse hat eine Dienststellennummer neben dem Klassennamen`,
          { tag: [DEV, STAGE] },
          async () => {
            await klasseManagementViewPage.setItemsPerPage(50);
            await klasseManagementViewPage.checkTableData(hasMultipleSchulen);
          },
        );

        test(
          `Als ${bezeichnung}: Ergebnisliste Klassen nach Spalte Klasse sortieren können`,
          { tag: [DEV, STAGE] },
          async () => {
            await test.step(`Schule filtern oder validieren`, async () => {
              await klasseManagementViewPage.setItemsPerPage(5);
              await klasseManagementViewPage.checkRows(5);
              if (!hasMultipleSchulen) {
                await klasseManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
              }
            });

            await test.step(`Sortierverhalten prüfen`, async () => {
              await klasseManagementViewPage.checkIfColumnDataSorted(hasMultipleSchulen, 'ascending');

              await klasseManagementViewPage.toggleKlasseSort();
              await klasseManagementViewPage.checkIfColumnDataSorted(hasMultipleSchulen, 'descending');

              await klasseManagementViewPage.toggleKlasseSort();
              await klasseManagementViewPage.checkIfColumnDataSorted(hasMultipleSchulen, 'ascending');

              if (hasMultipleSchulen) {
                await klasseManagementViewPage.checkIfColumnHeaderSorted('Dienststellennummer', 'not-sortable');
              }
            });
          },
        );

        test(`Als ${bezeichnung}: in der Ergebnisliste die Filter benutzen`, { tag: [DEV, STAGE] }, async () => {
          const testKlasse: string = generierteKlassenNamen[0];

          await test.step(`In der Ergebnisliste eine Klasse durch Filter suchen`, async () => {
            if (hasMultipleSchulen) {
              await klasseManagementViewPage.filterBySchule(schuleParams.name);
            } else {
              await klasseManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
            }
            await klasseManagementViewPage.filterByKlasse(testKlasse);
            await klasseManagementViewPage.waitForDataLoad();
            await klasseManagementViewPage.checkIfKlasseExists(testKlasse);
            await klasseManagementViewPage.checkRows(1);
          });
        });

        test(
          `Als ${bezeichnung}: Alle Klassen im Drop-Down des Klassenfilters anzeigen`,
          { tag: [STAGE, DEV] },
          async () => {
            if (hasMultipleSchulen) {
              await klasseManagementViewPage.filterBySchule(schuleParams.name);
            } else {
              await klasseManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
            }
            await klasseManagementViewPage.checkAllDropdownOptionsVisible(generierteKlassenNamen);
          },
        );

        test(
          `Als ${bezeichnung}: Alle Klassen im Drop-Down des Klassenfilters anklickbar`,
          { tag: [STAGE, DEV] },
          async () => {
            if (hasMultipleSchulen) {
              await klasseManagementViewPage.filterBySchule(schuleParams.name);
            } else {
              await klasseManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
            }
            await klasseManagementViewPage.checkAllDropdownOptionsClickable(generierteKlassenNamen);
          },
        );
      });
    });
  },
);
