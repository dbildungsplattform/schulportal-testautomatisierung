import { Download, expect, Locator, Page } from '@playwright/test';
import * as fs from 'node:fs';
import { UserInfo } from '../../../base/api/personApi';
import { Autocomplete } from '../../components/Autocomplete';
import { DataTable } from '../../components/DataTable.page';
import { MenuBarPage } from '../../components/MenuBar.page';
import { SearchFilter } from '../../components/SearchFilter';
import { AbstractAdminPage } from '../AbstractAdmin.page';
import { PersonDetailsViewPage } from './details/PersonDetailsView.page';
import { RolleEntziehenPage } from './mehrfachbearbeitung/RolleEntziehen.page';
import { RolleZuordnenPage } from './mehrfachbearbeitung/RolleZuordnen.page';

type MehrfachbearbeitungOption = 'Rolle zuordnen' | 'Schüler versetzen' | 'Passwort zurücksetzen' | 'Rolle entziehen';
export class PersonManagementViewPage extends AbstractAdminPage {
  private readonly personTable: DataTable;
  private readonly searchFilter: SearchFilter;
  private readonly organisationAutocomplete: Autocomplete;
  private readonly rolleAutocomplete: Autocomplete;
  private readonly klasseAutocomplete: Autocomplete;
  private readonly klasseAutocompleteInBulkVersetzen: Autocomplete;
  public readonly menu: MenuBarPage;
  private readonly table: Locator;
  private readonly schuelerVersetzenDialogCard: Locator;
  private readonly passwortZuruecksetzenDialogCard: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.table = this.page.getByTestId('person-table');
    this.personTable = new DataTable(this.page, this.table, this.page.getByTestId('selected-count'));
    this.searchFilter = new SearchFilter(this.page);
    this.organisationAutocomplete = new Autocomplete(
      this.page,
      this.page.getByTestId('person-management-organisation-select'),
    );
    this.rolleAutocomplete = new Autocomplete(this.page, this.page.getByTestId('rolle-select'));
    this.klasseAutocomplete = new Autocomplete(this.page, this.page.getByTestId('personen-management-klasse-select'));
    this.klasseAutocompleteInBulkVersetzen = new Autocomplete(
      this.page,
      this.page.getByTestId('bulk-change-klasse-klasse-select'),
    );
    this.menu = new MenuBarPage(this.page);
    this.schuelerVersetzenDialogCard = this.page.getByTestId('change-klasse-layout-card');
    this.passwortZuruecksetzenDialogCard = this.page.getByTestId('password-reset-layout-card');
  }

  /* actions */
  public async waitForPageLoad(): Promise<PersonManagementViewPage> {
    await this.page.getByTestId('admin-headline').waitFor({ state: 'visible' });
    await expect(this.page.getByTestId('person-management-headline')).toHaveText('Benutzerverwaltung');
    await expect(this.page.getByTestId('person-table')).not.toContainText('Daten werden abgerufen...');
    return this;
  }

  public async waitForDataLoad(): Promise<PersonManagementViewPage> {
    await this.personTable.waitForDataLoad();
    return this;
  }

  public async setItemsPerPage(entries: 5 | 30 | 50 | 100 | 300): Promise<void> {
    await this.personTable.setItemsPerPage(entries);
  }

  private async filterByText(text: string, locator: Locator, exactMatch?: boolean): Promise<void> {
    const filter: Autocomplete = new Autocomplete(this.page, locator);
    await filter.searchByTitle(text, exactMatch);
  }

  public async filterBySchule(name: string, exactMatch?: boolean): Promise<void> {
    await this.organisationAutocomplete.searchByTitle(name, exactMatch ?? false);
  }

  public async filterByRolle(rolle: string): Promise<void> {
    await this.rolleAutocomplete.searchByTitle(rolle, true);
  }

  public async filterByKlasse(klasse: string, expectedKlassenCount?: number): Promise<void> {
    const expectedHeaderText: string | undefined =
      expectedKlassenCount !== undefined ? `${expectedKlassenCount} Klassen gefunden` : undefined;
    await this.klasseAutocomplete.searchByTitle(klasse, true, undefined, expectedHeaderText);
  }

  public async resetKlasseFilter(): Promise<void> {
    await this.klasseAutocomplete.clickClearIcon();
  }

  public async filterByStatus(status: string): Promise<void> {
    await this.filterByText(status, this.page.getByTestId('status-select'));
  }

  public async resetFilter(): Promise<void> {
    await this.page.getByTestId('reset-filter-button').click();
  }

  public async searchByText(text: string): Promise<void> {
    await this.searchFilter.searchByText(text);
  }

  public async toggleColumnSort(columnName: string): Promise<void> {
    await this.personTable.clickColumnHeader(columnName, 'personen-frontend');
  }

  public async openGesamtuebersicht(name: string): Promise<PersonDetailsViewPage> {
    await this.personTable.getRow(name).click();
    const personDetailsViewPage: PersonDetailsViewPage = new PersonDetailsViewPage(this.page);
    await personDetailsViewPage.waitForPageLoad();
    return personDetailsViewPage;
  }

  public async searchAndOpenGesamtuebersicht(nameOrKopers: string): Promise<PersonDetailsViewPage> {
    await this.searchByText(nameOrKopers);
    return this.openGesamtuebersicht(nameOrKopers);
  }

  public async toggleSelectAllRows(select: boolean): Promise<void> {
    await this.personTable.toggleSelectAllRows(select);
  }

  public async selectPerson(name: string): Promise<void> {
    await this.personTable.selectRow(name);
  }

  public async filterAndSelectPersons(
    schuleName: string | undefined,
    klassenName: string,
    personNachnamen: string[],
  ): Promise<void> {
    await this.waitForPageLoad();
    if (schuleName !== undefined) {
      await this.filterBySchule(schuleName, false);
    }
    await this.filterByKlasse(klassenName);
    await this.waitForDataLoad();
    for (const nachname of personNachnamen) {
      await this.selectPerson(nachname);
      await this.checkPersonSelected(nachname);
    }
  }

  public async selectMehrfachauswahl(option: MehrfachbearbeitungOption): Promise<void> {
    await this.page.getByTestId('benutzer-edit-select').click();
    const locator: Locator = this.page.getByRole('option', { name: option, exact: false });
    await locator.click();
  }

  public async startRolleZuordnen(): Promise<RolleZuordnenPage> {
    await this.selectMehrfachauswahl('Rolle zuordnen');
    return new RolleZuordnenPage(this.page).waitForPageToLoad();
  }

  public async startRolleEntziehen(): Promise<RolleEntziehenPage> {
    await this.selectMehrfachauswahl('Rolle entziehen');
    return new RolleEntziehenPage(this.page).waitForPageToLoad();
  }

  public async closeDialog(buttonId: string): Promise<void> {
    return this.page.getByTestId(buttonId).click();
  }

  public async versetzeSchueler(klassenname: string): Promise<void> {
    await this.klasseAutocompleteInBulkVersetzen.selectByName(klassenname);
    await this.page.getByTestId('bulk-change-klasse-button').click();
  }

  public async resetPassword(): Promise<void> {
    await this.page.getByTestId('password-reset-submit-button').click();
  }

  public async downloadPasswordFile(): Promise<Download> {
    const downloadPromise: Promise<Download> = this.page.waitForEvent('download');
    await this.page.getByTestId('download-result-button').click();
    return downloadPromise;
  }

  private getKlassenDropdownLocatorInBulkChangeKlasse(): Locator {
    return this.page.getByTestId('bulk-change-klasse-klasse-select');
  }

  /* assertions */
  public async checkManagementPage(): Promise<void> {
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.page.getByTestId('person-management-headline')).toHaveText('Benutzerverwaltung');
    await expect(this.page.getByTestId('reset-filter-button')).toBeVisible();
    await this.organisationAutocomplete.isVisible();
    await expect(this.page.getByTestId('rolle-select')).toBeVisible();
    await this.klasseAutocomplete.isVisible();
    await expect(this.page.getByTestId('status-select')).toBeVisible();
    await expect(this.page.getByTestId('benutzer-edit-select')).toBeVisible();
    await expect(this.page.getByTestId('search-filter-input')).toBeVisible();
    await expect(this.page.getByTestId('apply-search-filter-button')).toBeVisible();
    await expect(this.page.getByTestId('person-table')).toBeVisible();
    await this.checkHeaders([
      'Nachname',
      'Vorname',
      'Benutzername',
      'KoPers.-Nr.',
      'Rolle',
      'Schulzuordnung(en)',
      'Klasse',
    ]);
  }

  public async assertThatPersonExists(name: string): Promise<void> {
    await this.personTable.checkIfItemIsVisible(name);
  }

  public async checkIfPersonNotExists(name: string): Promise<void> {
    await this.personTable.checkIfItemIsNotVisible(name);
  }

  public async checkRowCount(expectedRowCount: number): Promise<void> {
    await this.personTable.checkRowCount(expectedRowCount);
  }

  public async assertSelectedPersonsByCount(expectedCount: number): Promise<void> {
    await this.personTable.assertSelectedRowsByCount(expectedCount);
  }

  public async checkHeaders(expectedHeaders: string[]): Promise<void> {
    await this.personTable.checkHeaders(expectedHeaders);
  }

  private async checkIfColumnAlwaysContainsText(columnIndex: number, expectedText: string): Promise<void> {
    const column: Locator = await this.personTable.getColumn(columnIndex);
    // we don't know how many valid rows there should be, so we have to check that no invalid rows are present
    // using count or all is flaky, because we can't be sure if the table has updated already
    await expect(column.filter({ hasNotText: expectedText })).toHaveCount(0);
  }

  public async checkIfKlassenAreVisibleInDropdown(klassenNamen: string[]): Promise<void> {
    return this.klasseAutocomplete.checkVisibleDropdownOptions(
      klassenNamen,
      true,
      `${klassenNamen.length} Klassen gefunden`,
    );
  }

  public async checkAllKlassenOptionsClickable(klassenNamen: string[]): Promise<void> {
    await this.klasseAutocomplete.checkAllDropdownOptionsClickable(
      klassenNamen,
      `${klassenNamen.length} Klassen gefunden`,
    );
  }

  public async checkIfSchuleIsCorrect(schulname: string, schulNr?: string): Promise<void> {
    const expected: string = schulNr ? `${schulNr} (${schulname})` : schulname;
    await this.organisationAutocomplete.assertTextHard(expected);
    if (schulNr) {
      await this.checkIfColumnAlwaysContainsText(6, schulNr);
    }
  }

  public async assertSchuleFilterIsDisabled(): Promise<void> {
    await this.organisationAutocomplete.isDisabled();
  }

  public async checkIfRolleIsCorrect(rolleName: string): Promise<void> {
    await this.rolleAutocomplete.assertTextHard(rolleName);
    await this.checkIfColumnAlwaysContainsText(5, rolleName);
  }

  public async assertThatAllPersonsHaveRolle(rolleName: string): Promise<void> {
    await this.checkIfColumnAlwaysContainsText(5, rolleName);
  }

  public async checkIfColumnHeaderSorted(
    columnName: string,
    sortingStatus: 'ascending' | 'descending' | 'not-sortable',
  ): Promise<void> {
    await this.personTable.checkIfColumnHeaderSorted(columnName, sortingStatus);
  }

  public async checkIfColumnDataSorted(cellIndex: number, sortOrder: 'ascending' | 'descending'): Promise<void> {
    await this.personTable.checkIfColumnDataSorted(cellIndex, sortOrder);
  }

  public async checkPersonSelected(name: string): Promise<void> {
    return this.personTable.checkRowSelected(name);
  }

  public async checkSchuelerVersetzenDialog(klassenNamen: string[]): Promise<void> {
    await expect(this.schuelerVersetzenDialogCard).toBeVisible({ timeout: 10000 });
    await expect(this.schuelerVersetzenDialogCard.getByTestId('layout-card-headline')).toHaveText('Schüler versetzen');
    await expect(this.getKlassenDropdownLocatorInBulkChangeKlasse()).toBeVisible();
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-button')).toBeVisible();
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-discard-button')).toBeVisible();

    await this.klasseAutocompleteInBulkVersetzen.checkVisibleDropdownOptions(klassenNamen, true);
  }

  public async checkSchuelerVersetzenInProgress(): Promise<void> {
    const progressbar: Locator = this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-progressbar');
    await expect(progressbar).toBeVisible();
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-close-button')).toBeHidden();
    // Warte bis Progressbar zu 100% abgeschlossen ist
    await expect(progressbar).toHaveAttribute('aria-valuenow', '100', { timeout: 10000 });
  }

  public async checkSchuelerVersetzenSuccessDialog(): Promise<void> {
    await expect(this.schuelerVersetzenDialogCard).toBeVisible();
    await expect(this.schuelerVersetzenDialogCard.getByTestId('layout-card-headline')).toHaveText('Schüler versetzen');
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-success-text')).toHaveText(
      'Die ausgewählten Schülerinnen und Schüler wurden erfolgreich versetzt.',
    );
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-progressbar')).toHaveText('100%');
    await expect(this.schuelerVersetzenDialogCard.getByTestId('bulk-change-klasse-close-button')).toBeVisible();
  }

  public async checkSchuelerVersetzenErrorDialog(expectedErrors: 'all' | 'schule' | 'rolle'): Promise<void> {
    const dialogCard: Locator = this.page.getByTestId('invalid-selection-alert-dialog-layout-card');
    await expect(dialogCard).toBeVisible();

    const dialogText: string = (await dialogCard.textContent()) || '';

    const schuleError: string = 'Bitte wählen Sie im Filter genau eine Schule aus, um die Aktion durchzuführen.';
    const rolleError: string = 'Bitte wählen Sie nur Benutzer mit einer Schülerrolle aus, um die Aktion durchzuführen.';

    if (expectedErrors === 'schule') {
      expect(dialogText).toContain(schuleError);
      expect(dialogText).not.toContain(rolleError);
    } else if (expectedErrors === 'rolle') {
      expect(dialogText).toContain(rolleError);
      expect(dialogText).not.toContain(schuleError);
    } else {
      expect(dialogText).toContain(schuleError);
      expect(dialogText).toContain(rolleError);
    }

    await expect(this.page.getByTestId('invalid-selection-alert-dialog-cancel-button')).toBeVisible();
  }

  public async checkNewKlasseNachVersetzen(schuelerListe: UserInfo[], klasseName: string): Promise<void> {
    for (const schueler of schuelerListe) {
      await this.personTable.checkCellInRow(schueler.username, 7, klasseName);
    }
  }

  public async checkPasswortZuruecksetzenDialog(): Promise<void> {
    await expect(this.passwortZuruecksetzenDialogCard).toBeVisible({ timeout: 3000 });
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('layout-card-headline')).toHaveText(
      'Passwort zurücksetzen',
    );
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('password-reset-confirmation-text')).toHaveText(
      'Sind Sie sicher, dass Sie das Passwort für die ausgewählten Benutzer zurücksetzen möchten?',
    );
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('password-reset-discard-button')).toBeVisible();
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('password-reset-submit-button')).toBeVisible();
  }

  public async checkPasswortZuruecksetzenErrorDialog(): Promise<void> {
    const dialogCard: Locator = this.page.getByTestId('invalid-selection-alert-dialog-layout-card');
    await expect(dialogCard).toBeVisible({ timeout: 3000 });
    await expect(dialogCard.getByTestId('layout-card-headline')).toHaveText('Passwort zurücksetzen');
    await expect(dialogCard.getByTestId('invalid-selection-alert-dialog-text')).toHaveText(
      'Bitte wählen Sie im Filter genau eine Schule aus, um die Aktion durchzuführen.',
    );
    await expect(dialogCard.getByTestId('invalid-selection-alert-dialog-cancel-button')).toBeVisible();
  }

  public async checkPasswortZuruecksetzenInProgress(): Promise<void> {
    const dialogCard: Locator = this.page.getByTestId('password-reset-layout-card');
    await expect(dialogCard).toBeVisible();
    await expect(dialogCard.getByTestId('layout-card-headline')).toHaveText('Passwort zurücksetzen');
    await expect(dialogCard.getByTestId('password-reset-progressing-notice')).toHaveText(
      'Bitte den Browser während der Bearbeitung nicht schließen!',
    );

    const progressbar: Locator = dialogCard.getByTestId('password-reset-progressbar');
    await expect(progressbar).toBeVisible();
  }

  public async checkPasswortZuruecksetzenSuccessDialog(): Promise<void> {
    await expect(this.passwortZuruecksetzenDialogCard).toBeVisible();
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('layout-card-headline')).toHaveText(
      'Passwort zurücksetzen',
    );
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('password-reset-success-text')).toHaveText(
      'Bitte laden Sie die Benutzerdaten herunter und teilen Sie den Benutzern das temporäre Passwort mit. ' +
        'Nach dem Schließen des Dialogs werden die Passwörter aus Sicherheitsgründen nicht mehr angezeigt.',
    );
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('password-reset-close-button')).toBeVisible();
    await expect(this.passwortZuruecksetzenDialogCard.getByTestId('download-result-button')).toBeVisible();
  }

  public async checkPasswortdateiHinweis(): Promise<void> {
    const dialogCard: Locator = this.page.getByTestId('password-reset-download-confirmation-layout-card');
    await expect(dialogCard).toBeVisible({ timeout: 3000 });
    await expect(dialogCard.getByTestId('layout-card-headline')).toHaveText('Passwort zurücksetzen');
    await expect(dialogCard.getByTestId('password-reset-download-confirmation-text')).toHaveText(
      'Bitte stellen Sie sicher, dass Sie die Datei mit den temporären Passwörtern erfolgreich heruntergeladen haben. ' +
        'Dies ist zu einem späteren Zeitpunkt aus Sicherheitsgründen nicht mehr möglich.',
    );
    await expect(dialogCard.getByTestId('password-reset-download-confirmation-button')).toBeVisible();
  }

  public async checkPasswortdatei(
    download: Download,
    schulNummer: string,
    users: UserInfo[],
    hasMultipleSchulen: boolean,
  ): Promise<void> {
    // Überprüfe Dateinamen (Format: PW_<Schulnummer>.txt oder PW.txt)
    const filename: string = download.suggestedFilename();
    const expectedFilename: string = hasMultipleSchulen ? `PW_${schulNummer}.txt` : 'PW.txt';
    expect(filename).toBe(expectedFilename);

    // Speichere die Datei
    const downloadDir: string = './test-downloads';
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    const filePath: string = `${downloadDir}/${filename}`;
    await download.saveAs(filePath);

    // Überprüfe, dass die Datei existiert und nicht leer ist
    expect(fs.existsSync(filePath)).toBe(true);
    const fileSize: number = fs.statSync(filePath).size;
    expect(fileSize).toBeGreaterThan(0);

    // Überprüfe, dass alle Benutzernamen in der Datei enthalten sind
    const content: string = fs.readFileSync(filePath, 'utf-8');
    for (const user of users) {
      expect(content).toContain(user.username);
    }

    // aufräumen
    fs.unlinkSync(filePath);
  }

  public async checkRolleAssignedToPersons(rolleName: string, nachnamen: string[]): Promise<void> {
    for (const nachname of nachnamen) {
      await this.personTable.checkCellInRow(nachname, 5, rolleName);
    }
  }

  public async checkKlasseAssignedToPersons(klasseName: string, nachnamen: string[]): Promise<void> {
    for (const nachname of nachnamen) {
      await this.personTable.checkCellInRow(nachname, 7, klasseName);
    }
  }
}
