import { PlaywrightTestArgs } from '@playwright/test';
import { test } from '../../base/fixtures';

import { createSchule, getKlassenNamenBySchule, getOrganisationId } from '../../base/api/organisationApi';
import { addOrganisationenToPerson, createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { getRolleId } from '../../base/api/rolleApi';
import { landSH, testschule665Name, testschuleDstNr, testschuleName } from '../../base/organisation';
import { landesadminRolle, lehrkraftOeffentlichRolle, schuladminOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateDienststellenNr,
  generateKopersNr,
  generateNachname,
  generateSchulname,
  generateVorname,
} from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { SchuleCreationParams, Schulform } from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';
import {
  createKlassenAndSchuelerForSchulen,
  KlassenAndSchuelerData,
} from '../helpers/createKlassenAndSchuelerForSchulen';

let header: HeaderPage;
let landingPage: LandingViewPage;
let personManagementViewPage: PersonManagementViewPage;
let admin: UserInfo;

interface AdminFixture {
  organisationsName: string;
  dienststellenNr?: string;
  rolleName: string;
  bezeichnung: string;
}

[
  { organisationsName: landSH, dienststellenNr: undefined, rolleName: landesadminRolle, bezeichnung: 'Landesadmin' },
  {
    organisationsName: testschuleName,
    dienststellenNr: testschuleDstNr,
    rolleName: schuladminOeffentlichRolle,
    bezeichnung: 'Schuladmin',
  },
].forEach(({ organisationsName, dienststellenNr, rolleName, bezeichnung }: AdminFixture) => {
  let schuleId2: string;
  let schuleParams: SchuleCreationParams;
  let klassenNamen: string[] = [];

  test.describe(`Testfälle für die Ergebnisliste von Benutzern als ${bezeichnung}: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      header = new HeaderPage(page);
      personManagementViewPage = await loginAndNavigateToAdministration(page);

      admin = await createPersonWithPersonenkontext(
        page,
        organisationsName,
        rolleName,
        undefined,
        undefined,
        generateDienststellenNr(),
      );
      schuleParams = {
        name: generateSchulname(),
        dienststellenNr: generateDienststellenNr(),
        schulform: Schulform.Oeffentlich,
      };
      await createSchule(page, schuleParams.name, schuleParams.dienststellenNr);

      const schuleId1: string = await getOrganisationId(page, organisationsName);
      schuleId2 = await getOrganisationId(page, schuleParams.name);
      // Playwright Schule (1111139) hat manuell angelegte Klassen – dynamisch auslesen statt neu anzulegen.
      const playwrightSchuleId: string = await getOrganisationId(page, testschule665Name);
      klassenNamen = await getKlassenNamenBySchule(page, playwrightSchuleId);
      const rolleId: string = await getRolleId(page, rolleName);
      if (rolleName === schuladminOeffentlichRolle) {
        await addOrganisationenToPerson(page, admin.personId, [schuleId1, schuleId2, playwrightSchuleId], rolleId);
      }
      landingPage = await header.logout();
      const loginPage: LoginViewPage = await landingPage.navigateToLogin();

      // Erstmalige Anmeldung mit Passwortänderung
      const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
      await startPage.waitForPageLoad();

      // Navigation zur Ergebnisliste von Benutzern
      personManagementViewPage = await startPage.navigateToAdministration();
    });

    test.describe('UI-Tests ohne Datenanlage', () => {
      // SPSH-2923
      test(`Als ${bezeichnung}: Benutzer Ergebnisliste: UI prüfen`, { tag: [STAGE, DEV] }, async () => {
        await personManagementViewPage.checkManagementPage();
      });

      // SPSH-2925
      test.describe(`Als ${bezeichnung}: In der Ergebnisliste die Suchfunktion benutzen`, { tag: [STAGE, DEV] }, () => {
        for (const [key, getValue] of [
          ['Nachname', (): string => admin.nachname],
          ['Vorname', (): string => admin.vorname],
          ['Benutzername', (): string => admin.username],
          ['Kopersnummer', (): string => admin.kopersnummer],
        ] as [string, () => string][]) {
          test(`Suche nach ${key}`, async () => {
            const value: string = getValue();
            await personManagementViewPage.searchByText(value);
            await personManagementViewPage.assertThatPersonExists(value);
          });
        }

        // searching for rolle in search-field makes no sense
        test(`Suche nach Rolle`, async () => {
          await personManagementViewPage.filterByRolle(rolleName);
          await personManagementViewPage.checkIfRolleIsCorrect(rolleName);
        });

        test(`Suche nach einem nicht existierenden Eintrag`, async () => {
          await personManagementViewPage.searchByText('NichtExistierenderEintrag');
          await personManagementViewPage.assertThatPersonExists('Keine Daten gefunden.');
          await personManagementViewPage.checkRowCount(0);
        });
      });

      // SPSH-2926
      test(
        `Als ${bezeichnung}: In der Ergebnisliste die Filterfunktion der Schulen benutzen`,
        { tag: [STAGE, DEV] },
        async () => {
          const expectedSchuleName: string =
            rolleName === schuladminOeffentlichRolle ? schuleParams.name : organisationsName;
          const expectedDienststellenNr: string | undefined =
            rolleName === schuladminOeffentlichRolle ? schuleParams.dienststellenNr : dienststellenNr;

          if (rolleName === schuladminOeffentlichRolle) {
            await personManagementViewPage.filterBySchule(expectedSchuleName, false);
          } else {
            // The searchstring for land matches multiple organisations, so we need to use exactMatch=true
            await personManagementViewPage.filterBySchule(expectedSchuleName, true);
          }
          // Ensure the created admin is present without narrowing the result set via text search
          await personManagementViewPage.setItemsPerPage(300);
          await personManagementViewPage.assertThatPersonExists(admin.username);
          await personManagementViewPage.checkIfSchuleIsCorrect(expectedSchuleName, expectedDienststellenNr);
        },
      );
    });

    test.describe('Mit Nutzung vorhandener Klassen', () => {
      // SPSH-3056
      test.describe('Klassenfilter-Tests', () => {
        test(
          `Als ${bezeichnung}: Alle Klassen im Drop-Down des Klassenfilters anzeigen`,
          { tag: [DEV, STAGE] },
          async () => {
            await personManagementViewPage.filterBySchule(testschule665Name);
            await personManagementViewPage.checkIfKlassenAreVisibleInDropdown(klassenNamen);
          },
        );

        test(
          `Als ${bezeichnung}: Alle Klassen im Drop-Down des Klassenfilters anklickbar`,
          { tag: [DEV, STAGE] },
          async () => {
            // Jede Klasse wird einzeln gesucht und angeklickt – bei vielen Klassen eine
            // lange, aber legitime Interaktion. Timeout großzügiger setzen statt zu flaken.
            test.slow();
            await personManagementViewPage.filterBySchule(testschule665Name);
            await personManagementViewPage.checkAllKlassenOptionsClickable(klassenNamen);
          },
        );
      });
    });

    if (rolleName === landesadminRolle) {
      test.describe('Mit Personendatenanlage', () => {
        test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
          // 5 Personen anlegen zum Sortieren
          for (let i: number = 0; i < 5; i++) {
            await createPersonWithPersonenkontext(
              page,
              schuleParams.name,
              lehrkraftOeffentlichRolle,
              generateVorname(),
              generateNachname(),
              generateKopersNr(),
            );
          }
        });

        // SPSH-2174
        test.describe('Sortierungs-Tests', () => {
          test(
            `Als ${bezeichnung}: Ergebnisliste Benutzer nach Spalten sortieren können`,
            { tag: [DEV, STAGE] },
            async () => {
              await test.step(`Schule filtern`, async () => {
                await personManagementViewPage.setItemsPerPage(5);
                await personManagementViewPage.filterBySchule(schuleParams.name);
                await personManagementViewPage.checkIfSchuleIsCorrect(schuleParams.name, schuleParams.dienststellenNr);
                await personManagementViewPage.waitForDataLoad();
              });

              for (const column of [
                { name: 'Nachname', cellIndex: 1 },
                { name: 'Vorname', cellIndex: 2 },
                { name: 'Benutzername', cellIndex: 3 },
                { name: 'KoPers.-Nr.', cellIndex: 4 },
              ] as const) {
                await test.step(`Sortierverhalten Spalte ${column.name} prüfen`, async () => {
                  // Spaltenkopf muss einmal angeklickt werden (da standardmäßig nach Nachname sortiert ist)
                  if (column.name !== 'Nachname') {
                    await personManagementViewPage.toggleColumnSort(column.name);
                  }
                  await personManagementViewPage.checkIfColumnDataSorted(column.cellIndex, 'ascending');
                  await personManagementViewPage.toggleColumnSort(column.name);
                  await personManagementViewPage.checkIfColumnDataSorted(column.cellIndex, 'descending');

                  await personManagementViewPage.toggleColumnSort(column.name);
                  await personManagementViewPage.checkIfColumnDataSorted(column.cellIndex, 'ascending');
                });
              }
            },
          );

          test(
            `Als ${bezeichnung}: Ergebnisliste Benutzer: nicht sortierbare Spalten prüfen`,
            { tag: [DEV, STAGE] },
            async () => {
              await test.step(`Püfen, dass kein Sortier-Icon vorhanden ist`, async () => {
                await personManagementViewPage.checkIfColumnHeaderSorted('Rolle', 'not-sortable');
                await personManagementViewPage.checkIfColumnHeaderSorted('Schulzuordnung(en)', 'not-sortable');
                await personManagementViewPage.checkIfColumnHeaderSorted('Klasse', 'not-sortable');
              });
            },
          );
        });
      });
    }
  });
});

// SPSH-3494
test.describe(`Schulfilter in der Benutzerübersicht für Schuladmin mit einer Schule: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    header = new HeaderPage(page);
    personManagementViewPage = await loginAndNavigateToAdministration(page);

    const schuladmin: UserInfo = await createPersonWithPersonenkontext(
      page,
      testschuleName,
      schuladminOeffentlichRolle,
      undefined,
      undefined,
      generateDienststellenNr(),
    );

    landingPage = await header.logout();
    const loginPage: LoginViewPage = await landingPage.navigateToLogin();

    const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
      schuladmin.username,
      schuladmin.password,
    );
    await startPage.waitForPageLoad();

    personManagementViewPage = await startPage.navigateToAdministration();
  });

  test(
    `Als Schuladmin mit einer Schule: Schulfilter ist vorausgewählt und nicht änderbar`,
    { tag: [STAGE, DEV] },
    async () => {
      await test.step(`Schulfilter ist mit der Schule des Nutzers vorbelegt`, async () => {
        await personManagementViewPage.checkIfSchuleIsCorrect(testschuleName, testschuleDstNr);
      });

      await test.step(`Schulfilter kann nicht geändert werden`, async () => {
        await personManagementViewPage.assertSchuleFilterIsDisabled();
      });
    },
  );
});

test.describe('Als Landesadmin Selektion prüfen', () => {
  let schulId: string;
  let schulName: string;
  let schulNr: string;
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    personManagementViewPage = await loginAndNavigateToAdministration(page);
    schulName = generateSchulname();
    schulNr = generateDienststellenNr();
    schulId = await createSchule(page, schulName, schulNr);
  });

  test('Schulfilter löst Selektion auf', async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Personen anlegen`, async () => {
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle);
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle);
    });
    await test.step(`Schule filtern`, async () => {
      await personManagementViewPage.filterBySchule(schulName);
      await personManagementViewPage.checkIfSchuleIsCorrect(schulName, schulNr);
      await personManagementViewPage.checkRowCount(2);
    });
    await test.step(`Personen selektieren`, async () => {
      await personManagementViewPage.toggleSelectAllRows(true);
      await personManagementViewPage.assertSelectedPersonsByCount(2);
    });
    await test.step(`Schulfilter ändern`, async () => {
      await personManagementViewPage.filterBySchule(landSH, true);
      await personManagementViewPage.filterBySchule(schulName);
    });
    await test.step(`Prüfen, dass Personen deselektiert wurden`, async () => {
      await personManagementViewPage.assertSelectedPersonsByCount(0);
    });
  });

  test('Rollenfilter löst Selektion auf', async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Personen anlegen`, async () => {
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle);
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle);
    });
    await test.step(`Schule und Rolle filtern`, async () => {
      await personManagementViewPage.filterBySchule(schulName);
      await personManagementViewPage.checkIfSchuleIsCorrect(schulName, schulNr);
      await personManagementViewPage.filterByRolle(lehrkraftOeffentlichRolle);
      await personManagementViewPage.checkRowCount(2);
    });
    await test.step(`Personen selektieren`, async () => {
      await personManagementViewPage.toggleSelectAllRows(true);
      await personManagementViewPage.assertSelectedPersonsByCount(2);
    });
    await test.step(`Rollenfilter ändern`, async () => {
      await personManagementViewPage.filterByRolle(lehrkraftOeffentlichRolle);
      await personManagementViewPage.filterByRolle(schuladminOeffentlichRolle);
    });
    await test.step(`Prüfen, dass Personen deselektiert wurden`, async () => {
      await personManagementViewPage.assertSelectedPersonsByCount(0);
    });
  });

  test('Klassenfilter löst Selektion auf', async ({ page }: PlaywrightTestArgs) => {
    const klassenUndSchueler: KlassenAndSchuelerData[] = await test.step(`Klassen und SuS anlegen`, async () => {
      return await createKlassenAndSchuelerForSchulen(page, [
        {
          klassenCount: 2,
          schuelerCount: 2,
          schuleId: schulId,
          params: { name: schulName, schulform: Schulform.Oeffentlich, dienststellenNr: schulNr },
        },
      ]);
    });
    await test.step(`Schule und Klasse filtern`, async () => {
      await personManagementViewPage.filterBySchule(schulName);
      await personManagementViewPage.checkIfSchuleIsCorrect(schulName, schulNr);
      await personManagementViewPage.filterByKlasse(klassenUndSchueler[0].klassenNamenSchule[0]);
      await personManagementViewPage.checkRowCount(2);
    });
    await test.step(`Personen selektieren`, async () => {
      await personManagementViewPage.toggleSelectAllRows(true);
      await personManagementViewPage.assertSelectedPersonsByCount(2);
    });
    await test.step(`Klassenfilter ändern`, async () => {
      await personManagementViewPage.filterByKlasse(klassenUndSchueler[0].klassenNamenSchule[0]);
      await personManagementViewPage.filterByKlasse(klassenUndSchueler[0].klassenNamenSchule[1]);
    });
    await test.step(`Prüfen, dass Personen deselektiert wurden`, async () => {
      await personManagementViewPage.assertSelectedPersonsByCount(0);
    });
  });

  test('Textsuche löst Selektion auf', async ({ page }: PlaywrightTestArgs) => {
    const nachname: string = generateNachname();
    await test.step(`Personen anlegen`, async () => {
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle, generateVorname(), nachname);
      await createPersonWithPersonenkontext(page, schulName, lehrkraftOeffentlichRolle, generateVorname(), nachname);
    });
    await test.step(`Nach Personen suchen`, async () => {
      await personManagementViewPage.searchByText(nachname);
      await personManagementViewPage.checkRowCount(2);
    });
    await test.step(`Personen selektieren`, async () => {
      await personManagementViewPage.toggleSelectAllRows(true);
      await personManagementViewPage.assertSelectedPersonsByCount(2);
    });
    await test.step(`Textsuche ändern`, async () => {
      await personManagementViewPage.searchByText('NichtExistierenderEintrag');
    });
    await test.step(`Prüfen, dass Personen deselektiert wurden`, async () => {
      await personManagementViewPage.assertSelectedPersonsByCount(0);
    });
  });
});
