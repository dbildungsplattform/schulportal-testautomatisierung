import { PlaywrightTestArgs } from '@playwright/test';
import { createKlasse, createSchule, getOrganisationId } from '../../base/api/organisationApi';
import {
  addOrganisationenToPerson,
  createPerson,
  createPersonWithPersonenkontext,
  createRolleAndPersonWithPersonenkontext,
  UserInfo,
} from '../../base/api/personApi';
import { createRolle, getRolleId, RollenArt } from '../../base/api/rolleApi';
import { getServiceProviderId } from '../../base/api/serviceProviderApi';
import { test } from '../../base/fixtures';
import { landSH } from '../../base/organisation';
import {
  landesadminRolle,
  lehrerImVorbereitungsdienstRolle,
  lehrkraftOeffentlichRolle,
  religionsLehrkraftRolle,
  schuladminOeffentlichRolle,
} from '../../base/rollen';
import { typeSchueler } from '../../base/rollentypen';
import { itslearning } from '../../base/sp';
import { DEV } from '../../base/tags';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { createMany } from '../../base/utils/concurrency';
import {
  formatDateDMY,
  generateCurrentDate,
  generateDienststellenNr,
  generateKlassenname,
  generateNachname,
  generateRolleName,
  generateSchulname,
  generateVorname,
} from '../../base/utils/generateTestdata';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { RolleZuordnenPage } from '../../pages/admin/personen/mehrfachbearbeitung/RolleZuordnen.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';

test.describe(`Mehrfachbearbeitung Rolle zuordnen: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test.describe(`Als Schuladmin (1 Schule)`, () => {
    let personManagementViewPage: PersonManagementViewPage;
    let schueler1: UserInfo;
    let schueler2: UserInfo;
    let zielRolleName: string;
    let klasse1Name: string;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      await test.step(`Als Landesadmin anmelden`, async () => {
        personManagementViewPage = await loginAndNavigateToAdministration(page);
      });

      await test.step(`Testdaten via API anlegen (Schule mit 2 Klassen, 2 Schüler an einer Klasse, Ziel-Lern-Rolle, Schuladmin)`, async () => {
        // Schule anlegen
        const schuleName: string = generateSchulname();
        const schuleDstNr: string = generateDienststellenNr();
        const schuleId: string = await createSchule(page, schuleName, schuleDstNr);
        const itslearningId: string = await getServiceProviderId(page, itslearning, schuleId);

        // Zwei Klassen anlegen
        klasse1Name = generateKlassenname();
        const klasse2Name: string = generateKlassenname();
        const klasse1Id: string = await createKlasse(page, schuleId, klasse1Name);
        await createKlasse(page, schuleId, klasse2Name);

        // Ziel-Lern-Rolle anlegen, mit der die Mehrfachbearbeitung durchgeführt wird
        zielRolleName = generateRolleName();
        await createRolle(page, typeSchueler, schuleId, zielRolleName, undefined, undefined, new Set([itslearningId]));

        // Zwei Schüler mit jeweils eigener Lern-Rolle in Klasse 1 anlegen
        schueler1 = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: schuleName,
          rollenArt: typeSchueler,
          familienname: generateNachname(),
          vorname: generateVorname(),
          serviceProviderNames: [itslearning],
          rollenName: generateRolleName(),
          klasseId: klasse1Id,
        });

        schueler2 = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: schuleName,
          rollenArt: typeSchueler,
          familienname: generateNachname(),
          vorname: generateVorname(),
          serviceProviderNames: [itslearning],
          rollenName: generateRolleName(),
          klasseId: klasse1Id,
        });

        // Schuladmin (1 Schule) anlegen
        const admin: UserInfo = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);

        // Als Schuladmin neu anmelden (inkl. Passwortwechsel)
        const landingPage: LandingViewPage = await personManagementViewPage.getHeader().logout();
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();
        const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
        await startPage.waitForPageLoad();
        personManagementViewPage = await startPage.navigateToAdministration();
      });
    });

    test(
      `Lern-Rolle mehreren Schülern an einer Klasse über "Klasse(n) beibehalten" zuordnen`,
      { tag: [DEV] },
      async () => {
        let rolleZuordnenPage: RolleZuordnenPage;

        await test.step(`Nach Klasse filtern und beide Schüler auswählen`, async () => {
          await personManagementViewPage.filterAndSelectPersons(undefined, klasse1Name, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
        });

        await test.step(`Mehrfachbearbeitung "Rolle zuordnen" öffnen und Lern-Rolle auswählen`, async () => {
          rolleZuordnenPage = await personManagementViewPage.startRolleZuordnen();
          await rolleZuordnenPage.selectRolle(zielRolleName);
        });

        await test.step(`Beide Klassen-Optionen prüfen, "Klasse(n) beibehalten" ist standardmäßig ausgewählt`, async () => {
          await rolleZuordnenPage.assertKlassenOptionen();
        });

        await test.step(`Hinweistext zur Beibehaltung der Klasse prüfen`, async () => {
          await rolleZuordnenPage.assertHint(
            'Bitte beachten: Die neue Rolle wird den ausgewählten Schülerinnen und Schülern an ihren bestehenden Klassen zusätzlich zugeordnet.',
          );
        });

        await test.step(`"Rolle zuordnen" abschicken und Erfolgsdialog prüfen`, async () => {
          await rolleZuordnenPage.submitRolleAssignment();
          await rolleZuordnenPage.assertSuccessDialog();
          await rolleZuordnenPage.closeModal();
        });

        await test.step(`Aktualisierte Ergebnisliste prüfen: neue Rolle bei beiden Schülern sichtbar`, async () => {
          await personManagementViewPage.waitForDataLoad();
          await personManagementViewPage.checkRolleAssignedToPersons(zielRolleName, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
          await personManagementViewPage.checkKlasseAssignedToPersons(klasse1Name, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
        });
      },
    );
  });

  test.describe(`Als Schuladmin (2 Schulen)`, () => {
    let personManagementViewPage: PersonManagementViewPage;
    let schueler1: UserInfo;
    let schueler2: UserInfo;
    let schuelerMitZielRolle1: UserInfo;
    let schuelerMitZielRolle2: UserInfo;
    let zielRolleName: string;
    let zielKlasseName: string;
    let quellKlasseName: string;
    let schuleName: string;
    let schuleDstNr: string;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      await test.step(`Als Landesadmin anmelden`, async () => {
        personManagementViewPage = await loginAndNavigateToAdministration(page);
      });

      await test.step(`Testdaten via API anlegen (Schule mit 2 Klassen, 2 Schüler an Quellklasse, Ziel-Lern-Rolle, Schuladmin mit 2 Schulen)`, async () => {
        // Zwei Schulen anlegen
        schuleName = generateSchulname();
        schuleDstNr = generateDienststellenNr();
        const schuleId: string = await createSchule(page, schuleName, schuleDstNr);

        const zweiteSchuleName: string = generateSchulname();
        const zweiteSchuleDstNr: string = generateDienststellenNr();
        const zweiteSchuleId: string = await createSchule(page, zweiteSchuleName, zweiteSchuleDstNr);

        const itslearningId: string = await getServiceProviderId(page, itslearning, schuleId);

        // Quell- und Zielklasse an der ersten Schule anlegen
        quellKlasseName = generateKlassenname();
        zielKlasseName = generateKlassenname();
        const quellKlasseId: string = await createKlasse(page, schuleId, quellKlasseName);
        await createKlasse(page, schuleId, zielKlasseName);

        // Ziel-Lern-Rolle anlegen, mit der die Mehrfachbearbeitung durchgeführt wird
        zielRolleName = generateRolleName();
        const zielRolleId: string = await createRolle(
          page,
          typeSchueler,
          schuleId,
          zielRolleName,
          undefined,
          undefined,
          new Set([itslearningId]),
        );

        // Zwei Schüler mit jeweils eigener Lern-Rolle in der Quellklasse anlegen
        schueler1 = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: schuleName,
          rollenArt: typeSchueler,
          familienname: generateNachname(),
          vorname: generateVorname(),
          serviceProviderNames: [itslearning],
          rollenName: generateRolleName(),
          klasseId: quellKlasseId,
        });

        schueler2 = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: schuleName,
          rollenArt: typeSchueler,
          familienname: generateNachname(),
          vorname: generateVorname(),
          serviceProviderNames: [itslearning],
          rollenName: generateRolleName(),
          klasseId: quellKlasseId,
        });

        // Zwei weitere Schüler in der Quellklasse, die bereits die Ziel-Lern-Rolle besitzen
        // (für Fehlerfall: erneute Zuordnung derselben Rolle an eine andere Klasse)
        schuelerMitZielRolle1 = await createPerson(page, {
          organisationId: schuleId,
          rolleId: zielRolleId,
          familienname: generateNachname(),
          vorname: generateVorname(),
          klasseId: quellKlasseId,
        });
        schuelerMitZielRolle2 = await createPerson(page, {
          organisationId: schuleId,
          rolleId: zielRolleId,
          familienname: generateNachname(),
          vorname: generateVorname(),
          klasseId: quellKlasseId,
        });

        // Schuladmin mit 2 Schulen anlegen
        const admin: UserInfo = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);
        const schuladminRolleId: string = await getRolleId(page, schuladminOeffentlichRolle);
        await addOrganisationenToPerson(page, admin.personId, [schuleId, zweiteSchuleId], schuladminRolleId);

        // Als Schuladmin neu anmelden (inkl. Passwortwechsel)
        const landingPage: LandingViewPage = await personManagementViewPage.getHeader().logout();
        const loginPage: LoginViewPage = await landingPage.navigateToLogin();
        const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(admin.username, admin.password);
        await startPage.waitForPageLoad();
        personManagementViewPage = await startPage.navigateToAdministration();
      });
    });

    test(
      `Lern-Rolle mehreren Schülern an einer anderen Klasse über "Andere Klasse auswählen" zuordnen`,
      { tag: [DEV] },
      async () => {
        let rolleZuordnenPage: RolleZuordnenPage;

        await test.step(`Nach Schule und Quellklasse filtern und beide Schüler auswählen`, async () => {
          await personManagementViewPage.filterAndSelectPersons(schuleName, quellKlasseName, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
        });

        await test.step(`Mehrfachbearbeitung "Rolle zuordnen" öffnen, Schule und Lern-Rolle auswählen`, async () => {
          rolleZuordnenPage = await personManagementViewPage.startRolleZuordnen();
          await rolleZuordnenPage.selectOrganisation(schuleName);
          await rolleZuordnenPage.selectRolle(zielRolleName);
        });

        await test.step(`"Andere Klasse auswählen" wählen, Zielklasse setzen und Hinweistext prüfen`, async () => {
          await rolleZuordnenPage.selectAndereKlasseAuswaehlen();
          await rolleZuordnenPage.selectKlasse(zielKlasseName);
          await rolleZuordnenPage.assertHint(
            'Bitte beachten: Die neue Rolle wird den ausgewählten Schülerinnen und Schülern an der ausgewählten Klasse zugeordnet.',
          );
        });

        await test.step(`"Rolle zuordnen" abschicken und Erfolgsdialog prüfen`, async () => {
          await rolleZuordnenPage.submitRolleAssignment();
          await rolleZuordnenPage.assertSuccessDialog();
          await rolleZuordnenPage.closeModal();
        });

        await test.step(`Aktualisierte Ergebnisliste prüfen: neue Rolle und neue Klasse bei beiden Schülern sichtbar`, async () => {
          await personManagementViewPage.waitForDataLoad();
          await personManagementViewPage.checkRolleAssignedToPersons(zielRolleName, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
          await personManagementViewPage.checkKlasseAssignedToPersons(zielKlasseName, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
        });
      },
    );

    test(
      `Lern-Rolle mehreren Schülern an einer anderen Klasse mit Befristung zuordnen und Profil prüfen`,
      { tag: [DEV] },
      async () => {
        const befristung: string = formatDateDMY(generateCurrentDate({ days: 0, months: 6 }));
        let rolleZuordnenPage: RolleZuordnenPage;

        await test.step(`Nach Schule und Quellklasse filtern und beide Schüler auswählen`, async () => {
          await personManagementViewPage.filterAndSelectPersons(schuleName, quellKlasseName, [
            schueler1.nachname,
            schueler2.nachname,
          ]);
        });

        await test.step(`Mehrfachbearbeitung "Rolle zuordnen" öffnen, Schule und Lern-Rolle auswählen`, async () => {
          rolleZuordnenPage = await personManagementViewPage.startRolleZuordnen();
          await rolleZuordnenPage.selectOrganisation(schuleName);
          await rolleZuordnenPage.selectRolle(zielRolleName);
        });

        await test.step(`"Andere Klasse auswählen" wählen, Zielklasse setzen und Befristung eingeben`, async () => {
          await rolleZuordnenPage.selectAndereKlasseAuswaehlen();
          await rolleZuordnenPage.selectKlasse(zielKlasseName);
          await rolleZuordnenPage.fillBefristung(befristung);
        });

        await test.step(`"Rolle zuordnen" abschicken und Erfolgsdialog prüfen`, async () => {
          await rolleZuordnenPage.submitRolleAssignment();
          await rolleZuordnenPage.assertSuccessDialog();
          await rolleZuordnenPage.closeModal();
        });

        await test.step(`Schülerprofil öffnen und neue Zuordnung mit Befristung prüfen`, async () => {
          await personManagementViewPage.waitForDataLoad();
          const personDetailsView: PersonDetailsViewPage = await personManagementViewPage.openGesamtuebersicht(
            schueler1.nachname,
          );
          await personDetailsView.checkZuordnungExists({
            dstNr: schuleDstNr,
            organisation: schuleName,
            rolle: zielRolleName,
            klasse: zielKlasseName,
            befristung,
          });
        });
      },
    );

    test(
      `Fehlermeldung bei "Andere Klasse auswählen" mit bereits zugeordneter Lern-Rolle für mehrere Schüler`,
      { tag: [DEV] },
      async () => {
        let rolleZuordnenPage: RolleZuordnenPage;

        await test.step(`Nach Schule und Quellklasse filtern und beide Schüler (mit bereits zugeordneter Ziel-Lern-Rolle) auswählen`, async () => {
          await personManagementViewPage.filterAndSelectPersons(schuleName, quellKlasseName, [
            schuelerMitZielRolle1.nachname,
            schuelerMitZielRolle2.nachname,
          ]);
        });

        await test.step(`Mehrfachbearbeitung "Rolle zuordnen" öffnen, Schule und (bereits zugeordnete) Lern-Rolle auswählen`, async () => {
          rolleZuordnenPage = await personManagementViewPage.startRolleZuordnen();
          await rolleZuordnenPage.selectOrganisation(schuleName);
          await rolleZuordnenPage.selectRolle(zielRolleName);
        });

        await test.step(`"Andere Klasse auswählen" wählen und Zielklasse setzen`, async () => {
          await rolleZuordnenPage.selectAndereKlasseAuswaehlen();
          await rolleZuordnenPage.selectKlasse(zielKlasseName);
        });

        await test.step(`"Rolle zuordnen" abschicken und Fehlerdialog mit beiden Schülern prüfen`, async () => {
          await rolleZuordnenPage.submitRolleAssignment();
          await rolleZuordnenPage.assertErrorDialog([
            {
              vorname: schuelerMitZielRolle1.vorname,
              nachname: schuelerMitZielRolle1.nachname,
              username: schuelerMitZielRolle1.username,
            },
            {
              vorname: schuelerMitZielRolle2.vorname,
              nachname: schuelerMitZielRolle2.nachname,
              username: schuelerMitZielRolle2.username,
            },
          ]);
          await rolleZuordnenPage.closeErrorDialog();
        });
      },
    );
  });
});

interface LehrRolleTestFixture {
  adminType: 'Schuladmin' | 'Landesadmin';
  rollenAssertions: {
    rollenName: string;
    shouldKopersTextBeVisible: boolean;
    expectedBefristung: 'schuljahresende' | 'unbefristet';
  }[];
}

const LEHR_ROLLEN_TEST_SCENARIOS: LehrRolleTestFixture[] = [
  {
    adminType: 'Schuladmin',
    rollenAssertions: [
      {
        rollenName: lehrkraftOeffentlichRolle,
        shouldKopersTextBeVisible: true,
        expectedBefristung: 'unbefristet',
      },
      {
        rollenName: religionsLehrkraftRolle,
        shouldKopersTextBeVisible: false,
        expectedBefristung: 'unbefristet',
      },
    ],
  },
  {
    adminType: 'Landesadmin',
    rollenAssertions: [
      {
        rollenName: lehrerImVorbereitungsdienstRolle,
        shouldKopersTextBeVisible: true,
        expectedBefristung: 'schuljahresende',
      },
    ],
  },
];

for (const { adminType, rollenAssertions } of LEHR_ROLLEN_TEST_SCENARIOS) {
  test.describe(`Als ${adminType} Lehr-Rolle per Mehrfachbearbeitung zuordnen`, () => {
    let schulName: string;
    let rolleName: string;
    let adminUserInfo: UserInfo;
    let userInfos: UserInfo[] = [];
    const rolleToAssign: string = rollenAssertions.at(-1)!.rollenName;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      await loginAndNavigateToAdministration(page);
      schulName = generateSchulname();
      rolleName = generateRolleName();
      const schuleId: string = await createSchule(page, schulName);
      const rolleId: string = await createRolle(page, RollenArt.Lehr, schuleId, rolleName);
      userInfos = await createMany(5, () => createPerson(page, { organisationId: schuleId, rolleId }));
      const adminRolleId: string = await getRolleId(
        page,
        adminType === 'Schuladmin' ? schuladminOeffentlichRolle : landesadminRolle,
      );
      const adminOrgaId: string = adminType === 'Schuladmin' ? schuleId : await getOrganisationId(page, landSH);
      adminUserInfo = await createPerson(page, { organisationId: adminOrgaId, rolleId: adminRolleId });

      const landingPage: LandingViewPage = await logout(page);
      const loginPage: LoginViewPage = await landingPage.navigateToLogin();
      const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
        adminUserInfo.username,
        adminUserInfo.password,
      );
      await startPage.navigateToAdministration();
    });

    test(`Rolle ${rolleToAssign} per Mehrfachbearbeitung zuweisen`, async ({ page }: PlaywrightTestArgs) => {
      if (!rolleToAssign) {
        throw new Error('Rolle zum Zuweisen ist nicht definiert');
      }

      let personManagementViewPage: PersonManagementViewPage = new PersonManagementViewPage(page);

      await test.step('Personen auswählen', async () => {
        if (adminType === 'Landesadmin') {
          await personManagementViewPage.filterBySchule(schulName);
        }
        await personManagementViewPage.filterByRolle(rolleName);
        await personManagementViewPage.checkRowCount(userInfos.length);
        await personManagementViewPage.toggleSelectAllRows(true);
      });

      const rolleZuordnenPage: RolleZuordnenPage = await test.step('Mehrfachbearbeitung auswählen', async () => {
        return personManagementViewPage.startRolleZuordnen();
      });

      if (adminType === 'Schuladmin') {
        await test.step('Prüfen, dass Schule vorausgewählt ist', async () => {
          await rolleZuordnenPage.assertSelectedOrganisation(schulName);
        });
      } else {
        await test.step('Schule auswählen', async () => {
          await rolleZuordnenPage.selectOrganisation(schulName);
        });
      }

      await test.step(`Prüfen, dass keine LEIT-Rolle gefunden wird`, async () => {
        await rolleZuordnenPage.assertRolleNotFound(schuladminOeffentlichRolle);
      });

      for (const { rollenName, shouldKopersTextBeVisible, expectedBefristung } of rollenAssertions) {
        await test.step(`Rolle ${rollenName} auswählen und Prüfen, dass der Submit-Button aktiviert ist`, async () => {
          await rolleZuordnenPage.selectRolle(rollenName);
          await rolleZuordnenPage.assertSubmitButtonEnabled();
        });

        await test.step('Ausgewählte Befristungsoption prüfen', async () => {
          if (expectedBefristung === 'schuljahresende') {
            await rolleZuordnenPage.assertSchuljahresendeChecked();
          } else {
            await rolleZuordnenPage.assertUnbefristetChecked();
          }
        });

        await test.step('KoPers.-Hinweis prüfen', async () => {
          if (shouldKopersTextBeVisible) {
            await rolleZuordnenPage.assertKopersTextIsVisible();
          } else {
            await rolleZuordnenPage.assertKopersTextIsNotVisible();
          }
        });
      }

      await test.step('Ausführen und Erfolgsmeldung prüfen', async () => {
        await rolleZuordnenPage.submitRolleAssignment();
        await rolleZuordnenPage.assertSuccessMessageIsVisible();
      });

      personManagementViewPage = await test.step('Dialog schließen', async () => {
        return rolleZuordnenPage.closeModal();
      });

      await test.step('Prüfen, dass die Rolle korrekt zugeordnet wurde', async () => {
        await personManagementViewPage.assertThatAllPersonsHaveRolle(rolleToAssign);
      });

      await test.step('Prüfen, dass die Auswahl bestehen bleibt', async () => {
        await Promise.all(
          userInfos.map(async (userInfo: UserInfo) => {
            return personManagementViewPage.checkPersonSelected(userInfo.username);
          }),
        );
      });
    });
  });
}
