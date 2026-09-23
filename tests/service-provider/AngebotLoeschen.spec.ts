import { Page } from '@playwright/test';
import {
  CreateServiceProviderBodyParamsKategorieEnum,
  CreateServiceProviderBodyParamsMerkmaleEnum,
  RollenSystemRechtEnum,
} from '../../base/api/generated';
import { createSchule, getOrganisationId } from '../../base/api/organisationApi';
import { createRolleAndPersonWithPersonenkontext, UserInfo } from '../../base/api/personApi';
import { applyRollenerweiterungChanges, createRolle, RollenArt } from '../../base/api/rolleApi';
import { createServiceProvider } from '../../base/api/serviceProviderApi';
import { test as base } from '../../base/fixtures';
import { landSH } from '../../base/organisation';
import { schulportaladmin } from '../../base/sp';
import { DEV, STAGE } from '../../base/tags';
import { loginAndNavigateToAdministration, logout } from '../../base/testHelperUtils';
import { generateAngebotname, generateRolleName, generateSchulname } from '../../base/utils/generateTestdata';
import { PersonManagementViewPage } from '../../pages/admin/personen/PersonManagementView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementBySchuleView.page';
import { ServiceProviderManagementViewPage } from '../../pages/admin/service-provider/ServiceProviderManagementView.page';

interface GlobalAngebotFixture {
  managementPage: ServiceProviderManagementViewPage;
  angebotId: string;
  angebotName: string;
}

interface SchulspezifischesAngebotFixture {
  managementPage: ServiceProviderManagementBySchuleViewPage;
  schuleId: string;
  angebotName: string;
}

interface SchuladminEingeschraenktVerwaltenFixture extends SchulspezifischesAngebotFixture {
  landesangebotName: string;
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
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInLandesweiterAngebotsverwaltung,
    ],
  });
}

// Provided at Land level, so it appears in every school's schulspezifische Angebotsliste without being deletable by a restricted Schuladmin.
async function createLandweitesAngebot(page: Page): Promise<string> {
  const organisationId: string = await getOrganisationId(page, landSH);
  const angebotName: string = generateAngebotname();
  await createServiceProvider(page, {
    organisationId,
    name: angebotName,
    url: page.url(),
    kategorie: CreateServiceProviderBodyParamsKategorieEnum.Schulisch,
    requires2fa: false,
    merkmale: [
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInSchulischerAngebotsverwaltung,
      CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInLandesweiterAngebotsverwaltung,
    ],
  });
  return angebotName;
}

async function loginAsNewUserAndNavigateToAngebotManagementSchulspezifisch(
  page: Page,
  user: UserInfo,
): Promise<ServiceProviderManagementBySchuleViewPage> {
  const landingPage = await logout(page);
  const loginPage = await landingPage.navigateToLogin();
  const startViewPage = await loginPage.loginNewUserWithPasswordChange(user.username, user.password);
  const personManagementViewPage: PersonManagementViewPage = await startViewPage.navigateToAdministration();
  return personManagementViewPage.getMenu().navigateToAngebotManagementSchulspezifisch();
}

const test = base.extend<{
  asLandesadmin: GlobalAngebotFixture;
  asSchuladminEingeschraenktVerwalten: SchuladminEingeschraenktVerwaltenFixture;
  asLandesadminSchulspezifisch: SchulspezifischesAngebotFixture;
}>({
  asLandesadmin: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
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
        CreateServiceProviderBodyParamsMerkmaleEnum.AnbietenInLandesweiterAngebotsverwaltung,
      ],
    });
    const managementPage: ServiceProviderManagementViewPage = await personManagementViewPage
      .getMenu()
      .navigateToAngebotManagement();
    await use({ managementPage, angebotId, angebotName });
  },

  asSchuladminEingeschraenktVerwalten: async ({ page }, use) => {
    await loginAndNavigateToAdministration(page);
    const schuleName: string = generateSchulname();
    const schuleId: string = await createSchule(page, schuleName);
    const angebotName: string = generateAngebotname();
    await createSchulspezifischesAngebot(page, schuleId, angebotName);
    const landesangebotName: string = await createLandweitesAngebot(page);

    const user: UserInfo = await createRolleAndPersonWithPersonenkontext(page, {
      organisationName: schuleName,
      rollenArt: RollenArt.Leit,
      systemrechte: new Set([
        RollenSystemRechtEnum.RollenErweitern,
        RollenSystemRechtEnum.AngeboteEingeschraenktVerwalten,
      ]),
      serviceProviderNames: [schulportaladmin],
    });
    const managementPage: ServiceProviderManagementBySchuleViewPage =
      await loginAsNewUserAndNavigateToAngebotManagementSchulspezifisch(page, user);
    await use({ managementPage, schuleId, angebotName, landesangebotName });
  },

  asLandesadminSchulspezifisch: async ({ page }, use) => {
    const personManagementViewPage: PersonManagementViewPage = await loginAndNavigateToAdministration(page);
    const schuleName: string = generateSchulname();
    const schuleId: string = await createSchule(page, schuleName);
    const angebotName: string = generateAngebotname();
    await createSchulspezifischesAngebot(page, schuleId, angebotName);

    const managementPage: ServiceProviderManagementBySchuleViewPage = await personManagementViewPage
      .getMenu()
      .navigateToAngebotManagementSchulspezifisch();
    await managementPage.filterBySchule(schuleName);
    await use({ managementPage, schuleId, angebotName });
  },
});

test.describe('Angebot löschen', () => {
  // SPSH-3619
  test(
    'Als Schuladmin mit dem Recht "Darf Angebote eingeschränkt verwalten" ein Angebot erfolgreich löschen',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName } = asSchuladminEingeschraenktVerwalten;

      const deleteDialog = await test.step('Löschdialog öffnen', async () => {
        return managementPage.openDeleteDialog(angebotName);
      });

      await test.step('Löschen bestätigen und Erfolg prüfen', async () => {
        await deleteDialog.confirmDelete();
        await deleteDialog.assertSuccessVisible(angebotName);
        await deleteDialog.closeSuccessDialog();
      });

      await managementPage.assertServiceProviderAbsent(angebotName);
    },
  );

  // SPSH-3619
  test(
    'Als Schuladmin mit dem Recht "Darf Angebote eingeschränkt verwalten" wird das Löschsymbol nur bei Angeboten auf Schulebene angezeigt',
    { tag: [DEV, STAGE] },
    async ({ asSchuladminEingeschraenktVerwalten }) => {
      const { managementPage, angebotName, landesangebotName } = asSchuladminEingeschraenktVerwalten;

      await test.step('Löschsymbol bei Angebot auf Schulebene ist sichtbar', async () => {
        await managementPage.assertDeleteIconVisible(angebotName);
      });

      await test.step('Löschsymbol bei Angebot auf Landesebene ist nicht sichtbar', async () => {
        await managementPage.assertDeleteIconHidden(landesangebotName);
      });
    },
  );

  // SPSH-3612
  test(
    'Als Landesadmin ein Angebot erfolgreich aus der globalen Angebotsliste löschen',
    { tag: [DEV, STAGE] },
    async ({ asLandesadmin }) => {
      const { managementPage, angebotName } = asLandesadmin;

      await test.step('Angebot suchen', async () => {
        await managementPage.searchByName(angebotName);
      });

      const deleteDialog = await test.step('Löschdialog öffnen', async () => {
        return managementPage.openDeleteDialog(angebotName);
      });

      await test.step('Löschen bestätigen und Erfolg prüfen', async () => {
        await deleteDialog.confirmDelete();
        await deleteDialog.assertSuccessVisible(angebotName);
        await deleteDialog.closeSuccessDialog();
      });

      await managementPage.assertServiceProviderAbsent(angebotName);
    },
  );

  // SPSH-3613
  test(
    'Als Landesadmin ein Angebot erfolgreich aus der schulspezifischen Angebotsliste löschen',
    { tag: [DEV, STAGE] },
    async ({ asLandesadminSchulspezifisch }) => {
      const { managementPage, angebotName } = asLandesadminSchulspezifisch;

      const deleteDialog = await test.step('Löschdialog öffnen', async () => {
        return managementPage.openDeleteDialog(angebotName);
      });

      await test.step('Löschen bestätigen und Erfolg prüfen', async () => {
        await deleteDialog.confirmDelete();
        await deleteDialog.assertSuccessVisible(angebotName);
        await deleteDialog.closeSuccessDialog();
      });

      await managementPage.assertServiceProviderAbsent(angebotName);
    },
  );

  // SPSH-3614
  test('Löschvorgang über den Abbrechen-Button abbrechen', { tag: [DEV, STAGE] }, async ({ asLandesadmin }) => {
    const { managementPage, angebotName } = asLandesadmin;

    await test.step('Angebot suchen', async () => {
      await managementPage.searchByName(angebotName);
    });

    const deleteDialog = await test.step('Löschdialog öffnen', async () => {
      return managementPage.openDeleteDialog(angebotName);
    });

    await test.step('Löschvorgang abbrechen', async () => {
      await deleteDialog.cancel();
    });

    await managementPage.assertServiceProviderPresent(angebotName);
  });

  // SPSH-3615
  test(
    'Angebot löschen schlägt fehl, da noch eine Rolle zugeordnet ist',
    { tag: [DEV, STAGE] },
    async ({ page, asLandesadmin }) => {
      const { managementPage, angebotId, angebotName } = asLandesadmin;

      await test.step('Rolle mit direkt zugeordnetem Angebot anlegen', async () => {
        const organisationId: string = await getOrganisationId(page, landSH);
        await createRolle(
          page,
          RollenArt.Leit,
          organisationId,
          generateRolleName(),
          undefined,
          undefined,
          new Set([angebotId]),
        );
      });

      await test.step('Angebot suchen', async () => {
        await managementPage.searchByName(angebotName);
      });

      const deleteDialog = await test.step('Löschdialog öffnen', async () => {
        return managementPage.openDeleteDialog(angebotName);
      });

      await test.step('Löschen versuchen und Fehlermeldung prüfen', async () => {
        await deleteDialog.confirmDelete();
        await managementPage.assertDeleteErrorAlert(
          'Fehler beim Löschen',
          `Das Angebot ${angebotName} kann nicht gelöscht werden, da es noch mindestens einer Rolle zugeordnet ist.`,
        );
      });

      await managementPage.closeErrorAlertAndReturnToList();
      await managementPage.assertServiceProviderPresent(angebotName);
    },
  );

  // SPSH-3616
  test(
    'Angebot löschen schlägt fehl, da noch schulspezifische Rollenerweiterungen existieren',
    { tag: [DEV, STAGE] },
    async ({ page, asLandesadmin }) => {
      const { managementPage, angebotId, angebotName } = asLandesadmin;

      await test.step('Schulspezifische Rollenerweiterung für das Angebot anlegen', async () => {
        const schuleName: string = generateSchulname();
        const schuleId: string = await createSchule(page, schuleName);
        const rolleId: string = await createRolle(page, RollenArt.Lehr, schuleId, generateRolleName());
        await applyRollenerweiterungChanges(page, angebotId, schuleId, [rolleId]);
      });

      await test.step('Angebot suchen', async () => {
        await managementPage.searchByName(angebotName);
      });

      const deleteDialog = await test.step('Löschdialog öffnen', async () => {
        return managementPage.openDeleteDialog(angebotName);
      });

      await test.step('Löschen versuchen und Fehlermeldung prüfen', async () => {
        await deleteDialog.confirmDelete();
        await managementPage.assertDeleteErrorAlert(
          'Fehler beim Löschen',
          `Das Angebot ${angebotName} kann nicht gelöscht werden, da noch schulpezifische Rollenerweiterungen existieren.`,
        );
      });

      await managementPage.closeErrorAlertAndReturnToList();
      await managementPage.assertServiceProviderPresent(angebotName);
    },
  );
});
