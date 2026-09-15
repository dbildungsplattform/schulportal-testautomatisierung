import { expect, Locator, Page } from '@playwright/test';
import { KlasseCreationViewPage } from '../admin/organisationen/klassen/KlasseCreationView.page';
import { KlasseManagementViewPage } from '../admin/organisationen/klassen/KlasseManagementView.page';
import { SchultraegerCreationViewPage } from '../admin/organisationen/schultraeger/SchultraegerCreationView.page';
import { SchultraegerManagementViewPage } from '../admin/organisationen/schultraeger/SchultraegerManagementView.page';
import { SchuleCreationViewPage } from '../admin/organisationen/schulen/SchuleCreationView.page';
import { SchuleManagementViewPage } from '../admin/organisationen/schulen/SchuleManagementView.page';
import type { PersonCreationViewPage } from '../admin/personen/creation/PersonCreationView.page';
import type { PersonImportViewPage } from '../admin/personen/PersonImportView.page';
import type { PersonManagementViewPage } from '../admin/personen/PersonManagementView.page';
import { LandesbedienstetenSearchFormPage } from '../admin/personen/search/LandesbedienstetenSearchForm.page';
import { RolleCreationViewPage } from '../admin/rollen/RolleCreationView.page';
import { RolleManagementViewPage } from '../admin/rollen/RolleManagementView.page';
import { HinweiseCreationViewPage } from '../admin/hinweise/HinweiseCreationView.page';
import { ServiceProviderCreationViewPage } from '../admin/service-provider/ServiceProviderCreationView.page';
import { ServiceProviderManagementBySchuleViewPage } from '../admin/service-provider/ServiceProviderManagementBySchuleView.page';
import { ServiceProviderManagementViewPage } from '../admin/service-provider/ServiceProviderManagementView.page';
import type { StartViewPage } from '../StartView.page';

export class MenuBarPage {
  /* add global locators here */
  private klasseCreation: Locator = this.page.getByTestId('klasse-creation-menu-item');
  private schuleManagement: Locator = this.page.getByTestId('schule-management-menu-item');
  private rolleManagement: Locator = this.page.getByTestId('rolle-management-menu-item');

  constructor(protected readonly page: Page) {}

  /* actions */

  private async navigateTo<T>(testId: string, waitForPageLoad: Promise<T>): Promise<T> {
    await this.page.getByTestId(testId).click();
    return waitForPageLoad;
  }

  public async navigateToStartPage(): Promise<StartViewPage> {
    const { StartViewPage } = await import('../StartView.page');
    return this.navigateTo('back-to-start-link', new StartViewPage(this.page).waitForPageLoad());
  }

  public async navigateToPersonManagement(): Promise<PersonManagementViewPage> {
    const { PersonManagementViewPage } = await import('../admin/personen/PersonManagementView.page');
    return this.navigateTo('person-management-menu-item', new PersonManagementViewPage(this.page).waitForPageLoad());
  }

  public async navigateToPersonCreation(): Promise<PersonCreationViewPage> {
    const { PersonCreationViewPage } = await import('../admin/personen/creation/PersonCreationView.page');
    return this.navigateTo('person-creation-menu-item', new PersonCreationViewPage(this.page).waitForPageLoad());
  }

  public async navigateToPersonImport(): Promise<PersonImportViewPage> {
    const { PersonImportViewPage } = await import('../admin/personen/PersonImportView.page');
    return this.navigateTo('person-import-menu-item', new PersonImportViewPage(this.page).waitForPageLoad());
  }

  public async navigateToLandesbedienstetenSuchenUndHinzufuegen(): Promise<LandesbedienstetenSearchFormPage> {
    return this.navigateTo(
      'person-search-menu-item',
      new LandesbedienstetenSearchFormPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToPersonAdd(): Promise<PersonCreationViewPage> {
    const { PersonCreationMode, PersonCreationViewPage } =
      await import('../admin/personen/creation/PersonCreationView.page');
    return this.navigateTo(
      'person-add-menu-item',
      new PersonCreationViewPage(this.page, PersonCreationMode.ADD_ANOTHER_STATE_EMPLOYEE).waitForPageLoad(),
    );
  }

  public async navigateToKlasseManagement(): Promise<KlasseManagementViewPage> {
    return this.navigateTo('klasse-management-menu-item', new KlasseManagementViewPage(this.page).waitForPageLoad());
  }

  public async navigateToKlasseCreation(): Promise<KlasseCreationViewPage> {
    await this.klasseCreation.click();
    const klasseCreationViewPage: KlasseCreationViewPage = new KlasseCreationViewPage(this.page);
    await klasseCreationViewPage.waitForPageLoad();
    return klasseCreationViewPage;
  }

  public async navigateToRolleManagement(): Promise<RolleManagementViewPage> {
    await this.rolleManagement.click();
    const rolleManagementViewPage: RolleManagementViewPage = new RolleManagementViewPage(this.page);
    await rolleManagementViewPage.waitForPageLoad();
    return rolleManagementViewPage;
  }

  public async navigateToRolleCreation(): Promise<RolleCreationViewPage> {
    return this.navigateTo('rolle-creation-menu-item', new RolleCreationViewPage(this.page).waitForPageLoad());
  }

  public async navigateToSchuleManagement(): Promise<SchuleManagementViewPage> {
    await this.schuleManagement.click();
    const schuleManagementViewPage: SchuleManagementViewPage = new SchuleManagementViewPage(this.page);
    await schuleManagementViewPage.waitForPageLoad();
    return schuleManagementViewPage;
  }

  public async navigateToSchuleCreation(): Promise<SchuleCreationViewPage> {
    return this.navigateTo('schule-creation-menu-item', new SchuleCreationViewPage(this.page).waitForPageLoad());
  }

  public async navigateToSchultraegerManagement(): Promise<SchultraegerManagementViewPage> {
    return this.navigateTo(
      'schultraeger-management-menu-item',
      new SchultraegerManagementViewPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToSchultraegerCreation(): Promise<SchultraegerCreationViewPage> {
    return this.navigateTo(
      'schultraeger-creation-menu-item',
      new SchultraegerCreationViewPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToHinweiseEdit(): Promise<HinweiseCreationViewPage> {
    return this.navigateTo('hinweise-edit-menu-item', new HinweiseCreationViewPage(this.page).waitForPageLoad());
  }

  public async navigateToAngebotManagement(): Promise<ServiceProviderManagementViewPage> {
    return this.navigateTo(
      'angebot-management-menu-item',
      new ServiceProviderManagementViewPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToAngebotManagementSchulspezifisch(): Promise<ServiceProviderManagementBySchuleViewPage> {
    return this.navigateTo(
      'angebot-display-schulspezifisch-menu-item',
      new ServiceProviderManagementBySchuleViewPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToAngebotCreation(): Promise<ServiceProviderCreationViewPage> {
    return this.navigateTo(
      'angebot-creation-menu-item',
      new ServiceProviderCreationViewPage(this.page).waitForPageLoad(),
    );
  }

  public async navigateToMenuItem(navigate: (menu: MenuBarPage) => Promise<unknown>): Promise<void> {
    await navigate(this);
  }

  /* assertions */
  async assertMenuItemVisibility(locator: Locator, shouldBeVisible: boolean): Promise<void> {
    if (shouldBeVisible) {
      await expect(locator).toBeVisible();
    } else {
      await expect(locator).toHaveCount(0);
    }
  }

  async assertCurrentRoute(route: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${route}(\\?.*)?$`));
  }
}
