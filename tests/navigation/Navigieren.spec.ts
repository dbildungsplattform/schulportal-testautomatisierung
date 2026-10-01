import test, { Page } from '@playwright/test';
import { UserInfo } from '../../base/api/personApi';
import { deletePersonenBySearchStrings, deleteRolleById } from '../../base/testHelperDeleteTestdata';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { RollenSystemRechtEnum } from '../../base/api/generated/models/RollenSystemRechtEnum';
import { ROLLEN_CASES, RolleCase } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { MenuBarPage } from '../../pages/components/MenuBar.page';
import { HeaderPage } from '../../pages/components/Header.page';
import { prepareAndLoginUserWithPermissions } from '../helpers/prepareAndLoginUserWithPermissions';
import { MENU_TEST_CASES } from './menu.test-cases';

ROLLEN_CASES.forEach((rolle: RolleCase) => {
  test.describe(`MenuBar – ${rolle.name}`, () => {
    let userInfo: UserInfo | undefined;

    test.beforeEach(async ({ page }: { page: Page }) => {
      await loginAndNavigateToAdministration(page);
      userInfo = await prepareAndLoginUserWithPermissions(page, rolle);
    });

    test.afterEach(async ({ page }: { page: Page }) => {
      const header: HeaderPage = new HeaderPage(page);

      await test.step('Als Testnutzer abmelden', async () => {
        try {
          await header.logout();
        } catch {
          // ignore — beforeEach may have failed before login
        }
      });

      await test.step('Als Admin anmelden und Testdaten löschen', async () => {
        if (!userInfo) {
          return;
        }
        await loginAndNavigateToAdministration(page);
        await deletePersonenBySearchStrings(page, [userInfo.username]);
        await deleteRolleById([userInfo.rolleId], page);
      });

      await test.step('Abmelden', async () => {
        await header.logout();
      });
    });

    test('Sichtbarkeit und Navigation der Menueeintraege', { tag: [DEV, STAGE] }, async ({ page }: { page: Page }) => {
      const menu: MenuBarPage = new MenuBarPage(page);

      for (const item of MENU_TEST_CASES) {
        await test.step(`${item.name}`, async () => {
          const previousUrl: string = page.url();
          const locator = page.getByTestId(item.testId);
          const shouldBeVisible: boolean = item.requiredPermissions.every((p: RollenSystemRechtEnum) =>
            rolle.permissions.includes(p),
          );

          await menu.assertMenuItemVisibility(locator, shouldBeVisible);

          if (!shouldBeVisible) {
            return;
          }

          await menu.navigateToMenuItem(item.navigate);
          await menu.assertCurrentRoute(item.route);

          // Restore admin page if navigation left the admin area (e.g. back-to-start link)
          if (!page.url().includes('/admin')) {
            await page.goto(previousUrl);
            await page.waitForLoadState();
          }
        });
      }
    });
  });
});
