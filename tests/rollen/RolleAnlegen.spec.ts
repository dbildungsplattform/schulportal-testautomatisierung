import { PlaywrightTestArgs, test } from '@playwright/test';

import { getOrganisationId } from '../../base/api/organisationApi';
import { createPerson, freshLoginPage, UserInfo } from '../../base/api/personApi';
import { getRolleId, RollenMerkmal } from '../../base/api/rolleApi';
import { rollenMerkmalLabel } from '../../base/merkmale';
import { testschuleName } from '../../base/organisation';
import { createKlasse } from '../../base/api/organisationApi';
import { generateKlassenname } from '../../base/utils/generateTestdata';
import { rollenArtLabel } from '../../base/rollentypen';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateRolleName } from '../../base/utils/generateTestdata';
import { Alert } from '../../pages/components/Alert';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { RolleCreationSuccessPage } from '../../pages/admin/rollen/RolleCreationSuccess.page';
import { RolleCreationParams, RolleCreationViewPage } from '../../pages/admin/rollen/RolleCreationView.page';
import { RolleCreationWorkflow } from '../../pages/admin/rollen/RolleCreationWorkflow.page';
import { RolleDetailsViewPage } from '../../pages/admin/rollen/RolleDetailsView.page';
import { RolleManagementViewPage } from '../../pages/admin/rollen/RolleManagementView.page';
import { HeaderPage } from '../../pages/components/Header.page';
import { LoginViewPage } from '../../pages/LoginView.page';
import { StartViewPage } from '../../pages/StartView.page';
import { rolleCreationParams } from './RolleAnlegen.data';

async function setupAndGoToRolleCreationPage(page: PlaywrightTestArgs['page']): Promise<RolleCreationViewPage> {
  return test.step('Anmelden und zur Rollenanlage navigieren', async () => {
    const personManagementView: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    return personManagementView.menu.navigateToRolleCreation();
  });
}

async function createRolleStep(
  rolleCreationPage: RolleCreationViewPage,
  params: RolleCreationParams,
): Promise<RolleCreationSuccessPage> {
  return test.step('Rolle anlegen', async () => rolleCreationPage.createRolle(params));
}

test.describe(`Testfälle für die Rollenanlage: Umgebung: ${process.env.ENV}: URL: ${process.env.FRONTEND_URL}:`, () => {
  for (const baseRolleParams of rolleCreationParams) {
    test.describe(`Rolle der Art ${baseRolleParams.rollenart} erfolgreich anlegen`, () => {
      let rolleCreationPage: RolleCreationViewPage;

      test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
        rolleCreationPage = await setupAndGoToRolleCreationPage(page);
      });

      // SPSH-2947
      test('Rolle anlegen und Zusammenfassung prüfen', async () => {
        const params: RolleCreationParams = { ...baseRolleParams, name: generateRolleName() };
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await createRolleStep(rolleCreationPage, params);
        await test.step('Erfolgsseite prüfen', async () => {
          await rolleCreationSuccessPage.checkSuccessPage(params);
        });
      });

      test('Rolle anlegen und Gesamtübersicht prüfen', async () => {
        const params: RolleCreationParams = { ...baseRolleParams, name: generateRolleName() };
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await createRolleStep(rolleCreationPage, params);
        const rolleDetailsView: RolleDetailsViewPage = await test.step('Zur Gesamtübersicht navigieren', async () => {
          await rolleCreationSuccessPage.checkSuccessPage(params);
          const rolleManagementViewPage: RolleManagementViewPage = await rolleCreationSuccessPage.backToResultList();
          await rolleManagementViewPage.setPageSize(300);
          return await rolleManagementViewPage.openGesamtuebersicht(params.name);
        });

        await test.step('Gesamtübersicht prüfen', async () => {
          await rolleDetailsView.checkGesamtuebersicht(params);
        });
      });

      // SPSH-2950
      test('Rolle anlegen und Ergebnisliste prüfen', async () => {
        const params: RolleCreationParams = { ...baseRolleParams, name: generateRolleName() };
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await createRolleStep(rolleCreationPage, params);
        await rolleCreationSuccessPage.waitForPageLoad();
        await rolleCreationSuccessPage.checkSuccessPage(params);
        const rolleManagementViewPage: RolleManagementViewPage = await rolleCreationSuccessPage.backToResultList();
        await rolleManagementViewPage.setPageSize(300);
        await rolleManagementViewPage.checkIfRolleExists(params.name);
        await rolleManagementViewPage.checkIfRolleHasServiceProviders(params.name, params.serviceProviders);
      });

      test(`Als Nutzer mit neu angelegter ${baseRolleParams.rollenart}-Rolle anmelden`, async ({
        page,
      }: PlaywrightTestArgs) => {
        const params: RolleCreationParams = { ...baseRolleParams, name: generateRolleName() };
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await createRolleStep(rolleCreationPage, params);
        await rolleCreationSuccessPage.checkSuccessPage(params);
        const organisationId: string = await getOrganisationId(page, testschuleName);
        const rolleId: string = await getRolleId(page, params.name);
        const klasseId: string | undefined =
          params.rollenart === rollenArtLabel.LERN
            ? await createKlasse(page, organisationId, generateKlassenname())
            : undefined;
        const merkmalNames: Set<RollenMerkmal> = new Set<RollenMerkmal>(
          params.merkmale.includes(rollenMerkmalLabel.BEFRISTUNG_PFLICHT) ? [RollenMerkmal.BefristungPflicht] : [],
        );

        const user: UserInfo = await createPerson(page, {
          organisationId,
          rolleId,
          klasseId,
          merkmalNames,
        });
        const header: HeaderPage = new HeaderPage(page);
        await header.logout();
        const loginPage: LoginViewPage = await freshLoginPage(page);
        const startViewPage: StartViewPage = await loginPage.login(user.username, user.password);
        await loginPage.updatePassword();
        await startViewPage.waitForPageLoad();
        await startViewPage.assertServiceProvidersAreVisible(params.serviceProviders);
      });
    });
  }

  // SPSH-2946
  test('Mehrere Rollen nacheinander anlegen', async ({ page }: PlaywrightTestArgs) => {
    let rolleCreationPage: RolleCreationViewPage = await setupAndGoToRolleCreationPage(page);
    const [rolle1, rolle2]: RolleCreationParams[] = rolleCreationParams
      .slice(0, 2)
      .map((baseParams: RolleCreationParams) => ({
        ...baseParams,
        name: generateRolleName(),
      }));

    let rolleCreationSuccessPage: RolleCreationSuccessPage =
      await test.step(`Rolle vom Typ ${rolle1.rollenart} anlegen`, async () => {
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await rolleCreationPage.createRolle(rolle1);
        await rolleCreationSuccessPage.checkSuccessPage(rolle1);
        return rolleCreationSuccessPage;
      });

    rolleCreationPage = await test.step('Zurück zur Rollenanlage navigieren', async () => {
      return rolleCreationSuccessPage.createAnother();
    });

    await test.step(`Rolle vom Typ ${rolle2.rollenart} anlegen`, async () => {
      rolleCreationSuccessPage = await rolleCreationPage.createRolle(rolle2);
      await rolleCreationSuccessPage.checkSuccessPage(rolle2);
    });

    await test.step('Ergebnisliste prüfen', async () => {
      const rolleManagementViewPage: RolleManagementViewPage = await rolleCreationSuccessPage.backToResultList();
      await rolleManagementViewPage.setPageSize(300);
      await rolleManagementViewPage.checkIfRolleExists(rolle1.name);
      await rolleManagementViewPage.checkIfRolleExists(rolle2.name);
    });
  });

  test.describe('Fehler bei Anlage', () => {
    let rolleCreationPage: RolleCreationViewPage;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      rolleCreationPage = await setupAndGoToRolleCreationPage(page);
    });

    test('Rolle doppelt anlegen', async () => {
      const rolleCreationSuccessPage: RolleCreationSuccessPage = await test.step('Rolle anlegen', async () => {
        const rolleCreationSuccessPage: RolleCreationSuccessPage = await rolleCreationPage.createRolle(
          rolleCreationParams[0],
        );
        return rolleCreationSuccessPage;
      });
      await test.step('Erneut zur Rollenanlage navigieren', async () => {
        rolleCreationPage = await rolleCreationSuccessPage.createAnother();
      });

      const alert: Alert<RolleCreationViewPage> =
        await test.step('Erneut Rolle mit gleichem Namen anlegen', async () => {
          return rolleCreationPage.createRolleWithDuplicateNameError(rolleCreationParams[0]);
        });

      await test.step('Fehlermeldung prüfen', async () => {
        await alert.assertExpectedTexts();
      });
    });

    // SPSH-2951
    test('Ungültige Eingaben', async () => {
      const rolleCreationWorkflow: RolleCreationWorkflow = rolleCreationPage.startRolleCreationWorkflow();

      await rolleCreationWorkflow.selectAdministrationsebene(testschuleName);
      await rolleCreationWorkflow.selectArt(rollenArtLabel.LEIT);

      await rolleCreationWorkflow.selectName('a'.repeat(256));
      await rolleCreationWorkflow.checkMessage('name', 'Der Rollenname darf nicht länger als 200 Zeichen sein.');

      const illegalCharacters: string[] = ['!', '"', '§', '$', '%', '&', '/', '<', '>', '{', '}', '[', ']'];
      for (const char of illegalCharacters) {
        await rolleCreationWorkflow.selectName(char);
        await rolleCreationWorkflow.checkMessage('name', 'Der Rollenname darf keine ungültigen Zeichen beinhalten.');
      }
    });
  });
});
