import { expect, test, type Page, type PlaywrightTestArgs } from '@playwright/test';
import { createKlasse, getOrganisationId } from '../base/api/organisationApi';
import {
  createPerson,
  createRolleAndPersonWithPersonenkontext,
  freshLoginPage,
  lockPerson,
  type UserInfo,
} from '../base/api/personApi';
import { createRolle, RollenArt } from '../base/api/rolleApi';
import { testschuleName } from '../base/organisation';
import { adressbuch, email, itslearning, kalender, schulportaladmin } from '../base/sp';
import { DEV, STAGE_SMOKE, STAGE } from '../base/tags';
import { generateKlassenname, generateRolleName } from '../base/utils/generateTestdata';
import { LandingViewPage } from '../pages/LandingView.page';
import { LoginViewPage } from '../pages/LoginView.page';
import { StartViewPage } from '../pages/StartView.page';
import { HeaderPage } from '../pages/components/Header.page';
import { loginAndNavigateToAdministration } from '../base/testHelperUtils';
import { RollenSystemRechtEnum } from '../base/api/generated';

const ADMIN: string = process.env.USER!;
const PASSWORD: string = process.env.PW!;

test.describe(`Testfälle für den Login: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let loginPage: LoginViewPage;
  let header: HeaderPage;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    loginPage = await freshLoginPage(page);
    header = new HeaderPage(page);
  });

  test('Fehlgeschlagener Login mit falschen Daten', { tag: [STAGE_SMOKE, DEV, STAGE] }, async () => {
    await loginPage.login('anakin', 'obi-wan');
    await expect(loginPage.loginFailedWithWrongCredentials()).resolves.toBeUndefined();
  });

  test('Fehlgeschlagener Login mit gesperrtem Benutzer', { tag: [STAGE, DEV] }, async ({ page }: { page: Page }) => {
    await loginAndNavigateToAdministration(page);

    /* create locked user */
    const testSchuleId: string = await getOrganisationId(page, testschuleName);
    const rolleName: string = generateRolleName();
    const rolleId: string = await createRolle(page, RollenArt.Lehr, testSchuleId, rolleName);
    const userinfo: UserInfo = await createPerson(page, { organisationId: testSchuleId, rolleId });
    await lockPerson(page, userinfo.personId, testSchuleId);

    await header.logout();
    loginPage = await freshLoginPage(page);
    await loginPage.login(userinfo.username, userinfo.password);
    await expect(loginPage.loginFailedWithLockedUser()).resolves.toBeUndefined();
  });
});

test.describe('Stage-Smoke: Rollenbasierte Zugänge', () => {
  test(
    'Stage-Smoke: Lehrer kann sich anmelden, sieht die Kacheln und kann sich abmelden',
    { tag: [STAGE_SMOKE] },
    async ({ page }: PlaywrightTestArgs) => {
      const startPage: StartViewPage = await test.step('Lehrer anlegen und anmelden', async () => {
        await loginAndNavigateToAdministration(page);
        const user: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: RollenArt.Lehr,
          serviceProviderNames: [adressbuch, email, kalender],
        });
        const landingViewPage: LandingViewPage = await new HeaderPage(page).logout();
        const loginPage: LoginViewPage = await landingViewPage.navigateToLogin();
        return loginPage.loginNewUserWithPasswordChange(user.username, user.password);
      });

      await test.step('Kacheln prüfen', async () => {
        await startPage.assertServiceProvidersAreVisible([adressbuch, email, kalender]);
      });

      await test.step('Abmelden', async () => {
        await new HeaderPage(page).logout();
      });
    },
  );

  test(
    'Stage-Smoke: Landesadmin kann sich anmelden und zum Administrationsbereich und sich abmelden',
    { tag: [STAGE_SMOKE] },
    async ({ page }: PlaywrightTestArgs) => {
      const startPage: StartViewPage = await test.step('Als Landesadmin anmelden', async () => {
        const loginPage: LoginViewPage = await freshLoginPage(page);
        return loginPage.login(ADMIN, PASSWORD);
      });

      await test.step('Startseite und Administration prüfen', async () => {
        await startPage.waitForPageLoad();
        await startPage.assertServiceProvidersAreVisible([schulportaladmin]);
        await startPage.navigateToAdministration();
      });

      await test.step('Abmelden', async () => {
        await new HeaderPage(page).logout();
      });
    },
  );

  test(
    'Stage-Smoke: Schuladmin kann sich anmelden und zur Schulportal-Administration und sich abmelden',
    { tag: [STAGE_SMOKE] },
    async ({ page }: PlaywrightTestArgs) => {
      const startPage: StartViewPage = await test.step('Schuladmin anlegen und anmelden', async () => {
        await loginAndNavigateToAdministration(page);
        const user: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: RollenArt.Leit,
          serviceProviderNames: [schulportaladmin],
          systemrechte: new Set([RollenSystemRechtEnum.PersonenVerwalten, RollenSystemRechtEnum.KlassenVerwalten]),
        });
        const landingViewPage: LandingViewPage = await new HeaderPage(page).logout();
        const loginPage: LoginViewPage = await landingViewPage.navigateToLogin();
        return loginPage.loginNewUserWithPasswordChange(user.username, user.password);
      });

      await test.step('Startseite und Administration prüfen', async () => {
        await startPage.assertServiceProvidersAreVisible([schulportaladmin]);
        await startPage.navigateToAdministration();
      });

      await test.step('Abmelden', async () => {
        await new HeaderPage(page).logout();
      });
    },
  );

  test(
    'Stage-Smoke: Schüler kann sich anmelden, itslearning öffnen und sich abmelden',
    { tag: [STAGE_SMOKE] },
    async ({ page }: PlaywrightTestArgs) => {
      const startPage: StartViewPage = await test.step('Schüler anlegen und anmelden', async () => {
        await loginAndNavigateToAdministration(page);
        const schuleId: string = await getOrganisationId(page, testschuleName);
        const klasseId: string = await createKlasse(page, schuleId, generateKlassenname());
        const user: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
          organisationName: testschuleName,
          rollenArt: RollenArt.Lern,
          serviceProviderNames: [itslearning],
          klasseId,
        });
        const landingViewPage: LandingViewPage = await new HeaderPage(page).logout();
        const loginPage: LoginViewPage = await landingViewPage.navigateToLogin();
        return loginPage.loginNewUserWithPasswordChange(user.username, user.password);
      });

      await test.step('itslearning-Kachel prüfen und öffnen', async () => {
        await startPage.assertServiceProvidersAreVisible([itslearning]);
        await startPage.assertServiceProviderOpensInNewTab(itslearning);
      });

      await test.step('Abmelden', async () => {
        await new HeaderPage(page).logout();
      });
    },
  );
});
