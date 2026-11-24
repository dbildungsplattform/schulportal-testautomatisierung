import { Page, Route } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
  RollenSystemRechtEnum,
  ServiceProviderKategorie,
} from '../../base/api/generated';
import { getOrganisationId } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { RollenArt } from '../../base/api/rolleApi';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base, TestSchule } from '../../base/fixtures';
import { landSH } from '../../base/organisation';
import { schulportaladmin } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { switchToNewUserAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateAngebotname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderDetailsBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsBySchuleView.page';
import { ServiceProviderDetailsViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsView.page';
import { ServiceProviderEditViewPage } from '../../pages/admin/service-provider/ServiceProviderEditView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';
import { ServiceProviderManagementViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementView.page';

const URL_MIT_QUERY_STRING: string = 'https://meine-test-url.de?q=test';
const FEHLERHAFTE_URL: string = 'kein-gueltiges-url-format';

interface SchulspezifischesAngebotFixture {
  managementPage: ServiceProviderManagementBySchuleViewPage;
  schule: TestSchule;
  angebotName: string;
}

interface DuplikatFixture extends SchulspezifischesAngebotFixture {
  zweitesAngebotName: string;
}

interface GlobalAngebotFixture {
  managementPage: ServiceProviderManagementViewPage;
  angebotId: string;
  angebotName: string;
}

async function createSchulspezifischesAngebot(page: Page, schuleId: string, angebotName: string): Promise<string> {
  return createServiceProvider(page, {
    organisationId: schuleId,
    name: angebotName,
    url: page.url(),
    kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
    requires2fa: false,
    merkmale: [
      CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
      CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
    ],
  });
}

async function createSchuladminEingeschraenktVerwalten(page: Page, schuleName: string): Promise<UserInfo> {
  return createRolleAndPersonWithPersonenkontext(page, {
    organisationName: schuleName,
    rollenArt: RollenArt.Leit,
    systemrechte: new Set([
      RollenSystemRechtEnum.RollenErweitern,
      RollenSystemRechtEnum.AngeboteEingeschraenktVerwalten,
      RollenSystemRechtEnum.PersonenVerwalten,
    ]),
    serviceProviderNames: [schulportaladmin],
  });
}

async function loginAndNavigateToAngebotManagementSchulspezifisch(
  page: Page,
  user: UserInfo,
): Promise<ServiceProviderManagementBySchuleViewPage> {
  const personManagementViewPage: PersonManagementViewPage = await switchToNewUserAndNavigateToAdministration(
    page,
    user,
  );
  return personManagementViewPage.getMenu().navigateToAngebotManagementSchulspezifisch();
}

const test = base.extend<{
  asSchuladminEingeschraenktVerwalten: SchulspezifischesAngebotFixture;
  asSchuladminMitZweitemAngebot: DuplikatFixture;
  asLandesadminSchulspezifisch: SchulspezifischesAngebotFixture;
  asLandesadminGlobal: GlobalAngebotFixture;
}>({
  asSchuladminEingeschraenktVerwalten: async ({ page, testSchule }, use) => {
    const angebotName: string = generateAngebotname();
    await createSchulspezifischesAngebot(page, testSchule.id, angebotName);
    const user: UserInfo = await createSchuladminEingeschraenktVerwalten(page, testSchule.name);
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAndNavigateToAngebotManagementSchulspezifisch(page, user);
    await use({ managementPage, schule: testSchule, angebotName });
  },

  asSchuladminMitZweitemAngebot: async ({ page, testSchule }, use) => {
    const angebotName: string = generateAngebotname();
    const zweitesAngebotName: string = generateAngebotname();
    await createSchulspezifischesAngebot(page, testSchule.id, angebotName);
    await createSchulspezifischesAngebot(page, testSchule.id, zweitesAngebotName);
    const user: UserInfo = await createSchuladminEingeschraenktVerwalten(page, testSchule.name);
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAndNavigateToAngebotManagementSchulspezifisch(page, user);
    await use({ managementPage, schule: testSchule, angebotName, zweitesAngebotName });
  },

  asLandesadminSchulspezifisch: async ({ page, asLandesadmin, testSchule }, use) => {
    const angebotName: string = generateAngebotname();
    await createSchulspezifischesAngebot(page, testSchule.id, angebotName);
    const managementPage: ServiceProviderManagementBySchuleViewPage = await asLandesadmin.personManagementViewPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();
    await managementPage.filterBySchule(testSchule.name);
    await use({ managementPage, schule: testSchule, angebotName });
  },

  asLandesadminGlobal: async ({ page, asLandesadmin }, use) => {
    const organisationId: string = await getOrganisationId(page, landSH);
    const angebotName: string = generateAngebotname();
    const angebotId: string = await createServiceProvider(page, {
      organisationId,
      name: angebotName,
      url: page.url(),
      kategorie: CreateServiceProviderBodyParamsKategorieEnum.Verwaltung,
      requires2fa: false,
      merkmale: [
        CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
        CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
      ],
    });
    const managementPage: ServiceProviderManagementViewPage = await asLandesadmin.personManagementViewPage
      .getMenu()
      .navigateToAngebotManagement();
    await use({ managementPage, angebotId, angebotName });
  },
});

test.describe('Angebot bearbeiten', () => {
  test(
    'SPSH-3590: Angebotsdaten bearbeiten ist deaktiviert, während erweiterte Rollen an der Schule bearbeitet werden',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const detailsPage: ServiceProviderDetailsBySchuleViewPage = await test.step('Angebot öffnen', async () => {
        return managementPage.openServiceProviderDetails(angebotName);
      });

      await test.step('Erweiterte Rollen an der Schule bearbeiten', async () => {
        await detailsPage.openRollenerweiterungDialog();
      });

      await test.step('Bearbeiten der Angebotsdaten ist deaktiviert', async () => {
        await detailsPage.assertServiceProviderBearbeitenDisabled();
      });
    },
  );

  test(
    'SPSH-3578: Als Schuladmin mit einer Schule ein Angebot bearbeiten',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, schule, angebotName } = asSchuladminEingeschraenktVerwalten;
      const neuerName: string = generateAngebotname();

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('"Bereitgestellt von" ist vorausgewählt und nicht änderbar', async () => {
        await editPage.assertOrganisationPreselectedAndReadonly(schule.name);
        await editPage.assertNameAndUrlVisible();
      });

      await test.step('Name und URL ändern und speichern', async () => {
        await editPage.enterName(neuerName);
        await editPage.enterUrl('https://org1.de');
        await editPage.clickSave();
        await editPage.assertSuccessMessage(neuerName);
      });
    },
  );

  test(
    'SPSH-3579: Als Landesadmin die Kategorie eines Angebots bearbeiten',
    { tag: [DEV, STAGE] },
    async ({ asLandesadminSchulspezifisch }) => {
      const { managementPage, schule, angebotName } = asLandesadminSchulspezifisch;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderByName(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Kategorie ist bearbeitbar', async () => {
        await editPage.assertKategorieEditable();
      });

      await test.step('Kategorie ändern und speichern', async () => {
        await editPage.selectKategorie(ServiceProviderKategorie.Unterricht);
        await editPage.clickSave();
        await editPage.assertSuccessMessage(angebotName);
      });

      await test.step('Neue Kategorie wird in der Angebotsübersicht angezeigt', async () => {
        const listPage: ServiceProviderManagementBySchuleViewPage =
          await editPage.navigateFromSuccessToSchulspezifischeAngeboteList();
        await listPage.assertServiceProviderRow(angebotName, 'Unterricht', schule.name);
      });
    },
  );

  test(
    'SPSH-3580: Als Landesadmin ein Angebot aus der globalen Angebotsliste bearbeiten',
    { tag: [DEV, STAGE] },
    async ({ asLandesadminGlobal }) => {
      const { managementPage, angebotId, angebotName } = asLandesadminGlobal;
      const neuerName: string = generateAngebotname();

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        await managementPage.searchByName(angebotName);
        const detailsPage: ServiceProviderDetailsViewPage =
          await managementPage.openServiceProviderDetailsById(angebotId);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Name ändern und speichern', async () => {
        await editPage.enterName(neuerName);
        await editPage.clickSave();
        await editPage.assertSuccessMessage(neuerName);
      });
    },
  );

  test(
    'SPSH-3581: URL mit Query-String testen',
    { tag: [DEV, STAGE] },
    async ({ page, asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('URL testen öffnet neuen Tab mit Query-String', async () => {
        // The host does not exist, so the request is stubbed to let the new tab load.
        await page
          .context()
          .route(/^https:\/\/meine-test-url\.de\//, (route: Route): Promise<void> => route.fulfill({ body: '' }));
        await editPage.enterUrl(URL_MIT_QUERY_STRING);
        const newTab: Page = await editPage.clickTestUrl();
        await editPage.assertTabUrl(newTab, URL_MIT_QUERY_STRING);
      });
    },
  );

  test(
    'SPSH-3582: Angebot mit fehlerhaftem URL-Format speichern',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Fehlerhafte URL eingeben und speichern', async () => {
        await editPage.enterUrl(FEHLERHAFTE_URL);
        await editPage.clickSave();
        await editPage.assertSuccessMessage(angebotName);
        await editPage.assertSuccessUrl(`https://${FEHLERHAFTE_URL}`);
      });
    },
  );

  test(
    'SPSH-3583: Bearbeitung mit ungespeicherten Änderungen abbrechen',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;
      const neuerName: string = generateAngebotname();

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Name ändern und abbrechen', async () => {
        await editPage.enterName(neuerName);
        await editPage.clickCancel();
        await editPage.assertUnsavedChangesDialogVisible();
      });

      await test.step('Änderungen verwerfen', async () => {
        const listPage: ServiceProviderManagementBySchuleViewPage =
          await editPage.confirmUnsavedChangesAndNavigateToSchulspezifischeAngeboteList();
        await listPage.assertServiceProviderPresent(angebotName);
        await listPage.assertServiceProviderAbsent(neuerName);
      });
    },
  );

  test(
    'SPSH-3584: Seite mit ungespeicherten Änderungen verlassen',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Name ändern und zur Personenverwaltung navigieren', async () => {
        await editPage.enterName(generateAngebotname());
        await editPage.clickPersonManagementMenuItem();
        await editPage.assertUnsavedChangesDialogVisible();
      });
    },
  );

  test(
    'SPSH-3585: Pflichtfelder Name und URL prüfen',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Leerer Name', async () => {
        await editPage.enterName('');
        await editPage.assertNameRequiredHint();
        await editPage.assertSaveDisabled();
      });

      await test.step('Leere URL', async () => {
        await editPage.enterName('TestAngebot');
        await editPage.enterUrl('');
        await editPage.assertUrlRequiredHint();
        await editPage.assertSaveDisabled();
      });

      await test.step('Gültige URL', async () => {
        await editPage.enterUrl('https://beispiel.de');
        await editPage.assertSaveEnabled();
      });
    },
  );

  test(
    'SPSH-3586: Angebotsname wird an der Schule bereits verwendet',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminMitZweitemAngebot }) => {
      const { managementPage, angebotName, zweitesAngebotName } = asSchuladminMitZweitemAngebot;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderDetails(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Vorhandenen Namen eingeben und speichern', async () => {
        await editPage.enterName(zweitesAngebotName);
        await editPage.clickSave();
        await editPage.assertDuplicateNameError();
      });
    },
  );

  test(
    'SPSH-3589: Als Landesadmin sind 2FA und Rollenzuweisung nicht bearbeitbar',
    { tag: [DEV, STAGE] },
    async ({ asLandesadminSchulspezifisch }) => {
      const { managementPage, angebotName } = asLandesadminSchulspezifisch;

      const editPage: ServiceProviderEditViewPage = await test.step('Bearbeitung öffnen', async () => {
        const detailsPage: ServiceProviderDetailsBySchuleViewPage =
          await managementPage.openServiceProviderByName(angebotName);
        return detailsPage.clickServiceProviderBearbeiten();
      });

      await test.step('Feldzustände prüfen', async () => {
        await editPage.assertRollenZuweisbarAndZweiFaktorDisabled();
        await editPage.assertKategorieEditable();
      });
    },
  );
});
