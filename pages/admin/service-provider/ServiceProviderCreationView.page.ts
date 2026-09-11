import { expect, Locator, Page } from '@playwright/test';
import { ServiceProviderKategorie } from '../../../base/api/generated';
import { KATEGORIE_LABEL } from '../../../base/sp';
import { booleanToString } from '../../../base/utils/conversion';
import { Autocomplete } from '../../components/Autocomplete';
import { ServiceProviderCreationSuccessPage } from './ServiceProviderCreationSuccessPage.page';

export interface ServiceProviderCreateParams {
  organisation: string;
  name: string;
  url: string;
  logoAlt: string;
  kategorie: ServiceProviderKategorie;
  zuweisbar: boolean;
  nutzbarRollenerweiterung: boolean;
  twoFactor: boolean;
}
export class ServiceProviderCreationViewPage {
  private organisationAutocomplete: Autocomplete;
  private kategorieAutocomplete: Autocomplete;
  private rolleZuweisenAutocomplete: Autocomplete;
  private schulspezifischeRollenerweiterungAutocomplete: Autocomplete;
  private zweiFactorAutocomplete: Autocomplete;

  constructor(protected readonly page: Page) {
    this.organisationAutocomplete = new Autocomplete(
      page,
      page.getByTestId('service-provider-create-organisation-select'),
    );
    this.kategorieAutocomplete = new Autocomplete(page, this.page.getByTestId('kategorie-select'));
    this.rolleZuweisenAutocomplete = new Autocomplete(page, this.page.getByTestId('nachtraeglich-zuweisbar-select'));
    this.schulspezifischeRollenerweiterungAutocomplete = new Autocomplete(
      page,
      this.page.getByTestId('verfuegbar-fuer-rollenerweiterung-select'),
    );
    this.zweiFactorAutocomplete = new Autocomplete(page, this.page.getByTestId('requires2fa-select'));
  }

  public async waitForPageLoad(): Promise<ServiceProviderCreationViewPage> {
    await expect(this.page.getByTestId('service-provider-create-headline')).toHaveText('Neues Angebot hinzufügen');
    await expect(this.page.getByTestId('service-provider-create-form')).toBeVisible();
    return this;
  }

  public async selectOrganisation(name: string): Promise<void> {
    await this.organisationAutocomplete.searchByTitle(name);
  }

  public async enterName(name: string): Promise<void> {
    await this.page.getByTestId('name-input').getByLabel('Name').fill(name);
  }

  public async enterUrl(url: string): Promise<void> {
    await this.page.getByTestId('url-input').getByLabel('URL').fill(url);
  }

  public async clickTestUrl(): Promise<Page> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.page.getByTestId('url-test-button').click(),
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }

  public async selectLogo(params: { logoId: string | number } | { logoAlt: string }): Promise<void> {
    if ('logoAlt' in params) {
      await this.page.getByAltText(params.logoAlt).click();
    } else if ('logoId' in params) {
      await this.page.getByTestId(`logo-${params.logoId}`).click();
    }
  }

  public async selectKategorie(kategorie: ServiceProviderKategorie): Promise<void> {
    await this.kategorieAutocomplete.selectByName(KATEGORIE_LABEL[kategorie]);
  }

  public async selectRollenZuweisbar(zuweisbar: boolean): Promise<void> {
    await this.rolleZuweisenAutocomplete.selectByName(zuweisbar ? 'Ja' : 'Nein');
  }

  public async selectSchulspezifischErweiterbar(erweiterbar: boolean): Promise<void> {
    await this.schulspezifischeRollenerweiterungAutocomplete.selectByName(erweiterbar ? 'Ja' : 'Nein');
  }

  public async selectZweiFaktorErforderlich(erforderlich: boolean): Promise<void> {
    await this.zweiFactorAutocomplete.selectByName(erforderlich ? 'Ja' : 'Nein');
  }

  public async clickSubmit(): Promise<ServiceProviderCreationSuccessPage> {
    await this.page.getByTestId('service-provider-create-form-submit-button').click();
    return new ServiceProviderCreationSuccessPage(this.page).waitForPageLoad();
  }

  public async assertPreview(name: string, logoAlt: string): Promise<void> {
    await expect(this.page.getByTestId('card-title')).toContainText(name);
    await expect(
      this.page.getByText('Eine Vorschau wird angezeigt, sobald Name und Logo festgelegt wurden.'),
    ).toBeHidden();
    await this.page.getByTestId('service-provider-preview-card').scrollIntoViewIfNeeded();
    const img: Locator = this.page.locator(`img[alt="provider-logo"]`);
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', new RegExp(logoAlt, 'gi'));
  }

  public async assertSchulePreselected(schule: string): Promise<void> {
    await this.organisationAutocomplete.isDisabled();
    await this.organisationAutocomplete.assertTextSoft(schule);
  }

  public async assertDefaultValuesSet(): Promise<void> {
    await this.kategorieAutocomplete.assertTextHard(KATEGORIE_LABEL[ServiceProviderKategorie.Schulisch]);
    await this.rolleZuweisenAutocomplete.assertTextHard(booleanToString(true));
    await this.schulspezifischeRollenerweiterungAutocomplete.assertTextHard(booleanToString(true));
    await this.zweiFactorAutocomplete.assertTextHard(booleanToString(false));
  }

  public async assertSchuladminFieldsDisabled(): Promise<void> {
    await this.kategorieAutocomplete.isDisabled();
    await this.rolleZuweisenAutocomplete.isDisabled();
    await this.schulspezifischeRollenerweiterungAutocomplete.isDisabled();
    await this.zweiFactorAutocomplete.isDisabled();
  }

  public async assertSelectableSchulen(schulen: string[]): Promise<void> {
    // Organisation options render as "<Dienststellennummer> (<Schulname>)", so match on substring.
    await this.organisationAutocomplete.checkVisibleDropdownOptions(schulen, true, undefined, true);
  }
}
