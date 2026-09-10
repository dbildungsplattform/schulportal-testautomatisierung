import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { createSchule } from '../../base/api/organisationApi';
import { addOrganisationenToPerson, createPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base } from '../../base/fixtures';
import { schuladminOeffentlichRolle } from '../../base/rollen';
import { DEV } from '../../base/tags';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { generateAngebotname, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';


interface Schule {
  id: string;
  name: string;
}

interface AngebotsverwaltungFixture {
  managementPage: ServiceProviderManagementBySchuleViewPage;
  schulen: Schule[];
  angebotName?: string;
}

async function createServiceProviderForSchule(page: Page, schuleId: string, angebotName: string): Promise<void> {
  await createServiceProvider(page, {
    organisationId: schuleId,
    name: angebotName,
    url: page.url(),
    kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
    requires2fa: false,
    merkmale: [
      CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
      CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
    ],
  });
}

async function loginAsSchuladminAndNavigateToAngebotsverwaltung(
  page: Page,
  user: UserInfo,
): Promise<ServiceProviderManagementBySchuleViewPage> {
  const landingPage = await logout(page);
  const loginPage = await landingPage.navigateToLogin();
  const startViewPage = await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
  const personManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
  return personManagementViewPage.getMenu().navigateToAngebotSchulspezifisch();
}

const test = base.extend<{
  asSchuladminOhneAngebot: AngebotsverwaltungFixture;
  asSchuladminMitAngebot: AngebotsverwaltungFixture;
  asSchuladminMit2Schulen: AngebotsverwaltungFixture;
}>({
  asSchuladminOhneAngebot: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schuleName: string = generateSchulname();
    const schuleId: string = await createSchule(page, schuleName);
    const schulen: Schule[] = [{ id: schuleId, name: schuleName }];

    const user: UserInfo = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotsverwaltung(page, user);
    await use({ managementPage, schulen });
  },

  asSchuladminMitAngebot: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schuleName: string = generateSchulname();
    const schuleId: string = await createSchule(page, schuleName);
    const angebotName: string = generateAngebotname();
    await createServiceProviderForSchule(page, schuleId, angebotName);
    const schulen: Schule[] = [{ id: schuleId, name: schuleName }];

    const user: UserInfo = await createPersonWithPersonenkontext(page, schuleName, schuladminOeffentlichRolle);
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotsverwaltung(page, user);
    await use({ managementPage, schulen, angebotName });
  },

  asSchuladminMit2Schulen: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schulNamen: string[] = [generateSchulname(), generateSchulname()];
    const schuleIds: string[] = await Promise.all(schulNamen.map((name: string) => createSchule(page, name)));
    const angebotName: string = generateAngebotname();
    await createServiceProviderForSchule(page, schuleIds[0]!, angebotName);
    const schulen: Schule[] = schuleIds.map((id: string, index: number) => ({ id, name: schulNamen[index]! }));

    const user: UserInfo = await createPersonWithPersonenkontext(page, schulNamen[0]!, schuladminOeffentlichRolle);
    await addOrganisationenToPerson(page, user.personId, schuleIds, user.rolleId);
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsSchuladminAndNavigateToAngebotsverwaltung(page, user);
    await use({ managementPage, schulen, angebotName });
  },
});

test.describe('Schulspezifische Angebote anzeigen', () => {
  test(
    'Als Schuladmin mit 1 Schule ohne zuweisbare Angebote wird ein Hinweis angezeigt',
    { tag: [DEV] },
    async ({ asSchuladminOhneAngebot }) => {
      const { managementPage } = asSchuladminOhneAngebot;
      await managementPage.assertNoServiceProvidersFound();
    },
  );

  test(
    'Als Schuladmin mit 1 Schule wird die Angebotsverwaltung für die eigene Schule angezeigt',
    { tag: [DEV] },
    async ({ asSchuladminMitAngebot }) => {
      const { managementPage, schulen, angebotName } = asSchuladminMitAngebot;
      const schuleName: string = schulen[0]!.name;

      await test.step('Überschrift, vorausgewählter Schulfilter und Tabellenstruktur prüfen', async () => {
        await managementPage.assertHeadline(schuleName);
        await managementPage.assertSchuleFilterPreselectedAndDisabled(schuleName);
        await managementPage.checkHeaders([
          'Kategorie',
          'Name',
          'Bereitgestellt von',
          'Erweiterte Rollen an der Schule',
          'Aktion',
        ]);
        await managementPage.assertPaginationVisible();
      });

      await test.step('Angebot der eigenen Schule wird korrekt angezeigt', async () => {
        await managementPage.assertServiceProviderRow(angebotName!, 'Schulische Angebote', schuleName);
      });
    },
  );

  test(
    'Als Schuladmin mit 2 Schulen muss zunächst eine Schule gefiltert werden',
    { tag: [DEV] },
    async ({ asSchuladminMit2Schulen }) => {
      const { managementPage, schulen, angebotName } = asSchuladminMit2Schulen;

      await test.step('Ohne Schulauswahl wird ein Hinweis angezeigt', async () => {
        await managementPage.assertHeadline();
        await managementPage.assertNoSchuleSelectedInFilter();
        await managementPage.assertSelectableSchulen(schulen.map((schule: Schule) => schule.name));
        await managementPage.assertChooseSchuleFirstHint();
      });

      await test.step('Nach Schulauswahl werden die zuweisbaren Angebote der Schule angezeigt', async () => {
        const schuleName: string = schulen[0]!.name;
        await managementPage.filterBySchule(schuleName);
        await managementPage.assertServiceProviderRow(angebotName!, 'Schulische Angebote', schuleName);
      });
    },
  );
});
