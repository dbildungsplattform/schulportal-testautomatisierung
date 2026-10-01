import { PlaywrightTestArgs, test } from '@playwright/test';
import { RollenMerkmal } from '../../base/api/generated';
import { createSchule } from '../../base/api/organisationApi';
import { createPerson, setTimeLimitPersonenkontext, UserInfo } from '../../base/api/personApi';
import { createRolle, RollenArt } from '../../base/api/rolleApi';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateCurrentDate, generateRolleName, generateSchulname } from '../../base/utils/generateTestdata';
import { HeaderPage } from '../../pages/components/Header.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';

interface TestFixture {
  timeLimit: Date;
  expectedColor: 'orange' | 'red';
}

const testFixtures: TestFixture[] = [
  {
    timeLimit: generateCurrentDate({ days: 50, months: 0 }),
    expectedColor: 'orange',
  },
  {
    timeLimit: generateCurrentDate({ days: 12, months: 0 }),
    expectedColor: 'red',
  },
];

test.describe('Newsbox auf Startseite', () => {
  let schulName: string;
  let rollenName: string;
  let userInfo: UserInfo;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await loginAndNavigateToAdministration(page);

    schulName = generateSchulname();
    rollenName = generateRolleName();
    const rollenMerkmale = new Set<RollenMerkmal>([RollenMerkmal.BefristungPflicht]);
    const schuleId: string = await createSchule(page, schulName);
    const rolleId: string = await createRolle(page, RollenArt.Lehr, schuleId, rollenName, rollenMerkmale);
    userInfo = await createPerson(page, {
      organisationId: schuleId,
      rolleId,
      merkmalNames: rollenMerkmale,
    });
  });

  for (const { timeLimit, expectedColor } of testFixtures) {
    test(
      `News-Box ist ${expectedColor} bei befristeter Schulzuordnung`,
      { tag: [STAGE, DEV] },
      async ({ page }: PlaywrightTestArgs) => {
        const landingPage: LandingViewPage = await test.step('Setup Befristung', async () => {
          await setTimeLimitPersonenkontext(
            page,
            userInfo.personId,
            userInfo.organisationId,
            userInfo.rolleId,
            timeLimit,
          );
          const headerPage = new HeaderPage(page);
          return headerPage.logout();
        });

        const startPage: StartViewPage = await test.step('Login', async () => {
          const loginPage: LoginViewPage = await landingPage.navigateToLogin();
          const startPage: StartViewPage = await loginPage.login(userInfo.username, userInfo.password);
          await loginPage.updatePassword();
          return startPage;
        });

        await test.step('Newsbox prüfen', async () => {
          await startPage.assertNewsbox({ schulName, rollenName: rollenName, timeLimit }, expectedColor);
        });
      },
    );
  }
});
