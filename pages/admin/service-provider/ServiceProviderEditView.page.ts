import { expect, Locator, Page } from '@playwright/test';
import { ServiceProviderKategorie } from '../../../base/api/generated';
import { KATEGORIE_LABEL } from '../../../base/sp';
import { Autocomplete } from '../../components/Autocomplete';
import { ServiceProviderManagementBySchuleViewPage } from './ServiceProviderManagementBySchuleView.page';

const EDIT_URL: RegExp = /\/admin\/angebote\/[^/]+\/edit(?:\?.*)?$/;

export class ServiceProviderEditViewPage {
  private readonly organisationAutocomplete: Autocomplete;
  private readonly kategorieAutocomplete: Autocomplete;
  private readonly rolleZuweisenAutocomplete: Autocomplete;
  private readonly zweiFaktorAutocomplete: Autocomplete;
  private readonly kategorieSelect: Locator;
  private readonly nameField: Locator;
  private readonly nameInput: Locator;
  private readonly urlField: Locator;
  private readonly urlInput: Locator;
  private readonly submitButton: Locator;
  private readonly unsavedChangesWarningText: Locator;
  private readonly confirmUnsavedChangesButton: Locator;

  constructor(protected readonly page: Page) {
    this.organisationAutocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('service-provider-edit-organisation-select'),
    );
    this.kategorieSelect = this.page.getByTestId('kategorie-select');
    this.kategorieAutocomplete = new Autocomplete(this.page, this.kategorieSelect);
    this.rolleZuweisenAutocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('nachtraeglich-zuweisbar-select'),
    );
    this.zweiFaktorAutocomplete = new Autocomplete(this.page, this.page.getByTestId('requires2fa-select'));
    this.nameField = this.page.getByTestId('name-input');
    this.nameInput = this.nameField.locator('input');
    this.urlField = this.page.getByTestId('url-input');
    this.urlInput = this.urlField.locator('input');
    this.submitButton = this.page.getByTestId('service-provider-edit-form-submit-button');
    this.unsavedChangesWarningText = this.page.getByTestId('unsaved-changes-warning-text');
    this.confirmUnsavedChangesButton = this.page.getByTestId('confirm-unsaved-changes-button');
  }

  /* actions */
  public async waitForPageLoad(): Promise<ServiceProviderEditViewPage> {
    await expect(this.page).toHaveURL(EDIT_URL);
    await expect(this.page.getByTestId('service-provider-edit-headline')).toContainText('Angebot bearbeiten');
    await expect(this.page.getByTestId('service-provider-edit-form')).toBeVisible();
    await expect(this.nameInput).not.toHaveValue('');
    return this;
  }

  public async enterName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  public async enterUrl(url: string): Promise<void> {
    await this.urlInput.fill(url);
  }

  public async selectKategorie(kategorie: ServiceProviderKategorie): Promise<void> {
    await this.kategorieAutocomplete.openModal();
    await this.kategorieAutocomplete.selectByName(KATEGORIE_LABEL[kategorie]);
  }

  public async clickTestUrl(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.page.getByTestId('url-test-button').click(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  public async clickSave(): Promise<void> {
    await this.submitButton.click();
  }

  public async clickCancel(): Promise<void> {
    await this.page.getByTestId('service-provider-edit-form-discard-button').click();
  }

  public async clickPersonManagementMenuItem(): Promise<void> {
    await this.page.getByTestId('person-management-menu-item').click();
  }

  public async confirmUnsavedChangesAndNavigateToSchulspezifischeAngeboteList(): Promise<ServiceProviderManagementBySchuleViewPage> {
    await this.confirmUnsavedChangesButton.click();
    return new ServiceProviderManagementBySchuleViewPage(this.page).waitForPageLoad();
  }

  public async navigateFromSuccessToSchulspezifischeAngeboteList(): Promise<ServiceProviderManagementBySchuleViewPage> {
    await this.page.getByTestId('to-service-provider-list-button').click();
    return new ServiceProviderManagementBySchuleViewPage(this.page).waitForPageLoad();
  }

  /* assertions */
  public async assertOrganisationPreselectedAndReadonly(organisation: string): Promise<void> {
    await this.organisationAutocomplete.isDisabled();
    await this.organisationAutocomplete.assertTextSoft(organisation);
  }

  public async assertNameAndUrlVisible(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.urlInput).toBeVisible();
  }

  public async assertKategorieEditable(): Promise<void> {
    await expect(this.kategorieSelect.locator('.v-field__input input')).toBeEnabled();
  }

  public async assertRollenZuweisbarAndZweiFaktorDisabled(): Promise<void> {
    await this.rolleZuweisenAutocomplete.isDisabled();
    await this.zweiFaktorAutocomplete.isDisabled();
  }

  public async assertNameRequiredHint(): Promise<void> {
    await expect(this.nameField.locator('.v-messages__message')).toHaveText(
      'Der Name des Angebots muss angegeben werden.',
    );
  }

  public async assertUrlRequiredHint(): Promise<void> {
    await expect(this.urlField.locator('.v-messages__message')).toHaveText(
      'Die URL des Angebots muss angegeben werden.',
    );
  }

  public async assertSaveDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  public async assertSaveEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  public async assertTabUrl(tab: Page, expectedUrl: string): Promise<void> {
    await expect(tab).toHaveURL(new URL(expectedUrl).href);
  }

  public async assertSuccessMessage(angebotName: string): Promise<void> {
    await expect(this.page.getByTestId('success-message')).toContainText(
      `Das Angebot ${angebotName} wurde erfolgreich geändert.`,
    );
  }

  public async assertSuccessUrl(url: string): Promise<void> {
    await expect(this.page.getByTestId('success-url')).toHaveText(url);
  }

  public async assertUnsavedChangesDialogVisible(): Promise<void> {
    await expect(this.unsavedChangesWarningText).toHaveText(
      'Sie haben nicht gespeicherte Änderungen vorgenommen. Wollen Sie die Seite trotzdem verlassen?',
    );
    await expect(this.confirmUnsavedChangesButton).toBeVisible();
    await expect(this.page).toHaveURL(EDIT_URL);
  }

  public async assertDuplicateNameError(): Promise<void> {
    await expect(this.page.getByTestId('spsh-alert-title')).toHaveText('Fehler beim Bearbeiten des Angebots');
    await expect(this.page.getByTestId('spsh-alert-text')).toHaveText(
      'Der Name des Angebots wird auf dieser Ebene bereits verwendet. Bitte wählen Sie einen anderen Namen.',
    );
  }
}
