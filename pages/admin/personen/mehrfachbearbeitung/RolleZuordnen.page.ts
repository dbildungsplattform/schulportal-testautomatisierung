import { expect, Locator, Page, Response } from '@playwright/test';
import { Autocomplete } from '../../../components/Autocomplete';
import { BefristungsInput } from '../../../components/BefristungsInput.page';
import { PersonManagementViewPage } from '../PersonManagementView.page';

export class RolleZuordnenPage {
  private readonly layoutCard: Locator;
  private readonly organisationSelect: Autocomplete;
  private readonly rolleSelect: Autocomplete;
  private readonly klasseAutocomplete: Autocomplete;
  private readonly befristungsInput: BefristungsInput;
  private readonly submitButton: Locator;
  private readonly keepKlasseRadioButton: Locator;
  private readonly selectNewKlasseRadioButton: Locator;

  public constructor(private readonly page: Page) {
    this.layoutCard = this.page.getByTestId('rolle-modify-layout-card');
    this.organisationSelect = new Autocomplete(
      page,
      this.layoutCard.getByTestId('personenkontext-create-organisation-select'),
    );
    this.rolleSelect = new Autocomplete(page, this.layoutCard.getByTestId('rolle-select'));
    this.klasseAutocomplete = new Autocomplete(
      page,
      this.layoutCard.getByTestId('personenkontext-create-rolle-modify-klasse-select'),
    );
    this.befristungsInput = new BefristungsInput(page);
    this.submitButton = this.layoutCard.getByTestId('rolle-modify-submit-button');
    this.keepKlasseRadioButton = this.layoutCard.getByTestId('keep-klasse-radio-button');
    this.selectNewKlasseRadioButton = this.layoutCard.getByTestId('select-new-klasse-radio-button');
  }

  public async waitForPageToLoad(): Promise<RolleZuordnenPage> {
    await expect(this.layoutCard).toContainText('Rolle zuordnen');
    return this;
  }

  public async selectOrganisation(name: string): Promise<void> {
    await this.organisationSelect.searchByTitle(name, false);
  }

  public async selectRolle(name: string): Promise<void> {
    await this.rolleSelect.searchByTitle(name, true);
  }

  public async submitRolleAssignment(): Promise<void> {
    await this.submitButton.click();
  }

  public async closeModal(): Promise<PersonManagementViewPage> {
    await this.layoutCard.getByTestId('rolle-modify-close-button').click();
    return new PersonManagementViewPage(this.page).waitForPageLoad();
  }

  public async assertRolleNotFound(name: string): Promise<void> {
    await this.rolleSelect.validateItemNotExists(name, true);
    await this.page.waitForResponse((response: Response): boolean => {
      const url: string = response.url();
      return url.includes('personenkontext-workflow/step') && url.includes('rolleName=');
    });
    await this.rolleSelect.assertThatNoDataWasFound();
  }

  public async assertSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  public async assertSelectedOrganisation(expectedOrganisation: string): Promise<void> {
    await this.organisationSelect.assertTextSoft(expectedOrganisation);
  }

  public async assertKopersTextIsVisible(): Promise<void> {
    await expect(this.layoutCard.getByTestId('no-kopersnr-information')).toContainText(
      'Bitte beachten: Alle ausgewählten Benutzerkonten müssen über eine KoPers.-Nr. verfügen. Tragen Sie diese ggf. bitte in der Gesamtübersicht des Benutzers nach, sobald sie Ihnen vorliegt. Ein Benutzerkonto mit der gewählten Rolle ohne KoPers.-Nr. wird nach spätestens 8 Wochen automatisch gesperrt.',
    );
  }

  public async assertKopersTextIsNotVisible(): Promise<void> {
    await expect(this.layoutCard.getByTestId('no-kopersnr-information')).toBeHidden();
  }

  public async assertUnbefristetChecked(): Promise<void> {
    await this.befristungsInput.assertSelectedBefristungOption('unbefristet');
  }

  public async assertSchuljahresendeChecked(): Promise<void> {
    await this.befristungsInput.assertSelectedBefristungOption('schuljahresende');
  }

  public async assertSuccessMessageIsVisible(): Promise<void> {
    await expect(this.layoutCard).toContainText('Die Rolle wurde erfolgreich zugeordnet.');
  }

  public async assertKlassenOptionen(): Promise<void> {
    await expect(this.keepKlasseRadioButton).toBeVisible();
    await expect(this.selectNewKlasseRadioButton).toBeVisible();
    await expect(this.keepKlasseRadioButton.locator('input')).toBeChecked();
  }

  public async selectKlasseBeibehalten(): Promise<void> {
    await this.keepKlasseRadioButton.click();
    await expect(this.keepKlasseRadioButton.locator('input')).toBeChecked();
  }

  public async selectAndereKlasseAuswaehlen(): Promise<void> {
    const klassenLoaded: Promise<Response> = this.page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/organisationen') && resp.url().includes('typ=KLASSE') && resp.status() === 200,
    );
    await this.selectNewKlasseRadioButton.locator('input').click();
    await expect(this.selectNewKlasseRadioButton.locator('input')).toBeChecked();
    await klassenLoaded;
  }

  public async selectKlasse(klassenname: string): Promise<void> {
    await this.klasseAutocomplete.searchByTitle(klassenname, true);
  }

  public async fillBefristung(date: string): Promise<void> {
    const befristungInput: Locator = this.layoutCard.getByTestId('befristung-input').locator('input');
    await befristungInput.waitFor({ state: 'visible' });
    await befristungInput.fill(date);
  }

  public async assertHint(expectedText: string): Promise<void> {
    await expect(this.layoutCard.getByTestId('modify-Rolle-hint')).toContainText(expectedText);
  }

  public async assertSuccessDialog(): Promise<void> {
    await expect(this.layoutCard).toBeVisible();
    await expect(this.layoutCard.getByTestId('layout-card-headline')).toHaveText('Rolle zuordnen');
    await expect(this.layoutCard).toContainText('Die Rolle wurde erfolgreich zugeordnet.');
    await expect(this.layoutCard.getByTestId('rolle-modify-close-button')).toBeVisible();
  }

  public async assertErrorDialog(
    expectedUsers: { vorname: string; nachname: string; username: string }[],
  ): Promise<void> {
    const errorCard: Locator = this.page.getByTestId('person-bulk-error-layout-card');
    await expect(errorCard).toBeVisible();
    await expect(errorCard.getByTestId('layout-card-headline')).toHaveText('Fehler bei der Mehrfachbearbeitung');

    const expectedFehlertext: string =
      'Die neue Rolle kann diesem Benutzer nicht zugeordnet werden, da er entweder diese Rolle schon an einer ' +
      'anderen Klasse besitzt oder mehreren Klassen zugeordnet ist. Bitte nehmen Sie die Änderung per Einzelbearbeitung vor.';

    const items: Locator = errorCard.locator('[data-testid^="person-bulk-error-error-list-item-"]');
    await expect(items).toHaveCount(expectedUsers.length);

    for (const user of expectedUsers) {
      const item: Locator = items.filter({ hasText: `${user.vorname} ${user.nachname} (${user.username})` });
      await expect(item).toHaveCount(1);
      await expect(item).toContainText(expectedFehlertext);
    }

    await expect(errorCard.getByTestId('person-bulk-error-discard-button')).toBeVisible();
    await expect(errorCard.getByTestId('person-bulk-error-save-button')).toBeVisible();
  }

  public async closeErrorDialog(): Promise<void> {
    await this.page
      .getByTestId('person-bulk-error-layout-card')
      .getByTestId('person-bulk-error-discard-button')
      .click();
    await this.page.getByTestId('confirm-close-bulk-error-dialog-button').click();
  }
}
