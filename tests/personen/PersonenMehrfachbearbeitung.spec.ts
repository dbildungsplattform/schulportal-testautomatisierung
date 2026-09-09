import { Download, Page, PlaywrightTestArgs } from '@playwright/test';
import { RollenArt } from '../../base/api/generated/models/RollenArt';
import { createKlasse, createSchule } from '../../base/api/organisationApi';
import {
  addOrganisationenToPerson,
  createPerson,
  createPersonWithPersonenkontext,
  createUserWithLernRollenInDifferentKlassen,
  UserInfo,
} from '../../base/api/personApi';
import { createRolle, getRolleId } from '../../base/api/rolleApi';
import { getServiceProviderId } from '../../base/api/serviceProviderApi';
import { test } from '../../base/fixtures';
import { landSH } from '../../base/organisation';
import { landesadminRolle, schuladminOeffentlichRolle } from '../../base/rollen';
import { typeLehrer, typeSchueler } from '../../base/rollentypen';
import { itslearning } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { createMany } from '../../base/utils/concurrency';
import {
  generateDienststellenNr,
  generateKlassenname,
  generateRolleName,
  generateSchulname,
} from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { SchuleCreationParams, Schulform } from '../../pages/admin/organisationen/schulen/SchuleCreationView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { RolleEntziehenPage } from '../../pages/admin/personen/mehrfachbearbeitung/RolleEntziehen.page';
import { HeaderPage } from '../../pages/components/Header.page';
import {
  createKlassenAndSchuelerForSchulen,
  KlassenAndSchuelerData,
} from '../helpers/createKlassenAndSchuelerForSchulen';

const ROLLE_ENTZIEHEN_TYPES: { rollenArt: RollenArt; bezeichnung: string }[] = [
  { rollenArt: typeLehrer, bezeichnung: 'Lehrkraft (LEHR)' },
  { rollenArt: typeSchueler, bezeichnung: 'Schüler (LERN)' },
];

const ROLLE_ENTZIEHEN_BULK_COUNT: number = 2;

const LERN_ROLLE_ENTZIEHEN_KLASSEN_VARIANTEN: { bezeichnung: string; unterschiedlicheKlassen: boolean }[] = [
  { bezeichnung: 'an derselben Klasse', unterschiedlicheKlassen: false },
  { bezeichnung: 'an unterschiedlichen Klassen', unterschiedlicheKlassen: true },
];

async function createUsersWithRolle(
  page: PlaywrightTestArgs['page'],
  schuleId: string,
  rolleId: string,
  count: number,
  klasseId?: string,
  secondaryRolleId?: string,
): Promise<UserInfo[]> {
  return createMany(count, () =>
    createPerson(page, {
      organisationId: schuleId,
      rolleId,
      klasseId,
      secondaryRolleId,
    }),
  );
}

async function selectUsersAndOpenRolleEntziehenDialog(
  personManagementViewPage: PersonManagementViewPage,
  rolleName: string | undefined,
  users: UserInfo[],
): Promise<RolleEntziehenPage> {
  if (rolleName) {
    await personManagementViewPage.filterByRolle(rolleName);
    await personManagementViewPage.waitForDataLoad();
  }

  for (const user of users) {
    await personManagementViewPage.assertThatPersonExists(user.username);
    await personManagementViewPage.selectPerson(user.username);
    await personManagementViewPage.checkPersonSelected(user.username);
  }

  return personManagementViewPage.startRolleEntziehen();
}

interface AdminFixture {
  organisationsName?: string;
  rolleName: string;
  bezeichnung: string;
}

async function logoutAndFirstLoginWithAnotherUser(
  page: Page,
  username: string,
  password: string,
): Promise<PersonManagementViewPage> {
  const header: HeaderPage = new HeaderPage(page);
  const landingPage: LandingViewPage = await test.step('Logout', async () => header.logout());
  return test.step('Login mit anderem Benutzer', async () => {
    const loginPage: LoginViewPage = await landingPage.navigateToLogin();
    const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(username, password);
    await startPage.waitForPageLoad();
    return startPage.navigateToAdministration();
  });
}

[
  { organisationsName: landSH, rolleName: landesadminRolle, bezeichnung: 'Landesadmin' },
  { rolleName: schuladminOeffentlichRolle, bezeichnung: 'Schuladmin (1 Schule)' },
  { rolleName: schuladminOeffentlichRolle, bezeichnung: 'Schuladmin (2 Schulen)' },
].forEach(({ organisationsName, rolleName, bezeichnung }: AdminFixture) => {
  test.describe(`Testfälle für die Mehrfachbearbeitung von Benutzern als ${bezeichnung}: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
    const hasMultipleSchulen: boolean = bezeichnung !== 'Schuladmin (1 Schule)';
    let personManagementViewPage: PersonManagementViewPage;
    let schule1Params: SchuleCreationParams;
    let schule2Params: SchuleCreationParams;
    let schuleId: string;
    let schuleId2: string;
    let admin: UserInfo;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      personManagementViewPage = await loginAndNavigateToAdministration(page);
      // Schule anlegen
      const schule1Name: string = generateSchulname();
      const schule1Kennung: string = generateDienststellenNr();
      schule1Params = {
        name: schule1Name,
        dienststellenNr: schule1Kennung,
        schulform: Schulform.Oeffentlich,
      };
      schuleId = await createSchule(page, schule1Name, schule1Kennung);

      const adminOrganisation: string = organisationsName || schule1Name;
      admin = await createPersonWithPersonenkontext(page, adminOrganisation, rolleName);

      // für Admins mit mehreren Schulen: zweite Schule anlegen
      if (hasMultipleSchulen) {
        const schule2Name: string = generateSchulname();
        const schule2Kennung: string = generateDienststellenNr();
        schule2Params = {
          name: schule2Name,
          dienststellenNr: schule2Kennung,
          schulform: Schulform.Oeffentlich,
        };
        schuleId2 = await createSchule(page, schule2Name, schule2Kennung);

        const rolleId: string = await getRolleId(page, rolleName);
        await addOrganisationenToPerson(page, admin.personId, [schuleId, schuleId2], rolleId);
      }
    });

    test(
      `Als ${bezeichnung}: Schüler versetzen als Mehrfachbearbeitung prüfen`,
      { tag: [STAGE, DEV] },
      async ({ page }: PlaywrightTestArgs) => {
        let testData: KlassenAndSchuelerData[];

        await test.step(`Testdaten erstellen`, async () => {
          testData = await createKlassenAndSchuelerForSchulen(page, [
            { params: schule1Params, schuleId, klassenCount: 26, schuelerCount: 3 },
            ...(hasMultipleSchulen
              ? [{ params: schule2Params, schuleId: schuleId2, klassenCount: 2, schuelerCount: 2 }]
              : []),
          ]);
        });

        await logoutAndFirstLoginWithAnotherUser(page, admin.username, admin.password);

        if (hasMultipleSchulen) {
          await test.step(`Fehlermeldungen für Schule und Schülerrolle testen`, async () => {
            await personManagementViewPage.setItemsPerPage(50);
            await personManagementViewPage.toggleSelectAllRows(true);
            await personManagementViewPage.selectMehrfachauswahl('Schüler versetzen');
            await personManagementViewPage.checkSchuelerVersetzenErrorDialog('all');
            await personManagementViewPage.closeDialog('invalid-selection-alert-dialog-cancel-button');

            await personManagementViewPage.filterBySchule(schule1Params.name);
          });
        }

        await test.step(`Fehlermeldungen nur für Schülerrolle testen`, async () => {
          await personManagementViewPage.setItemsPerPage(5);
          await personManagementViewPage.checkRowCount(4);
          await personManagementViewPage.toggleSelectAllRows(true);
          await personManagementViewPage.selectMehrfachauswahl('Schüler versetzen');
          await personManagementViewPage.checkSchuelerVersetzenErrorDialog('rolle');
          await personManagementViewPage.closeDialog('invalid-selection-alert-dialog-cancel-button');
        });

        await test.step(`Nur Schüler auswählen`, async () => {
          await personManagementViewPage.toggleSelectAllRows(false);
          for (const schueler of testData[0].schuelerSchule) {
            await personManagementViewPage.assertThatPersonExists(`${schueler.nachname}`);
            await personManagementViewPage.selectPerson(`${schueler.nachname}`);
            await personManagementViewPage.checkPersonSelected(`${schueler.nachname}`);
          }
        });

        await test.step(`Schüler versetzen-Dialog prüfen und anschließend versetzen`, async () => {
          await personManagementViewPage.selectMehrfachauswahl('Schüler versetzen');
          await personManagementViewPage.checkSchuelerVersetzenDialog(testData[0].klassenNamenSchule);
          await personManagementViewPage.versetzeSchueler(testData[0].klassenNamenSchule[0]);
        });

        await test.step(`Progressbar und Erfolgsdialog prüfen`, async () => {
          await personManagementViewPage.checkSchuelerVersetzenInProgress();
          await personManagementViewPage.checkSchuelerVersetzenSuccessDialog();
          await personManagementViewPage.closeDialog('bulk-change-klasse-close-button');
        });

        await test.step(`Aktualisierte Ergebnisliste prüfen`, async () => {
          await personManagementViewPage.checkNewKlasseNachVersetzen(
            testData[0].schuelerSchule,
            testData[0].klassenNamenSchule[0],
          );
        });
      },
    );

    if (bezeichnung !== 'Schuladmin (2 Schulen)') {
      test(
        `Als ${bezeichnung}: Passwörter zurücksetzen als Mehrfachbearbeitung prüfen`,
        { tag: [STAGE, DEV] },
        async ({ page }: PlaywrightTestArgs) => {
          let testData: KlassenAndSchuelerData[];

          await test.step(`Testdaten erstellen`, async () => {
            testData = await createKlassenAndSchuelerForSchulen(page, [
              { params: schule1Params, schuleId, klassenCount: 1, schuelerCount: 4 },
              ...(hasMultipleSchulen
                ? [{ params: schule2Params, schuleId: schuleId2, klassenCount: 1, schuelerCount: 1 }]
                : []),
            ]);
          });

          await logoutAndFirstLoginWithAnotherUser(page, admin.username, admin.password);

          if (hasMultipleSchulen) {
            await test.step(`Fehlermeldungen für Schule testen`, async () => {
              await personManagementViewPage.setItemsPerPage(50);
              await personManagementViewPage.toggleSelectAllRows(true);
              await personManagementViewPage.selectMehrfachauswahl('Passwort zurücksetzen');
              await personManagementViewPage.checkPasswortZuruecksetzenErrorDialog();
              await personManagementViewPage.closeDialog('invalid-selection-alert-dialog-cancel-button');
              await personManagementViewPage.filterBySchule(schule1Params.name);
            });
          }

          await test.step(`Passwort zurücksetzen-Dialog prüfen und anschließend zurücksetzen`, async () => {
            await personManagementViewPage.setItemsPerPage(5);
            await personManagementViewPage.checkRowCount(5);
            await personManagementViewPage.toggleSelectAllRows(true);
            await personManagementViewPage.selectMehrfachauswahl('Passwort zurücksetzen');
            await personManagementViewPage.checkPasswortZuruecksetzenDialog();
            await personManagementViewPage.resetPassword();
          });

          await test.step(`Progressbar und Erfolgsdialog prüfen`, async () => {
            await personManagementViewPage.checkPasswortZuruecksetzenInProgress();
            await personManagementViewPage.checkPasswortZuruecksetzenSuccessDialog();
            await personManagementViewPage.closeDialog('password-reset-close-button');
          });

          await test.step(`Hinweis zur Passwortdatei prüfen und anschließend Datei herunterladen `, async () => {
            await personManagementViewPage.checkPasswortdateiHinweis();
            await personManagementViewPage.closeDialog('password-reset-download-confirmation-button');
            const download: Download = await personManagementViewPage.downloadPasswordFile();
            const users: UserInfo[] = [...testData[0].schuelerSchule, admin];
            await personManagementViewPage.checkPasswortdatei(
              download,
              schule1Params.dienststellenNr,
              users,
              hasMultipleSchulen,
            );
            await personManagementViewPage.closeDialog('password-reset-close-button');
          });
        },
      );
    }
  });
});

test.describe('Rolle entziehen als Schuladmin', () => {
  let personManagementViewPage: PersonManagementViewPage;
  let schuleId: string;
  let admin: UserInfo;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    personManagementViewPage = await loginAndNavigateToAdministration(page);

    const schuleName: string = generateSchulname();
    schuleId = await createSchule(page, schuleName);

    admin = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);
  });

  async function switchToSchuladmin(page: PlaywrightTestArgs['page']): Promise<PersonManagementViewPage> {
    const header: HeaderPage = new HeaderPage(page);
    const landingPage: LandingViewPage = await header.logout();
    const loginPage: LoginViewPage = await landingPage.navigateToLogin();
    const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
    await startPage.waitForPageLoad();
    const schuladminPersonManagementViewPage: PersonManagementViewPage = await startPage.navigateToAdministration();
    await schuladminPersonManagementViewPage.waitForPageLoad();
    return schuladminPersonManagementViewPage;
  }

  test(
    'Fehler wenn Rolle die einzige Rollenzuordnung ist',
    { tag: [DEV, STAGE] },
    async ({ page }: PlaywrightTestArgs) => {
      const stepData: { bezeichnung: string; rolleName: string; users: UserInfo[] }[] = [];

      await test.step('Setup', async () => {
        const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId)];
        for (const { rollenArt, bezeichnung } of ROLLE_ENTZIEHEN_TYPES) {
          const targetRolleName: string = generateRolleName();
          const targetRolleId: string = await createRolle(
            page,
            rollenArt,
            schuleId,
            targetRolleName,
            undefined,
            undefined,
            new Set(idSPs),
          );
          const klasseId: string | undefined =
            rollenArt === typeSchueler ? await createKlasse(page, schuleId, generateKlassenname()) : undefined;

          const users: UserInfo[] = await createUsersWithRolle(
            page,
            schuleId,
            targetRolleId,
            ROLLE_ENTZIEHEN_BULK_COUNT,
            klasseId,
          );

          stepData.push({ bezeichnung, rolleName: targetRolleName, users });
        }
      });

      personManagementViewPage = await test.step('Als Schuladmin anmelden', async () => switchToSchuladmin(page));

      for (const { bezeichnung, rolleName, users } of stepData) {
        await test.step(bezeichnung, async () => {
          await personManagementViewPage.resetFilter();
          const rolleEntziehenPage: RolleEntziehenPage = await selectUsersAndOpenRolleEntziehenDialog(
            personManagementViewPage,
            rolleName,
            users,
          );
          await rolleEntziehenPage.submit();

          await rolleEntziehenPage.assertInProgress();
          await rolleEntziehenPage.assertBulkErrorDialog(users.length);
          await rolleEntziehenPage.closeBulkErrorDialog();
        });
      }
    },
  );

  test('Rolle wird erfolgreich entzogen', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
    const stepData: { bezeichnung: string; rolleName: string; users: UserInfo[] }[] = [];

    await test.step('Setup', async () => {
      const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId)];
      for (const { rollenArt, bezeichnung } of ROLLE_ENTZIEHEN_TYPES) {
        const targetRolleName: string = generateRolleName();
        const secondaryRolleName: string = generateRolleName();
        const targetRolleId: string = await createRolle(
          page,
          rollenArt,
          schuleId,
          targetRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );
        const secondaryRolleId: string = await createRolle(
          page,
          rollenArt,
          schuleId,
          secondaryRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );
        const klasseId: string | undefined =
          rollenArt === typeSchueler ? await createKlasse(page, schuleId, generateKlassenname()) : undefined;

        const users: UserInfo[] = await createUsersWithRolle(
          page,
          schuleId,
          targetRolleId,
          ROLLE_ENTZIEHEN_BULK_COUNT,
          klasseId,
          secondaryRolleId,
        );

        stepData.push({ bezeichnung, rolleName: targetRolleName, users });
      }
    });

    personManagementViewPage = await test.step('Als Schuladmin anmelden', async () => switchToSchuladmin(page));

    for (const { bezeichnung, rolleName, users } of stepData) {
      await test.step(bezeichnung, async () => {
        await personManagementViewPage.resetFilter();
        const rolleEntziehenPage: RolleEntziehenPage = await selectUsersAndOpenRolleEntziehenDialog(
          personManagementViewPage,
          rolleName,
          users,
        );
        await rolleEntziehenPage.submit();

        await rolleEntziehenPage.assertInProgress();
        await rolleEntziehenPage.assertSuccess();
        await rolleEntziehenPage.close();
      });

      await test.step(`${bezeichnung}: Benutzer nicht mehr in gefilterter Liste`, async () => {
        await personManagementViewPage.waitForDataLoad();
        for (const user of users) {
          await personManagementViewPage.checkIfPersonNotExists(user.username);
        }
      });
    }
  });

  test(
    'Nicht vorhandene LERN-Rolle wird beim Entziehen ignoriert',
    { tag: [DEV, STAGE] },
    async ({ page }: PlaywrightTestArgs) => {
      let zugewieseneRolleName: string = '';
      let nichtZugewieseneRolleName: string = '';
      let users: UserInfo[] = [];

      await test.step('Setup', async () => {
        const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId)];
        zugewieseneRolleName = generateRolleName();
        nichtZugewieseneRolleName = generateRolleName();
        const zugewieseneRolleId: string = await createRolle(
          page,
          typeSchueler,
          schuleId,
          zugewieseneRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );
        await createRolle(
          page,
          typeSchueler,
          schuleId,
          nichtZugewieseneRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );

        const klasseId: string = await createKlasse(page, schuleId, generateKlassenname());
        users = await createUsersWithRolle(page, schuleId, zugewieseneRolleId, ROLLE_ENTZIEHEN_BULK_COUNT, klasseId);

        personManagementViewPage = await switchToSchuladmin(page);
      });

      await test.step('Aktion Rolle entziehen', async () => {
        await personManagementViewPage.resetFilter();
        const rolleEntziehenPage: RolleEntziehenPage = await selectUsersAndOpenRolleEntziehenDialog(
          personManagementViewPage,
          undefined,
          users,
        );
        await rolleEntziehenPage.selectRolle(nichtZugewieseneRolleName);
        await rolleEntziehenPage.submit();
      });

      await test.step('Verifikation der entzogenen Rolle', async () => {
        const rolleEntziehenPage: RolleEntziehenPage = new RolleEntziehenPage(page);
        await rolleEntziehenPage.assertInProgress();
        await rolleEntziehenPage.assertSuccess();
        await rolleEntziehenPage.close();
      });
    },
  );

  LERN_ROLLE_ENTZIEHEN_KLASSEN_VARIANTEN.forEach(({ bezeichnung, unterschiedlicheKlassen }) => {
    test(
      `Rolle LERN wird erfolgreich entzogen ${bezeichnung}`,
      { tag: [DEV, STAGE] },
      async ({ page }: PlaywrightTestArgs) => {
        let targetRolleName: string = '';
        let users: UserInfo[] = [];

        await test.step('Setup', async () => {
          const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId)];
          targetRolleName = generateRolleName();
          const secondaryRolleName: string = generateRolleName();
          const targetRolleId: string = await createRolle(
            page,
            typeSchueler,
            schuleId,
            targetRolleName,
            undefined,
            undefined,
            new Set(idSPs),
          );
          const secondaryRolleId: string = await createRolle(
            page,
            typeSchueler,
            schuleId,
            secondaryRolleName,
            undefined,
            undefined,
            new Set(idSPs),
          );

          const primaryKlasseId: string = await createKlasse(page, schuleId, generateKlassenname());
          if (unterschiedlicheKlassen) {
            const secondaryKlasseId: string = await createKlasse(page, schuleId, generateKlassenname());
            users = await createMany(ROLLE_ENTZIEHEN_BULK_COUNT, () =>
              createUserWithLernRollenInDifferentKlassen(
                page,
                schuleId,
                targetRolleId,
                secondaryRolleId,
                primaryKlasseId,
                secondaryKlasseId,
              ),
            );
          } else {
            users = await createUsersWithRolle(
              page,
              schuleId,
              targetRolleId,
              ROLLE_ENTZIEHEN_BULK_COUNT,
              primaryKlasseId,
              secondaryRolleId,
            );
          }

          personManagementViewPage = await switchToSchuladmin(page);
        });

        await test.step('Aktion', async () => {
          await personManagementViewPage.resetFilter();
          const rolleEntziehenPage: RolleEntziehenPage = await selectUsersAndOpenRolleEntziehenDialog(
            personManagementViewPage,
            targetRolleName,
            users,
          );
          await rolleEntziehenPage.submit();
        });

        await test.step('Verifikation', async () => {
          const rolleEntziehenPage: RolleEntziehenPage = new RolleEntziehenPage(page);
          await rolleEntziehenPage.assertInProgress();
          await rolleEntziehenPage.assertSuccess();
          await rolleEntziehenPage.close();
        });

        await test.step('Benutzer nicht mehr in gefilterter Liste', async () => {
          await personManagementViewPage.waitForDataLoad();
          for (const user of users) {
            await personManagementViewPage.checkIfPersonNotExists(user.username);
          }
        });
      },
    );
  });

  test('Teilerfolg bei gemischten Benutzern', { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
    const stepData: { bezeichnung: string; rolleName: string; singleRolleUsers: UserInfo[]; allUsers: UserInfo[] }[] =
      [];

    await test.step('Setup', async () => {
      const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId)];
      for (const { rollenArt, bezeichnung } of ROLLE_ENTZIEHEN_TYPES) {
        const targetRolleName: string = generateRolleName();
        const secondaryRolleName: string = generateRolleName();
        const targetRolleId: string = await createRolle(
          page,
          rollenArt,
          schuleId,
          targetRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );
        const secondaryRolleId: string = await createRolle(
          page,
          rollenArt,
          schuleId,
          secondaryRolleName,
          undefined,
          undefined,
          new Set(idSPs),
        );
        const klasseId: string | undefined =
          rollenArt === typeSchueler ? await createKlasse(page, schuleId, generateKlassenname()) : undefined;

        const singleRolleUsers: UserInfo[] = await createUsersWithRolle(
          page,
          schuleId,
          targetRolleId,
          ROLLE_ENTZIEHEN_BULK_COUNT,
          klasseId,
        );
        const multiRolleUsers: UserInfo[] = await createUsersWithRolle(
          page,
          schuleId,
          targetRolleId,
          ROLLE_ENTZIEHEN_BULK_COUNT,
          klasseId,
          secondaryRolleId,
        );

        const allUsers: UserInfo[] = [...singleRolleUsers, ...multiRolleUsers];
        stepData.push({ bezeichnung, rolleName: targetRolleName, singleRolleUsers, allUsers });
      }
    });

    personManagementViewPage = await test.step('Als Schuladmin anmelden', async () => switchToSchuladmin(page));

    for (const { bezeichnung, rolleName, singleRolleUsers, allUsers } of stepData) {
      await test.step(bezeichnung, async () => {
        await personManagementViewPage.resetFilter();
        const rolleEntziehenPage: RolleEntziehenPage = await selectUsersAndOpenRolleEntziehenDialog(
          personManagementViewPage,
          rolleName,
          allUsers,
        );
        await rolleEntziehenPage.submit();

        await rolleEntziehenPage.assertInProgress();
        await rolleEntziehenPage.assertBulkErrorDialog(singleRolleUsers.length);
        await rolleEntziehenPage.closeBulkErrorDialog();
      });
    }
  });
});
