import test, { Download, PlaywrightTestArgs } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { createKlasse, createSchule } from '../../base/api/organisationApi';
import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { landSH } from '../../base/organisation';
import { landesadminRolle, schuelerRolle } from '../../base/rollen';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateKlassenname,
  generateNachname,
  generateSchulname,
  generateVorname,
} from '../../base/utils/generateTestdata';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { PersonImportViewPage } from '../../pages/admin/personen/PersonImportView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { MenuBarPage } from '../../pages/components/MenuBar.page';

interface ImportUser {
  nachname: string;
  vorname: string;
  klasse: string;
}

interface KlassennameSzenario {
  beschreibung: string;
  erzeugeKlassenname: (index: number) => string;
}

const klassennameSzenarien: KlassennameSzenario[] = [
  { beschreibung: 'generierten Klassennamen', erzeugeKlassenname: () => generateKlassenname() },
  { beschreibung: 'numerischen Klassennamen (1, 2, 3, ...)', erzeugeKlassenname: (index: number) => `${index + 1}` },
];

for (const szenario of klassennameSzenarien) {
  test.describe(`Als Landesadmin Benutzer importieren mit ${szenario.beschreibung}`, () => {
    let schuleName: string;
    let klassennnamen: string[];
    let usersToBeImported: ImportUser[];
    let filePath: string;
    let personImportPage: PersonImportViewPage;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      let personManagementPage: PersonManagementViewPage = await test.step(`Einloggen als Root`, async () => {
        return loginAndNavigateToAdministration(page);
      });

      await test.step(`Schule und Klassen anlegen`, async () => {
        schuleName = generateSchulname();
        const schuleId: string = await createSchule(page, schuleName);
        klassennnamen = Array.from({ length: 5 }, (_: unknown, index: number) => szenario.erzeugeKlassenname(index));
        await Promise.all(klassennnamen.map((klassennname: string) => createKlasse(page, schuleId, klassennname)));
      });

      await test.step(`Testdatei erstellen`, async () => {
        usersToBeImported = klassennnamen.map((klasse: string) => ({
          nachname: generateNachname(),
          vorname: generateVorname(),
          klasse,
        }));
        let csvContent: string = 'Nachname;Vorname;Klasse\n';
        csvContent += usersToBeImported
          .map((user: ImportUser) => `${user.nachname};${user.vorname};${user.klasse}`)
          .join('\n');
        filePath = join(mkdtempSync(`${tmpdir()}${sep}`), 'test-import.csv');
        await writeFile(filePath, csvContent);
      });

      const userInfo: UserInfo = await test.step(`Landesadmin anlegen`, async () => {
        return createPersonWithPersonenkontext(page, landSH, landesadminRolle);
      });

      const loginPage: LoginViewPage = await test.step(`Abmelden`, async () => {
        const landingPage: LandingViewPage = await personManagementPage.getHeader().logout();
        await landingPage.waitForPageLoad();
        return landingPage.navigateToLogin();
      });

      personManagementPage = await test.step(`Einloggen als Landesadmin`, async () => {
        const startView: StartViewPage = await loginPage.loginNewUserWithPasswordChange(
          userInfo.username,
          userInfo.password,
        );
        await startView.waitForPageLoad();
        return startView.navigateToAdministration();
      });

      personImportPage = await personManagementPage.getMenu().navigateToPersonImport();
    });

    test(`Benutzer importieren`, async ({ page }: PlaywrightTestArgs) => {
      test.slow();

      await test.step('Schule auswählen', async () => {
        await personImportPage.selectSchule(schuleName);
      });
      await test.step('Rolle auswählen', async () => {
        await personImportPage.selectRolle(schuelerRolle);
      });
      await test.step('Datei hochladen', async () => {
        await personImportPage.uploadFile(filePath);
      });
      await test.step('Meldung zum Hochladen überprüfen', async () => {
        await personImportPage.uploadCompletedSuccessfully(klassennnamen.length);
      });
      await test.step('Import ausführen', async () => {
        await personImportPage.executeImport();
      });
      await test.step('Erfolgsmeldung überprüfen', async () => {
        await personImportPage.importCompletedSuccessfully();
      });
      const download: Download = await test.step('Importierte Daten downloaden', async () => {
        const download: Download = await personImportPage.downloadFile();
        personImportPage.verifyFileName(download);
        return download;
      });
      await test.step('Inhalt der Download-Datei überprüfen', async () => {
        await personImportPage.assertDownloadedFileContent(download, schuleName, usersToBeImported);
      });
      await test.step('Angelegte Personen in der Personenliste finden', async () => {
        const personManagementPage: PersonManagementViewPage = await new MenuBarPage(page).navigateToPersonManagement();
        await personManagementPage.filterBySchule(schuleName);
        for (const user of usersToBeImported) {
          await personManagementPage.filterByKlasse(user.klasse, klassennnamen.length);
          await personManagementPage.assertThatPersonExists(user.nachname);
          await personManagementPage.resetKlasseFilter();
        }
      });
    });
  });
}
