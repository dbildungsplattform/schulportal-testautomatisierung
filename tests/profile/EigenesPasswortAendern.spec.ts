import { PlaywrightTestArgs, test } from '@playwright/test';

import { createKlasse, getOrganisationId } from '../../base/api/organisationApi';
import { createPerson, createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { createRolle, RollenArt, RollenMerkmal } from '../../base/api/rolleApi';
import { getServiceProviderId } from '../../base/api/serviceProviderApi';
import { testschuleName } from '../../base/organisation';
import { typeLehrer } from '../../base/rollentypen';
import { email, itslearning } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateKlassenname,
  generateKopersNr,
  generateNachname,
  generateRolleName,
  generateVorname,
} from '../../base/utils/generateTestdata';
import { HeaderPage } from '../../pages/components/Header.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { ProfileViewPage } from '../../pages/ProfileView.page';
import { StartViewPage } from '../../pages/StartView.page';

const PW: string | undefined = process.env.PW;
const ADMIN: string | undefined = process.env.USER;

// This variable must be set to false in the testcase when the logged in user is changed
let currentUserIsLandesadministrator: boolean = true;

test.describe(`Testfälle für das eigene Profil anzeigen: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Login`, async () => {
      await loginAndNavigateToAdministration(page);
    });
  });

  test.afterEach(async ({ page }: PlaywrightTestArgs) => {
    const header: HeaderPage = new HeaderPage(page);
    const landing: LandingViewPage = new LandingViewPage(page);
    const login: LoginViewPage = new LoginViewPage(page);
    const startseite: StartViewPage = new StartViewPage(page);

    // Always: Close open dialogs if present
    await test.step('Offene Dialoge schließen', async () => {
      try {
        await page.keyboard.press('Escape');
      } catch {
        // ignore if no dialog open
      }
    });

    // If not logged in as Landesadministrator, reset to admin session
    if (!currentUserIsLandesadministrator) {
      await test.step('Zurück zum Admin wechseln', async () => {
        await header.logout();
        await landing.navigateToLogin();
        await login.login(ADMIN!, PW!);
        await startseite.assertServiceProvidersAreLoaded();
      });
    }
    // Final cleanup: ensure logged out (safety net)
    await test.step('Endgültig abmelden', async () => {
      try {
        await header.logout();
      } catch {
        // ignore if already logged out
      }
    });
  });

  test(
    'Im Profil das eigene Passwort ändern als Lehrer und Schüler (Schüler meldet sich anschließend mit dem neuen PW an)',
    { tag: [STAGE, DEV] },
    async ({ page }: PlaywrightTestArgs) => {
      const header: HeaderPage = new HeaderPage(page);
      const loginView: LoginViewPage = new LoginViewPage(page);
      let userInfoLehrer: UserInfo;
      let userInfoSchueler: UserInfo;
      let newPassword: string = '';

      await test.step(`Lehrer und Schüler via api anlegen`, async () => {
        userInfoLehrer = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: typeLehrer,
          rollenMerkmalNamen: new Set<RollenMerkmal>([RollenMerkmal.KopersPflicht]),
          serviceProviderNames: [email],
          koPersNr: generateKopersNr(),
        });

        const schuleId: string = await getOrganisationId(page, testschuleName);
        const klasseId: string = await createKlasse(page, schuleId, generateKlassenname());
        const idSPs: string[] = [await getServiceProviderId(page, itslearning, schuleId, RollenArt.Lern)];
        const rolleId: string = await createRolle(
          page,
          RollenArt.Lern,
          schuleId,
          generateRolleName(),
          undefined,
          undefined,
          new Set(idSPs),
        );

        userInfoSchueler = await createPerson(page, {
          organisationId: schuleId,
          rolleId,
          familienname: generateNachname(),
          vorname: generateVorname(),
          klasseId,
        });
      });

      await test.step(`Mit dem Lehrer am Portal anmelden`, async () => {
        await header.logout();
        await header.navigateToLogin();
        await loginView.login(userInfoLehrer.username, userInfoLehrer.password);
        currentUserIsLandesadministrator = false;
        userInfoLehrer.password = await loginView.updatePassword();
      });

      const profileView: ProfileViewPage = await header.navigateToProfile();

      await test.step('Passwortänderung Lehrer durchführen', async () => {
        await profileView.changePassword(userInfoLehrer.username, userInfoLehrer.password);
      });

      await test.step(`Mit dem Schüler am Portal anmelden`, async () => {
        await header.logout();
        await header.navigateToLogin();
        await loginView.login(userInfoSchueler.username, userInfoSchueler.password);
        userInfoSchueler.password = await loginView.updatePassword();
      });

      await test.step(`Passwortänderung Schüler durchführen`, async () => {
        await header.navigateToProfile();
        newPassword = await profileView.changePassword(userInfoSchueler.username, userInfoSchueler.password);
      });

      await test.step(`Schüler meldet sich mit dem neuen Passwort am Portal an`, async () => {
        await header.logout();
        await header.navigateToLogin();
        const startView: StartViewPage = await loginView.login(userInfoSchueler.username, newPassword);
        await startView.assertServiceProvidersAreVisible([itslearning]);
      });
    },
  );

  test(
    'Das eigene Profil öffnen als Lehrer, Passwort-Ändern öffnen (Passwortänderung nicht durchführen), und Status des Benutzernamenfelds prüfen',
    { tag: [STAGE, DEV] },
    async ({ page }: PlaywrightTestArgs) => {
      const header: HeaderPage = new HeaderPage(page);
      const login: LoginViewPage = new LoginViewPage(page);
      const profileView: ProfileViewPage = new ProfileViewPage(page);

      const organisation: string = testschuleName;
      const rollenart: RollenArt = typeLehrer;
      const rollenMerkmalNamen = new Set<RollenMerkmal>([RollenMerkmal.KopersPflicht]);
      let username: string = '';
      const kopersnummer: string = generateKopersNr();

      await test.step('Lehrer via API anlegen und mit diesem anmelden', async () => {
        const userInfo: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: organisation,
          rollenArt: rollenart,
          rollenMerkmalNamen,
          serviceProviderNames: [itslearning],
          koPersNr: kopersnummer,
        });

        username = userInfo.username;

        await header.logout();
        await header.navigateToLogin();
        await login.login(userInfo.username, userInfo.password);
        await login.updatePassword();

        currentUserIsLandesadministrator = false;
      });

      await test.step('Profil öffnen', async () => {
        await header.navigateToProfile();
        await profileView.waitForPageLoad();
      });

      await test.step('Passwort ändern öffnen', async () => {
        await profileView.assertPasswordCard();
        await profileView.openChangePasswordDialog();
      });

      await test.step('Status des Benutzernamenfelds prüfen', async () => {
        await profileView.assertPasswordDialogUsernamePrompt(username);
        await profileView.navigateBackToProfile();
        await profileView.assertPasswordCardVisible();
      });
    },
  );
});
