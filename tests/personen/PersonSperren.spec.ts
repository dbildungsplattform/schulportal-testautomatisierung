import { test as baseTest } from '../../base/fixtures';

import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';

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

const test = baseTest.extend<{ lehrkraft: UserInfo }>({
  lehrkraft: async ({ page, asLandesadmin: _asLandesadmin }, use) => {
    await use(await createPersonWithPersonenkontext(page, testschuleName, lehrkraftOeffentlichRolle));
  },
});

test.describe(`Testfälle für das Personen sperren: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  lockOptions.forEach(({ description, until, expectUntil }: LockOption) => {
    test(`Person via Gesamtübersicht ${description}`, async ({ asLandesadmin, lehrkraft }) => {
      const personDetailsViewPage: PersonDetailsViewPage =
        await test.step(`Zur Gesamtübersicht navigieren`, async () => {
          const personenManagementViewPage: PersonManagementViewPage = asLandesadmin.personManagementViewPage;
          await personenManagementViewPage.waitForPageLoad();
          return personenManagementViewPage.searchAndOpenGesamtuebersicht(lehrkraft.username);
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
