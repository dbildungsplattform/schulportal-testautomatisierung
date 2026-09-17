import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
} from '../../base/api/generated';
import { createSchule, getOrganisationId } from '../../base/api/organisationApi';
import { applyRollenerweiterungChanges, createRolle, RollenArt } from '../../base/api/rolleApi';
import { createServiceProvider, deleteServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base } from '../../base/fixtures';
import { testschuleName } from '../../base/organisation';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration } from '../../base/testHelperUtils';
import {
  generateAngebotname,
  generateDienststellenNr,
  generateRolleName,
  generateSchulname,
} from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderDetailsViewPage } from '../../pages/admin/service-provider/ServiceProviderDetailsView.page';

interface SchuleMitRolle {
  id: string;
  name: string;
  kennung: string;
  rolleId: string;
  rolleName: string;
}

interface AngebotDetailsFixture {
  detailsPage: ServiceProviderDetailsViewPage;
  angebotName: string;
  schulen: SchuleMitRolle[];
}

async function createAngebot(page: Page, verfuegbarFuerRollenerweiterung: boolean): Promise<{ id: string; name: string }> {
  const organisationId: string = await getOrganisationId(page, testschuleName);
  const name: string = generateAngebotname();
  const merkmale: CreateServiceProviderBodyParamsMerkmaleEnum[] = verfuegbarFuerRollenerweiterung
    ? [
        CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar,
        CreateServiceProviderBodyParamsMerkmaleEnum.VerfuegbarFuerRollenerweiterung,
      ]
    : [CreateServiceProviderBodyParamsMerkmaleEnum.NachtraeglichZuweisbar];

  const id: string = await createServiceProvider(page, {
    organisationId,
    name,
    url: page.url(),
    kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
    requires2fa: false,
    merkmale,
  });

  return { id, name };
}

async function openAngebotDetails(
  personManagementViewPage: PersonManagementViewPage,
  angebotId: string,
): Promise<ServiceProviderDetailsViewPage> {
  const managementViewPage = await personManagementViewPage.getMenu().navigateToAngebotManagement();
  return managementViewPage.openServiceProviderDetailsById(angebotId);
}

const test = base.extend<{
  angebotMitRollenerweiterungen: AngebotDetailsFixture;
  angebotOhneRollenerweiterung: AngebotDetailsFixture;
  angebotNichtVerfuegbar: AngebotDetailsFixture;
}>({
  angebotMitRollenerweiterungen: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    const { id: angebotId, name: angebotName } = await createAngebot(page, true);

    // Create schools in descending Dienststellennummer order so an unsorted list would fail the ascending-sort check.
    const kennungen: string[] = [generateDienststellenNr(), generateDienststellenNr(), generateDienststellenNr()].sort(
      (a: string, b: string) => a.localeCompare(b, 'de', { numeric: true }),
    );
    const schulen: SchuleMitRolle[] = [];
    for (const kennung of [...kennungen].reverse()) {
      const name: string = generateSchulname();
      const id: string = await createSchule(page, name, kennung);
      const rolleName: string = generateRolleName();
      const rolleId: string = await createRolle(page, RollenArt.Lehr, id, rolleName);
      await applyRollenerweiterungChanges(page, angebotId, id, [rolleId]);
      schulen.push({ id, name, kennung, rolleId, rolleName });
    }

    const detailsPage: ServiceProviderDetailsViewPage = await openAngebotDetails(personManagementViewPage, angebotId);
    await use({ detailsPage, angebotName, schulen });

    for (const schule of schulen) {
      try {
        await applyRollenerweiterungChanges(page, angebotId, schule.id, [], [schule.rolleId]);
      } catch (error) {
        console.warn('[WARN] Failed to detach rollenerweiterung during cleanup:', error);
      }
    }
    try {
      await deleteServiceProvider(page, angebotId);
    } catch (error) {
      console.warn('[WARN] Failed to delete Angebot during cleanup:', error);
    }
  },

  angebotOhneRollenerweiterung: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    const { id: angebotId, name: angebotName } = await createAngebot(page, true);

    const detailsPage: ServiceProviderDetailsViewPage = await openAngebotDetails(personManagementViewPage, angebotId);
    await use({ detailsPage, angebotName, schulen: [] });

    try {
      await deleteServiceProvider(page, angebotId);
    } catch (error) {
      console.warn('[WARN] Failed to delete Angebot during cleanup:', error);
    }
  },

  angebotNichtVerfuegbar: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    const { id: angebotId, name: angebotName } = await createAngebot(page, false);

    const detailsPage: ServiceProviderDetailsViewPage = await openAngebotDetails(personManagementViewPage, angebotId);
    await use({ detailsPage, angebotName, schulen: [] });

    try {
      await deleteServiceProvider(page, angebotId);
    } catch (error) {
      console.warn('[WARN] Failed to delete Angebot during cleanup:', error);
    }
  },
});

test.describe('Liste schulspezifischer Rollenerweiterungen am Angebot anzeigen', () => {
  test(
    'Angebot mit Rollenerweiterungen zeigt die Schulliste korrekt an',
    { tag: [DEV, STAGE] },
    async ({ angebotMitRollenerweiterungen }) => {
      const { detailsPage, schulen } = angebotMitRollenerweiterungen;

      await test.step('Gesamtübersicht des Angebots wird angezeigt', async () => {
        await detailsPage.assertGesamtuebersichtVisible();
      });

      await test.step('Überschrift "Schulspezifische Rollenerweiterungen anzeigen" ist sichtbar', async () => {
        await detailsPage.assertSectionHeadlineVisible();
      });

      await test.step('Bereich ausklappen und Tabellenstruktur prüfen', async () => {
        await detailsPage.expandRollenerweiterungenSection();
        await detailsPage.assertRollenerweiterungenTableVisible();
        await detailsPage.assertTableColumns();
        await detailsPage.assertHoverTitlesPresent();
      });

      await test.step('Alle Schulen mit Rollenerweiterungen werden angezeigt', async () => {
        for (const schule of schulen) {
          await detailsPage.assertSchoolRow(schule.kennung, schule.name, [schule.rolleName]);
        }
      });

      await test.step('Tabelle ist nach Dienststellennummer aufsteigend sortiert', async () => {
        await detailsPage.assertSortedByDienststellennummerAscending();
      });

      await test.step('Tabelle ist paginiert: initial 30, Anzahl kann erhöht werden', async () => {
        await detailsPage.assertDefaultItemsPerPageIs30();
        await detailsPage.increaseItemsPerPage(50);
      });
    },
  );

  test(
    'Angebot ohne Rollenerweiterungen zeigt eine leere Tabelle',
    { tag: [DEV, STAGE] },
    async ({ angebotOhneRollenerweiterung }) => {
      const { detailsPage } = angebotOhneRollenerweiterung;

      await test.step('Gesamtübersicht des Angebots wird angezeigt', async () => {
        await detailsPage.assertGesamtuebersichtVisible();
      });

      await test.step('Überschrift "Schulspezifische Rollenerweiterungen anzeigen" ist sichtbar', async () => {
        await detailsPage.assertSectionHeadlineVisible();
      });

      await test.step('Bereich ausklappen zeigt eine leere Tabelle', async () => {
        await detailsPage.expandRollenerweiterungenSection();
        await detailsPage.assertRollenerweiterungenTableEmpty();
      });
    },
  );

  test(
    'Nicht erweiterbares Angebot zeigt einen Hinweistext',
    { tag: [DEV, STAGE] },
    async ({ angebotNichtVerfuegbar }) => {
      const { detailsPage } = angebotNichtVerfuegbar;

      await test.step('Gesamtübersicht des Angebots wird angezeigt', async () => {
        await detailsPage.assertGesamtuebersichtVisible();
      });

      await test.step('Bereich ausklappen zeigt den Hinweistext', async () => {
        await detailsPage.expandRollenerweiterungenSection();
        await detailsPage.assertNotAvailableHint();
      });
    },
  );
});
