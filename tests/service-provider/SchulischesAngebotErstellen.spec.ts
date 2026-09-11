import { test as base, expect, Page } from '@playwright/test';
import { ServiceProviderKategorie } from '../../base/api/generated';
import { createSchule } from '../../base/api/organisationApi';
import { addOrganisationenToPerson, createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { schuladminOeffentlichRolle } from '../../base/rollen';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { generateAngebotname, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderCreationSuccessPage } from '../../pages/admin/service-provider/ServiceProviderCreationSuccessPage.page';
import {
  ServiceProviderCreateParams,
  ServiceProviderCreationViewPage,
} from '../../pages/admin/service-provider/ServiceProviderCreationView.page';
import { ServiceProviderDetailsBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsBySchuleView.page';

interface BaseFixture {
  schulen: {
    id: string;
    name: string;
  }[];
  angebot: ServiceProviderCreateParams;
  serviceProviderCreationPage: ServiceProviderCreationViewPage;
}

interface SchulAdminFixture extends BaseFixture {
  userinfo: UserInfo;
}

const test = base.extend<{
  asLandesadmin: BaseFixture;
  asSchuladmin: SchulAdminFixture;
  asSchuladminWith2Schulen: SchulAdminFixture;
}>({
  asLandesadmin: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    const schulname: string = generateSchulname();
    const schulId: string = await createSchule(page, schulname);
    const serviceProviderCreationPage: ServiceProviderCreationViewPage = await personManagementViewPage
      .getMenu()
      .navigateToAngebotCreation();
    await use({
      schulen: [{ id: schulId, name: schulname }],
      angebot: {
        organisation: schulname,
        name: generateAngebotname(),
        url: page.url(),
        logoAlt: 'KI',
        kategorie: ServiceProviderKategorie.Schulisch,
        zuweisbar: true,
        nutzbarRollenerweiterung: true,
        twoFactor: false,
      },
      serviceProviderCreationPage,
    });
  },
  asSchuladmin: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schulname: string = generateSchulname();
    const schulId: string = await createSchule(page, schulname);
    const userinfo: UserInfo = await createPersonWithPersonenkontext(page, schulname, schuladminOeffentlichRolle);
    const landingPage = await logout(page);
    const loginPage = await landingPage.navigateToLogin();
    const startViewPage = await loginPage.loginNewUserWithPasswordChange(userinfo.username, userinfo.password);
    const personManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
    const serviceProviderCreationPage: ServiceProviderCreationViewPage = await personManagementViewPage
      .getMenu()
      .navigateToAngebotCreation();
    await use({
      userinfo,
      schulen: [{ id: schulId, name: schulname }],
      angebot: {
        organisation: schulname,
        name: generateAngebotname(),
        url: page.url(),
        logoAlt: 'Cloud',
        kategorie: ServiceProviderKategorie.Schulisch,
        zuweisbar: true,
        nutzbarRollenerweiterung: true,
        twoFactor: false,
      },
      serviceProviderCreationPage,
    });
  },
  asSchuladminWith2Schulen: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schulNamen: string[] = [generateSchulname(), generateSchulname()];
    const schulen: string[] = await Promise.all(schulNamen.map((name: string) => createSchule(page, name)));
    const userinfo: UserInfo = await createPersonWithPersonenkontext(page, schulNamen[0], schuladminOeffentlichRolle);
    await addOrganisationenToPerson(page, userinfo.personId, [schulen[0], schulen[1]], userinfo.rolleId);

    const landingPage = await logout(page);
    const loginPage = await landingPage.navigateToLogin();
    const startViewPage = await loginPage.loginNewUserWithPasswordChange(userinfo.username, userinfo.password);
    const personManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
    const serviceProviderCreationPage: ServiceProviderCreationViewPage = await personManagementViewPage
      .getMenu()
      .navigateToAngebotCreation();
    await use({
      userinfo,
      schulen: schulen.map((id, index) => ({ id, name: schulNamen[index] })),
      angebot: {
        organisation: schulNamen[0],
        name: generateAngebotname(),
        url: page.url(),
        logoAlt: 'Cloud',
        kategorie: ServiceProviderKategorie.Schulisch,
        zuweisbar: true,
        nutzbarRollenerweiterung: true,
        twoFactor: false,
      },
      serviceProviderCreationPage,
    });
  },
});

test.describe('Schulisches Angebot erstellen', () => {
  test('Als Landesadmin ein schulisches Angebot erstellen', async ({ asLandesadmin }) => {
    const { serviceProviderCreationPage, schulen, angebot } = asLandesadmin;
    await test.step('Schule auswählen', async () => {
      await serviceProviderCreationPage.selectOrganisation(schulen[0].name);
    });
    await test.step('Name eingeben', async () => {
      await serviceProviderCreationPage.enterName(angebot.name);
    });
    await test.step('Url eingeben', async () => {
      await serviceProviderCreationPage.enterUrl(angebot.url);
    });
    await test.step('Url testen', async () => {
      const newPage: Page = await serviceProviderCreationPage.clickTestUrl();
      expect(newPage.url()).toBe(angebot.url);
    });
    await test.step('Logo auswählen', async () => {
      await serviceProviderCreationPage.selectLogo({ logoAlt: angebot.logoAlt });
    });
    await test.step('Vorschau prüfen', async () => {
      await serviceProviderCreationPage.assertPreview(angebot.name, angebot.logoAlt);
    });
    await test.step('Standardwerte prüfen', async () => {
      await serviceProviderCreationPage.assertDefaultValuesSet();
    });
    const successPage: ServiceProviderCreationSuccessPage = await test.step('Angebot anlegen', async () => {
      return await serviceProviderCreationPage.clickSubmit();
    });
    await test.step('Erfolgsmeldung prüfen', async () => {
      await successPage.assertSuccessPage(angebot);
    });
    await test.step('Zur Rollenauswahl navigieren, angezeigte Werte und Bearbeitbarkeit prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage = await successPage.navigateToRollenauswahl();
      await detailsPage.assertServiceProviderDetailsHeadline(schulen[0].name);
      await detailsPage.assertServiceProviderDetails(angebot);
      await detailsPage.assertRollenerweiterungenDetails();
    });
  });

  test('Als Schuladmin ein schulisches Angebot erstellen', async ({ asSchuladmin }) => {
    const { serviceProviderCreationPage, schulen, angebot } = asSchuladmin;
    await test.step('Schule ist ausgewählt', async () => {
      await serviceProviderCreationPage.assertSchulePreselected(schulen[0].name);
    });
    await test.step('Name eingeben', async () => {
      await serviceProviderCreationPage.enterName(angebot.name);
    });
    await test.step('Url eingeben', async () => {
      await serviceProviderCreationPage.enterUrl(angebot.url);
    });
    await test.step('Logo auswählen', async () => {
      await serviceProviderCreationPage.selectLogo({ logoAlt: angebot.logoAlt });
    });
    await test.step('Vorschau prüfen', async () => {
      await serviceProviderCreationPage.assertPreview(angebot.name, angebot.logoAlt);
    });
    await test.step('Standardwerte prüfen', async () => {
      await serviceProviderCreationPage.assertDefaultValuesSet();
    });
    await test.step('Felder sind für Schuladmin nicht änderbar', async () => {
      await serviceProviderCreationPage.assertSchuladminFieldsDisabled();
    });
    const successPage: ServiceProviderCreationSuccessPage = await test.step('Angebot anlegen', async () => {
      return await serviceProviderCreationPage.clickSubmit();
    });
    await test.step('Erfolgsmeldung prüfen', async () => {
      await successPage.assertSuccessPage(angebot);
    });
    await test.step('Zur Rollenauswahl navigieren, angezeigte Werte und Bearbeitbarkeit prüfen', async () => {
      const detailsPage: ServiceProviderDetailsBySchuleViewPage = await successPage.navigateToRollenauswahl();
      await detailsPage.assertServiceProviderDetailsHeadline(schulen[0].name);
      await detailsPage.assertServiceProviderDetails(angebot);
      await detailsPage.assertRollenerweiterungenDetails();
    });
  });

  test('Als Schuladmin mit 2 Schulen Organisationsfilter prüfen', async ({ asSchuladminWith2Schulen }) => {
    const { serviceProviderCreationPage, schulen } = asSchuladminWith2Schulen;
    await test.step('Schulen sind auswählbar', async () => {
      await serviceProviderCreationPage.assertSelectableSchulen(schulen.map((schule) => schule.name));
    });
  });
});
