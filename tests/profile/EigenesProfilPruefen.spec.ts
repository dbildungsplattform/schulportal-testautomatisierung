import { PlaywrightTestArgs, test } from '@playwright/test';

import { createKlasse, getOrganisationId } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { RollenArt } from '../../base/api/rolleApi';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { HeaderPage } from '../../pages/components/Header.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { ProfileViewPage } from '../../pages/ProfileView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { testData } from './EigenesProfilPruefen.data';

const PW: string | undefined = process.env.PW;
const ADMIN: string | undefined = process.env.USER;

// This variable must be set to false in the testcase when the logged in user is changed
let currentUserIsLandesadministrator: boolean = true;

test.describe(`Testfälle für das eigene Profil anzeigen: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Login als Landesadmin`, async () => {
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

  for (const { actor, personalData, zuordnungen, serviceProviders, rollenMerkmalNamen } of testData) {
    test(
      `Als ${actor} das eigene Profil öffnen und auf Vollständigkeit prüfen`,
      { tag: [STAGE, DEV] },
      async ({ page }: PlaywrightTestArgs) => {
        await test.step('Rolle und Nutzer anlegen und anmelden', async () => {
          const schuleId: string = await getOrganisationId(page, zuordnungen[0].organisationsname);
          const klasseId: string | undefined = zuordnungen[0].klassenName
            ? await createKlasse(page, schuleId, zuordnungen[0].klassenName)
            : undefined;
          const userInfo: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
            organisationName: zuordnungen[0].organisationsname,
            rollenArt: zuordnungen[0].rollenart,
            rollenMerkmalNamen,
            familienname: personalData.nachname,
            vorname: personalData.vorname,
            serviceProviderNames: serviceProviders,
            rollenName: zuordnungen[0].rollenname,
            koPersNr: personalData.kopersnummer,
            klasseId,
          });
          personalData.username = userInfo.username;

          const header: HeaderPage = new HeaderPage(page);
          await header.logout();
          const LoginViewPage: LoginViewPage = await header.navigateToLogin();
          const startViewPage: StartViewPage = await LoginViewPage.login(userInfo.username, userInfo.password);
          userInfo.password = await LoginViewPage.updatePassword();
          currentUserIsLandesadministrator = false;
          await startViewPage.assertServiceProvidersAreVisible(serviceProviders);
        });

        const profileView: ProfileViewPage = await test.step('Profil öffnen', async () => {
          const header: HeaderPage = new HeaderPage(page);
          return await header.navigateToProfile();
        });

        await test.step('Profil auf Vollständigkeit prüfen', async () => {
          await profileView.waitForPageLoad();
          await profileView.assertPersonalData(personalData);
          await profileView.assertZuordnungen(zuordnungen);
          await profileView.assertPasswordCard();
          if (personalData.rollenart === RollenArt.Lern) {
            await profileView.assertNo2FACard();
          } else {
            await profileView.assert2FACard();
          }
        });
      },
    );
  }
});
