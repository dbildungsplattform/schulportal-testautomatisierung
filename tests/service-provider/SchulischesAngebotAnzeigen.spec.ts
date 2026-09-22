import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { createSchule } from '../../base/api/organisationApi';
import { createPerson, UserInfo } from '../../base/api/personApi';
import { applyRollenerweiterungChanges, createRolle, getRolleId, RollenArt } from '../../base/api/rolleApi';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base } from '../../base/fixtures';
import { schuladminOeffentlichRolle } from '../../base/rollen';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { generateAngebotname, generateRolleName, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderDetailsBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsBySchuleView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';

interface AngebotFixture {
  schuladmin: UserInfo;
  angebotId: string;
  angebotLink: string;
  angebotName: string;
  schuleId: string;
  schuleName: string;
}

interface CreatedRolle {
  id: string;
  name: string;
}

async function loginAsSchuladminAndNavigateToAngebotManagement(
  page: Page,
  user: UserInfo,
): Promise<ServiceProviderManagementBySchuleViewPage> {
  const landingPage = await logout(page);
  const loginPage = await landingPage.navigateToLogin();
  const startViewPage = await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
  const personManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
  return personManagementViewPage.getMenu().navigateToAngebotManagementSchulspezifisch();
}

async function createRolleForSchule(page: Page, organisationId: string, rollenArt: RollenArt): Promise<CreatedRolle> {
  const name: string = generateRolleName();
  const id: string = await createRolle(page, rollenArt, organisationId, name);
  return { id, name };
}

const test = base.extend<{ angebot: AngebotFixture }>({
  angebot: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schuleName: string = generateSchulname();
    const schuleId: string = await createSchule(page, schuleName);
    const angebotName: string = generateAngebotname();
    const angebotLink: string = page.url();
    const angebotId: string = await createServiceProvider(page, {
      organisationId: schuleId,
      name: angebotName,
      url: angebotLink,
      kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
      requires2fa: false,
      merkmale: [
        CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
        CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
      ],
    });
    const schuladminRolleId: string = await getRolleId(page, schuladminOeffentlichRolle);
    const schuladmin: UserInfo = await createPerson(page, {
      organisationId: schuleId,
      rolleId: schuladminRolleId,
    });

    await use({ schuladmin, angebotId, angebotLink, angebotName, schuleId, schuleName });
  },
});

test.describe('SPSH-3893: Schulisches Angebot anzeigen', () => {
  test('Gesamtübersicht eines Angebots öffnen und schließen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotName, schuleId, schuleName } = angebot;
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotManagement(page, schuladmin);

    const detailsPage: ServiceProviderDetailsBySchuleViewPage = await test.step('Gesamtübersicht öffnen', async () => {
      return managementPage.openServiceProviderDetails(angebotName);
    });

    await test.step('Gesamtübersicht prüfen', async () => {
      await detailsPage.assertServiceProviderDetailsHeadline(schuleName);
      await detailsPage.assertPageIsVisible();
      await detailsPage.assertUrlContainsOrganisationId(schuleId);
    });

    await test.step('Gesamtübersicht schließen', async () => {
      await detailsPage.close();
      await managementPage.waitForPageLoad();
    });
  });

  test('Angebotsdaten und leere Rollenerweiterungen anzeigen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotLink, angebotName, schuleName } = angebot;
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotManagement(page, schuladmin);
    const detailsPage: ServiceProviderDetailsBySchuleViewPage =
      await managementPage.openServiceProviderDetails(angebotName);

    await test.step('Angebotsdaten prüfen', async () => {
      await detailsPage.assertServiceProviderDetails({
        name: angebotName,
        administrationsebene: schuleName,
        requires2fa: 'Nein',
        canBeAssignedToRollen: 'Ja',
        kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
        link: angebotLink,
        rollenerweiterung: 'Ja',
      });
    });

    await test.step('Leere Rollenerweiterungen prüfen', async () => {
      await detailsPage.assertRollenerweiterungen('Keine');
    });
  });

  test('Nur Rollenerweiterungen der eigenen Schule anzeigen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotId, angebotName, schuleId } = angebot;
    const eigeneRolle: CreatedRolle = await createRolleForSchule(page, schuleId, RollenArt.Lern);
    const fremdeSchuleId: string = await createSchule(page, generateSchulname());
    const studentRolle: CreatedRolle = await createRolleForSchule(page, fremdeSchuleId, RollenArt.Lern);

    await test.step('Rollenerweiterungen anlegen', async () => {
      await applyRollenerweiterungChanges(page, angebotId, schuleId, [eigeneRolle.id]);
      await applyRollenerweiterungChanges(page, angebotId, fremdeSchuleId, [studentRolle.id]);
    });

    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotManagement(page, schuladmin);

    await test.step('Rollen der eigenen Schule prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage =
        await managementPage.openServiceProviderDetails(angebotName);
      await detailsPage.assertRollenerweiterungenContain([eigeneRolle.name]);
      await detailsPage.assertRollenerweiterungenNotContain([studentRolle.name]);
    });
  });

  test('Alle erweiterten Rollen als Chips anzeigen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotId, angebotName, schuleId } = angebot;
    const rollen: CreatedRolle[] = await Promise.all([
      createRolleForSchule(page, schuleId, RollenArt.Lern),
      createRolleForSchule(page, schuleId, RollenArt.Lehr),
      createRolleForSchule(page, schuleId, RollenArt.Leit),
    ]);

    await test.step('Alle Rollenerweiterungen anlegen', async () => {
      await applyRollenerweiterungChanges(
        page,
        angebotId,
        schuleId,
        rollen.map((rolle: CreatedRolle) => rolle.id),
      );
    });

    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotManagement(page, schuladmin);

    await test.step('Alle Rollen als Chips prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage =
        await managementPage.openServiceProviderDetails(angebotName);
      await detailsPage.assertRollenerweiterungenContain(rollen.map((rolle: CreatedRolle) => rolle.name));
    });
  });
});
