import { PlaywrightTestArgs, test } from '@playwright/test';

import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';

interface LockOption {
  description: string;
  until?: string;
  expectUntil?: string;
}

const lockOptions: LockOption[] = [
  {
    description: 'unbefristet sperren',
    until: undefined,
    expectUntil: undefined,
  },
  {
    description: 'befristet sperren',
    until: '31.12.2099',
    expectUntil: '31.12.2099',
  },
];

test.describe(`Testfälle für das Personen sperren: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  let userInfo: UserInfo;

  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    await test.step(`Login`, async () => {
      await loginAndNavigateToAdministration(page);
    });

    await test.step(`Daten anlegen`, async () => {
      userInfo = await createPersonWithPersonenkontext(page, testschuleName, lehrkraftOeffentlichRolle);
    });
  });

  test.afterEach(async ({ page }: PlaywrightTestArgs) => {
    const header: HeaderPage = new HeaderPage(page);
    await header.logout();
  });

  lockOptions.forEach(({ description, until, expectUntil }: LockOption) => {
    test(`Person via Gesamtübersicht ${description}`, { tag: [DEV, STAGE] }, async ({ page }: PlaywrightTestArgs) => {
      const personDetailsViewPage: PersonDetailsViewPage =
        await test.step(`Zur Gesamtübersicht navigieren`, async () => {
          const personenManagementViewPage: PersonManagementViewPage = new PersonManagementViewPage(page);
          await personenManagementViewPage.waitForPageLoad();
          return personenManagementViewPage.searchAndOpenGesamtuebersicht(userInfo.username);
        });

      await test.step(`Person sperren (${description})`, async () => {
        await personDetailsViewPage.lockPerson(until);
      });

      await test.step(`Sperrstatus verifizieren`, async () => {
        await personDetailsViewPage.checkPersonLock({
          locked: true,
          from: undefined, // Optionally add a check for the lock start date if needed
          until: expectUntil,
        });
      });
    });
  });
});
