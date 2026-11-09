import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base, TestSchule } from '../../base/fixtures';
import { DEV, STAGE } from '../../base/tags';
import { switchToNewUserAndNavigateToAdministration } from '../../base/testHelperUtils';
import { generateAngebotname } from '../../base/utils/generateTestdata';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';

interface AngebotsverwaltungFixture {
  managementPage: ServiceProviderManagementBySchuleViewPage;
  schulen: TestSchule[];
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
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
    ],
  });
}

const test = base.extend<{
  asSchuladminWithoutAngebot: AngebotsverwaltungFixture;
  asSchuladminWithAngebot: AngebotsverwaltungFixture;
  managementPageSchuladminWith2Schulen: AngebotsverwaltungFixture;
}>({
  asSchuladminWithoutAngebot: async ({ asSchuladmin }, use) => {
    const managementPage: ServiceProviderManagementBySchuleViewPage = await asSchuladmin.personManagementViewPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();
    await use({ managementPage, schulen: [asSchuladmin.schule] });
  },

  asSchuladminWithAngebot: async ({ page, schuladminAccount }, use) => {
    const angebotName: string = generateAngebotname();
    await createServiceProviderForSchule(page, schuladminAccount.schule.id, angebotName);
    const personManagementPage = await switchToNewUserAndNavigateToAdministration(page, schuladminAccount.userinfo);
    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();
    await use({ managementPage, schulen: [schuladminAccount.schule], angebotName });
  },

  managementPageSchuladminWith2Schulen: async ({ page, schuladminAccountWith2Schulen }, use) => {
    const angebotName: string = generateAngebotname();
    await createServiceProviderForSchule(page, schuladminAccountWith2Schulen.schulen[0]!.id, angebotName);
    const personManagementPage = await switchToNewUserAndNavigateToAdministration(
      page,
      schuladminAccountWith2Schulen.userinfo,
    );
    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();
    await use({
      managementPage,
      schulen: schuladminAccountWith2Schulen.schulen,
      angebotName,
    });
  },
});

test.describe('Schulspezifische Angebote anzeigen', () => {
  test(
    'Als Schuladmin mit 1 Schule ohne zuweisbare Angebote wird ein Hinweis angezeigt',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminWithoutAngebot }) => {
      const { managementPage, schulen } = asSchuladminWithoutAngebot;
      await managementPage.assertNoServiceProviderProvidedBySchule(schulen[0]!.name);
    },
  );

  test(
    'Als Schuladmin mit 1 Schule wird die Angebotsverwaltung für die eigene Schule angezeigt',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminWithAngebot }) => {
      const { managementPage, schulen, angebotName } = asSchuladminWithAngebot;
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
    { tag: [DEV, STAGE] },
    async ({ managementPageSchuladminWith2Schulen }) => {
      const { managementPage, schulen, angebotName } = managementPageSchuladminWith2Schulen;

      await test.step('Ohne Schulauswahl wird ein Hinweis angezeigt', async () => {
        await managementPage.assertHeadline();
        await managementPage.assertNoSchuleSelectedInFilter();
        await managementPage.assertSelectableSchulen(schulen.map((schule: TestSchule) => schule.name));
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
