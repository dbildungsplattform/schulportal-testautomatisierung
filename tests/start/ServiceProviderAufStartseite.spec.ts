import test, { PlaywrightTestArgs } from '@playwright/test';

import { OrganisationResponse, RollenArt } from '../../base/api/generated';
import { createKlasse, createOrganisation, getOrganisationId, getOrganisations } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { landSH, oeffentlichLandSH } from '../../base/organisation';
import {
  adressbuch,
  anleitungen,
  email,
  firmenfitness,
  helpdeskKontaktieren,
  itslearning,
  kalender,
  opSH,
  psychosozialesBeratungsangebot,
  schoolSH,
  schulportaladmin,
  schulrechtAZ,
  webUntis,
} from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateKlassenname, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { LandingViewPage } from '../../pages/LandingView.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { testFixtures } from './ServiceProviderAufStartseite.data';

const allProviderNames: string[] = [
  email,
  firmenfitness,
  itslearning,
  kalender,
  adressbuch,
  schulportaladmin,
  opSH,
  schoolSH,
  webUntis,
  anleitungen,
  helpdeskKontaktieren,
  psychosozialesBeratungsangebot,
  schulrechtAZ,
];

test.describe('ServiceProvider auf Startseite', () => {
  for (const { rollenArt, organisationsTyp, serviceProviderNames } of testFixtures) {
    test(
      `Als ${rollenArt} prüfen, dass die richtigen ServiceProvider sichtbar sind`,
      { tag: [STAGE, DEV] },
      async ({ page }: PlaywrightTestArgs) => {
        const startPage: StartViewPage = await test.step('Daten anlegen', async () => {
          const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
          let orga: OrganisationResponse;
          if (rollenArt === RollenArt.Sysadmin) {
            orga = (await getOrganisations(page, { name: landSH }))[0];
            if (!orga) throw Error('Fetching land failed');
          } else {
            const traegerId: string = await getOrganisationId(page, oeffentlichLandSH);
            orga = await createOrganisation(page, {
              name: generateSchulname(),
              typ: organisationsTyp,
              administriertVon: traegerId,
              zugehoerigZu: traegerId,
            });
          }
          const klasseId: string | null =
            rollenArt === RollenArt.Lern ? await createKlasse(page, orga.id, generateKlassenname()) : null;

          const userInfo: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
            organisationName: orga.name,
            rollenArt,
            serviceProviderNames,
            klasseId: klasseId ?? undefined,
          });
          const landingViewPage: LandingViewPage = await personManagementViewPage.getHeader().logout();
          const loginPage: LoginViewPage = await landingViewPage.navigateToLogin();
          return await loginPage.loginNewUserWithPasswordChange(userInfo.username, userInfo.password);
        });
        await test.step('Sichtbarkeit der ServiceProvider prüfen', async () => {
          await startPage.waitForPageLoad();
          await startPage.assertServiceProvidersAreVisible(serviceProviderNames);
          await startPage.assertServiceProvidersAreHidden(
            allProviderNames.filter((name: string) => !serviceProviderNames.includes(name)),
          );
        });
      },
    );
  }
});
