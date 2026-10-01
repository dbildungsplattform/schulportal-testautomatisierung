import { expect, Page } from '@playwright/test';
import { KATEGORIE_LABEL } from '../../../base/sp';
import { booleanToString } from '../../../base/utils/conversion';
import { ServiceProviderCreateParams } from './ServiceProviderCreationView.page';
import { ServiceProviderDetailsBySchuleViewPage } from './ServiceProviderDetailsBySchuleView.page';

export class ServiceProviderCreationSuccessPage {
  constructor(protected readonly page: Page) {}

  public async waitForPageLoad(): Promise<ServiceProviderCreationSuccessPage> {
    await expect(this.page.getByTestId('success-message')).toContainText(
      'Bitte wählen Sie nun die Rollen aus, die auf das Angebot zugreifen sollen.',
    );
    await expect(this.page.getByTestId('to-service-provider-details-button')).toBeVisible();
    return this;
  }

  public async navigateToRollenauswahl(): Promise<ServiceProviderDetailsBySchuleViewPage> {
    await this.page.getByTestId('to-service-provider-details-button').click();
    return new ServiceProviderDetailsBySchuleViewPage(this.page).waitForPageLoad();
  }

  public async assertSuccessPage({
    organisation,
    name,
    url,
    logoAlt: logo,
    kategorie,
    zuweisbar,
    nutzbarRollenerweiterung,
    twoFactor,
  }: ServiceProviderCreateParams): Promise<void> {
    await expect(this.page.getByTestId('success-message')).toContainText(
      `Das Angebot ${name} wurde erfolgreich hinzugefügt.`,
    );
    await expect(this.page.getByTestId('success-organisation')).toHaveText(organisation);
    await expect(this.page.getByTestId('success-name')).toHaveText(name);
    await expect(this.page.getByTestId('success-logo').getByAltText(logo)).toBeVisible();
    await expect(this.page.getByTestId('success-url')).toHaveText(url);
    await expect(this.page.getByTestId('success-kategorie')).toHaveText(KATEGORIE_LABEL[kategorie]);
    await expect(this.page.getByTestId('success-nachtraeglich-zuweisbar')).toHaveText(booleanToString(zuweisbar));
    await expect(this.page.getByTestId('success-verfuegbar-fuer-rollenerweiterung')).toHaveText(
      booleanToString(nutzbarRollenerweiterung),
    );
    await expect(this.page.getByTestId('success-requires-2fa')).toHaveText(booleanToString(twoFactor));
  }
}
