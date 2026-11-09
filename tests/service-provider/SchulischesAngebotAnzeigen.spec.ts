import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { createSchule } from '../../base/api/organisationApi';
import { applyRollenerweiterungChanges, createRolle, RollenArt } from '../../base/api/rolleApi';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { SchuladminAccount, test as base, TestSchule } from '../../base/fixtures';
import { DEV, STAGE } from '../../base/tags';
import { switchToNewUserAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateAngebotname, generateRolleName, generateSchulname } from '../../base/utils/generateTestdata';
import { ServiceProviderDetailsBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsBySchuleView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';

interface AngebotFixture {
  schuladmin: SchuladminAccount;
  angebotId: string;
  angebotLink: string;
  angebotName: string;
  schule: TestSchule;
}

interface CreatedRolle {
  id: string;
  name: string;
}

async function createRolleForSchule(page: Page, organisationId: string, rollenArt: RollenArt): Promise<CreatedRolle> {
  const name: string = generateRolleName();
  const id: string = await createRolle(page, rollenArt, organisationId, name);
  return { id, name };
}

async function createAngebotForSchule(
  page: Page,
  schuladmin: SchuladminAccount,
  logoId?: number,
): Promise<AngebotFixture> {
  const schule: TestSchule = schuladmin.schule;
  const angebotName: string = generateAngebotname();
  const angebotLink: string = page.url();
  const angebotId: string = await createServiceProvider(page, {
    organisationId: schule.id,
    name: angebotName,
    url: angebotLink,
    ...(logoId === undefined ? {} : { logoId }),
    kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
    requires2fa: false,
    merkmale: [
      CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
      CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerRollenverwaltung,
    ],
  });

  return { schuladmin, angebotId, angebotLink, angebotName, schule };
}

const test = base.extend<{ angebot: AngebotFixture; angebotMitCloudLogo: AngebotFixture }>({
  angebot: async ({ page, schuladminAccount }, use) => {
    await use(await createAngebotForSchule(page, schuladminAccount));
  },
  angebotMitCloudLogo: async ({ page, schuladminAccount }, use) => {
    await use(await createAngebotForSchule(page, schuladminAccount, 1));
  },
});

test.describe('SPSH-3893: Schulisches Angebot anzeigen', () => {
  test('Gesamtübersicht eines Angebots öffnen und schließen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotName, schule } = angebot;
    const personManagementPage = await switchToNewUserAndNavigateToAdministration(page, schuladmin.userinfo);
    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();

    const detailsPage: ServiceProviderDetailsBySchuleViewPage = await test.step('Gesamtübersicht öffnen', async () => {
      return managementPage.openServiceProviderDetails(angebotName);
    });

    await test.step('Gesamtübersicht prüfen', async () => {
      await detailsPage.assertServiceProviderDetailsHeadline(schule.name);
      await detailsPage.assertPageIsVisible();
      await detailsPage.assertCloseButtonVisible();
      await detailsPage.assertUrlContainsOrganisationId(schule.id);
    });

    await test.step('Gesamtübersicht schließen', async () => {
      await detailsPage.close();
      await managementPage.waitForPageLoad();
    });
  });

  test(
    'Angebotsdaten und leere Rollenerweiterungen anzeigen',
    { tag: [DEV, STAGE] },
    async ({ angebotMitCloudLogo, page }) => {
      const { schuladmin, angebotLink, angebotName, schule } = angebotMitCloudLogo;
      const personManagementPage = await switchToNewUserAndNavigateToAdministration(page, schuladmin.userinfo);
      const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
        .getMenu()
        .navigateToAngebotManagementSchulspezifisch();
      const detailsPage: ServiceProviderDetailsBySchuleViewPage =
        await managementPage.openServiceProviderDetails(angebotName);

      await test.step('Angebotsdaten prüfen', async () => {
        await detailsPage.assertServiceProviderDetails({
          name: angebotName,
          administrationsebene: schule.name,
          requires2fa: 'Nein',
          canBeAssignedToRollen: 'Ja',
          vidisAngebot: 'Nein',
          kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
          link: angebotLink,
          rollenerweiterung: 'Ja',
        });
        await detailsPage.assertCloudLogoVisible();
      });

      await test.step('Leere Rollenerweiterungen prüfen', async () => {
        await detailsPage.assertRollenerweiterungen('Keine');
      });
    },
  );

  test('Nur Rollenerweiterungen der eigenen Schule anzeigen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotId, angebotName, schule } = angebot;
    const eigeneRolle: CreatedRolle = await createRolleForSchule(page, schule.id, RollenArt.Lern);
    const fremdeSchuleId: string = await createSchule(page, generateSchulname());
    const studentRolle: CreatedRolle = await createRolleForSchule(page, fremdeSchuleId, RollenArt.Lern);

    await test.step('Rollenerweiterungen anlegen', async () => {
      await applyRollenerweiterungChanges(page, angebotId, schule.id, [eigeneRolle.id]);
      await applyRollenerweiterungChanges(page, angebotId, fremdeSchuleId, [studentRolle.id]);
    });

    const personManagementPage = await switchToNewUserAndNavigateToAdministration(page, schuladmin.userinfo);
    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();

    await test.step('Rollen der eigenen Schule prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage =
        await managementPage.openServiceProviderDetails(angebotName);
      await detailsPage.assertRollenerweiterungenContain([eigeneRolle.name]);
      await detailsPage.assertRollenerweiterungenNotContain([studentRolle.name]);
    });
  });

  test('Alle erweiterten Rollen als Chips anzeigen', { tag: [DEV, STAGE] }, async ({ angebot, page }) => {
    const { schuladmin, angebotId, angebotName, schule } = angebot;
    const rollen: CreatedRolle[] = await Promise.all([
      createRolleForSchule(page, schule.id, RollenArt.Lern),
      createRolleForSchule(page, schule.id, RollenArt.Lehr),
      createRolleForSchule(page, schule.id, RollenArt.Leit),
    ]);

    await test.step('Rollenerweiterungen anlegen', async () => {
      await applyRollenerweiterungChanges(
        page,
        angebotId,
        schule.id,
        rollen.map((rolle: CreatedRolle) => rolle.id),
      );
    });

    const personManagementPage = await switchToNewUserAndNavigateToAdministration(page, schuladmin.userinfo);
    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();

    await test.step('Alle erweiterten Rollen als Chips prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage =
        await managementPage.openServiceProviderDetails(angebotName);
      await detailsPage.assertRollenerweiterungenContain(rollen.map((rolle: CreatedRolle) => rolle.name));
    });
  });
});
