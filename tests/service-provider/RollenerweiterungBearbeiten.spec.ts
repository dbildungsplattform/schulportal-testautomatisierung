import { Page } from '@playwright/test';
import { test } from '../../base/fixtures';
import { createKlasse, createSchule, getOrganisationId } from '../../base/api/organisationApi';
import {
  addSecondOrganisationToPerson,
  createPerson,
  createPersonWithPersonenkontext,
  UserInfo,
} from '../../base/api/personApi';
import {
  constructRolleApi,
  createRolle,
  RollenArt,
} from '../../base/api/rolleApi';
import { constructProviderApi, createServiceProvider, deleteServiceProvider } from '../../base/api/serviceProviderApi';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { testschuleName } from '../../base/organisation';
import { schuladminOeffentlichRolle } from '../../base/rollen';
import { DEV } from '../../base/tags';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { generateAngebotname, generateKlassenname, generateRolleName, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderDetailsBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsBySchuleView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';

interface CreatedRolle {
  id: string;
  name: string;
}

async function createRollenForRollenart(
  page: Page,
  organisationId: string,
  rollenArt: RollenArt,
  count: number,
): Promise<CreatedRolle[]> {
  const rollen: CreatedRolle[] = [];

  for (let index: number = 0; index < count; index++) {
    const rollenName: string = generateRolleName();
    const rollenId: string = await createRolle(page, rollenArt, organisationId, rollenName);
    rollen.push({ id: rollenId, name: rollenName });
  }

  return rollen;
}

test.describe('SPSH-3890: Rollenerweiterung für schulspezifisches Angebot bearbeiten', () => {
  let testschuleId: string = '';
  let angebotId: string = '';
  let angebotName: string = '';
  let usersForVisibilityCheck: UserInfo[] = [];
  let schuladminUser: UserInfo | null = null;

  let lehrRollen: CreatedRolle[] = [];
  let lernRollen: CreatedRolle[] = [];
  let leitRollen: CreatedRolle[] = [];

  async function loginAsSchuladminAndNavigateToServiceProvider(
    page: Page,
    user: UserInfo,
  ): Promise<ServiceProviderManagementBySchuleViewPage> {
    const landingPage = await logout(page);
    const loginPage = await landingPage.navigateToLogin();
    const startViewPage = await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
    const schuladminPersonManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
    return schuladminPersonManagementViewPage.getMenu().navigateToAngebotSchulspezifisch();
  }

  async function attachSecondSchuleToSchuladmin(
    page: Page,
    user: UserInfo,
    ersteSchuleId: string,
  ): Promise<void> {
    const zweiteSchuleName: string = generateSchulname();
    const zweiteSchuleId: string = await createSchule(page, zweiteSchuleName);

    await addSecondOrganisationToPerson(
      page,
      user.personId,
      ersteSchuleId,
      zweiteSchuleId,
      user.rolleId,
    );
  }

  async function getServiceProviderManagementPage(
    page: Page,
    shouldFilterBySchule: boolean,
  ): Promise<ServiceProviderManagementBySchuleViewPage> {
    if (!schuladminUser) {
      throw new Error('Missing Schuladmin test user in setup.');
    }
    const user: UserInfo = schuladminUser;

    if (shouldFilterBySchule) {
      await attachSecondSchuleToSchuladmin(page, user, testschuleId);
    }

    const managementBySchuleViewPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToServiceProvider(page, user);
    return managementBySchuleViewPage;
  }

  test.beforeEach(async ({ page }) => {
    usersForVisibilityCheck = [];
    schuladminUser = null;

    await loginAndNavigateToAdministration(page);
    testschuleId = await getOrganisationId(page, testschuleName);

    angebotName = generateAngebotname();
    angebotId = await createServiceProvider(page, {
      organisationId: testschuleId,
      name: angebotName,
      url: page.url(),
      kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
      requires2fa: false,
      merkmale: [
        CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
        CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
      ],
    });

    lehrRollen = await createRollenForRollenart(page, testschuleId, RollenArt.Lehr, 3);
    lernRollen = await createRollenForRollenart(page, testschuleId, RollenArt.Lern, 2);
    leitRollen = await createRollenForRollenart(page, testschuleId, RollenArt.Leit, 2);

    schuladminUser = await createPersonWithPersonenkontext(page, testschuleName, schuladminOeffentlichRolle);

    const lehrUser: UserInfo = await createPerson(page, {
      organisationId: testschuleId,
      rolleId: lehrRollen[2]!.id,
    });

    const lernKlasseId: string = await createKlasse(page, testschuleId, generateKlassenname());

    const lernUser: UserInfo = await createPerson(page, {
      organisationId: testschuleId,
      rolleId: lernRollen[1]!.id,
      klasseId: lernKlasseId,
    });

    usersForVisibilityCheck = [lehrUser, lernUser];

  });

  test.afterEach(async ({ page }) => {
    try {
      await logout(page);
    } catch (_error) {
      // no-op
    }

    await loginAndNavigateToAdministration(page);

    if (angebotId && testschuleId) {
      try {
        const rolleApi = constructRolleApi(page);
        const providerApi = constructProviderApi(page);
        const rollenerweiterungen = await providerApi.providerControllerFindRollenerweiterungenByServiceProviderId({
          angebotId,
          organisationIds: [testschuleId],
        });
        const rolleIds: string[] = rollenerweiterungen.items.map((rollenerweiterung) => rollenerweiterung.rolleId);

        if (rolleIds.length > 0) {
          await rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges({
            angebotId,
            organisationId: testschuleId,
            applyRollenerweiterungBodyParams: {
              addErweiterungenForRolleIds: [],
              removeErweiterungenForRolleIds: rolleIds,
            },
          });
        }
      } catch (error) {
        console.warn('[WARN] Failed to detach rollenerweiterungen before Angebot deletion:', error);
      }
    }

    // Exception to global teardown: this Angebot is tied to static testschuleName and must be deleted here.
    if (angebotId) {
      try {
        await deleteServiceProvider(page, angebotId);
      } catch (error) {
        console.warn('[WARN] Failed to delete Angebot in afterEach:', error);
      }
    }
  });

  const schuladminScenarios: { hasMultipleSchulen: boolean; bezeichnung: string }[] = [
    { hasMultipleSchulen: false, bezeichnung: 'Schuladmin mit einer Schule' },
    { hasMultipleSchulen: true, bezeichnung: 'Schuladmin mit mehreren Schulen' },
  ];

  for (const { hasMultipleSchulen, bezeichnung } of schuladminScenarios) {
    test(`SPSH-3313 Schritte 1-6 prüfen (${bezeichnung})`, { tag: [DEV] }, async ({ page }) => {
      const managementBySchuleViewPage: ServiceProviderManagementBySchuleViewPage =
        await getServiceProviderManagementPage(page, hasMultipleSchulen);
      const detailsViewPage: ServiceProviderDetailsBySchuleViewPage = hasMultipleSchulen
        ? await managementBySchuleViewPage.openServiceProviderDetailsById(angebotId, testschuleId)
        : await managementBySchuleViewPage.openServiceProviderDetails(angebotName);

      await test.step('Dialog initial prüfen', async () => {
        await detailsViewPage.openRollenerweiterungDialog();
        await detailsViewPage.assertRollenerweiterungDialogInitialState();
        await detailsViewPage.toggleInitialGroupExpansionAndAssert();
      });

      await test.step('Dialog abbrechen', async () => {
        await detailsViewPage.cancelRollenerweiterung();
        await detailsViewPage.assertRollenerweiterungBearbeitenVisible();
      });
    });

    test(`SPSH-3313 Schritte 7-15 prüfen (${bezeichnung})`, { tag: [DEV] }, async ({ page }) => {
      const managementBySchuleViewPage: ServiceProviderManagementBySchuleViewPage =
        await getServiceProviderManagementPage(page, hasMultipleSchulen);
      const detailsViewPage: ServiceProviderDetailsBySchuleViewPage = hasMultipleSchulen
        ? await managementBySchuleViewPage.openServiceProviderDetailsById(angebotId, testschuleId)
        : await managementBySchuleViewPage.openServiceProviderDetails(angebotName);

      await test.step('Gruppen auswählen und Rollen abwählen', async () => {
        await detailsViewPage.applyRollenerweiterungSelectionAndAssertions(lehrRollen, lernRollen, leitRollen);
      });

      await test.step('Rollenerweiterung speichern', async () => {
        await detailsViewPage.saveRollenerweiterungAndAssertSuccess();
        await detailsViewPage.closeRollenerweiterungSuccessDialog();
        await detailsViewPage.assertRollenerweiterungenContain([
          lehrRollen[2]!.name,
          lernRollen[1]!.name,
          leitRollen[1]!.name,
        ]);
      });

      await test.step('Sichtbarkeit für Nutzer prüfen', async () => {
        let landingPage = await logout(page);
        let loginPage = await landingPage.navigateToLogin();

        for (let index: number = 0; index < usersForVisibilityCheck.length; index++) {
          const user: UserInfo = usersForVisibilityCheck[index]!;
          const startViewPage = await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
          await startViewPage.assertServiceProvidersAreVisible([angebotName]);

          if (index < usersForVisibilityCheck.length - 1) {
            landingPage = await logout(page);
            loginPage = await landingPage.navigateToLogin();
          }
        }
      });
    });
  }
});
