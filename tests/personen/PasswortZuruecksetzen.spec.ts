import { createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { test } from '../../base/fixtures';
import { testschuleName } from '../../base/organisation';
import { lehrkraftOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { generateKopersNr } from '../../base/utils/generateTestdata';
import { PersonDetailsViewPage } from '../../pages/admin/personen/details/PersonDetailsView.page';
import { HeaderPage } from '../../pages/components/Header.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';

test.describe('Passwort-Reset für Lehrer', () => {
  test('Passwort Reset für einen Lehrer als Landesadmin', { tag: [STAGE, DEV] }, async ({ page, asLandesadmin }) => {
    const lehrkraft: UserInfo = await createPersonWithPersonenkontext(
      page,
      testschuleName,
      lehrkraftOeffentlichRolle,
      undefined,
      undefined,
      generateKopersNr(),
    );
    const personDetails: PersonDetailsViewPage =
      await asLandesadmin.personManagementViewPage.searchAndOpenGesamtuebersicht(lehrkraft.nachname);
    const newPassword: string = await personDetails.resetPasswordAndCopyNew();

    const header: HeaderPage = new HeaderPage(page);
    const landingPage: LandingViewPage = await header.logout();
    const loginPage: LoginViewPage = await landingPage.navigateToLogin();
    const startPage: StartViewPage = await loginPage.loginNewUserWithPasswordChange(lehrkraft.username, newPassword);
    await startPage.waitForPageLoad();
  });
});
