import { expect, type Locator, Page } from '@playwright/test';
import { waitForAPIResponse } from '../../../../base/api/baseApi';
import { Autocomplete } from '../../../components/Autocomplete';
import { PersonCreationSuccessPage } from './PersonCreationSuccess.page';

export interface PersonCreationParams {
  rollen: string[];
  vorname: string;
  nachname: string;
  dstNr?: string;
  organisation?: string;
  klasse?: string;
  kopersnr?: string;
  befristung?: string;
}

export enum PersonCreationMode {
  CREATE_PERSON = 'create-person',
  ADD_ANOTHER_STATE_EMPLOYEE = 'add-another-state-employee',
}

export class PersonCreationViewPage {
  private static readonly WORKFLOW_ENDPOINT: string = 'personenkontext-workflow/**';

  private readonly organisationAutocomplete: Autocomplete = new Autocomplete(
    this.page,
    this.page.getByTestId('personenkontext-create-organisation-select'),
  );
  private readonly rolleAutocomplete: Autocomplete = new Autocomplete(
    this.page,
    this.page.getByTestId('rollen-select'),
  );

  constructor(
    protected readonly page: Page,
    private readonly mode: PersonCreationMode = PersonCreationMode.CREATE_PERSON,
  ) {}

  /* actions */
  public async waitForPageLoad(): Promise<PersonCreationViewPage> {
    const headline: Locator = this.getHeadline();
    await headline.waitFor({ state: 'visible' });
    await expect(headline).toHaveText(
      this.mode === PersonCreationMode.ADD_ANOTHER_STATE_EMPLOYEE
        ? 'Andere Person (neu anlegen)'
        : 'Neuen Benutzer hinzufügen',
    );
    return this;
  }

  public async fillForm(params: PersonCreationParams): Promise<void> {
    const vornameInput: Locator = this.page.getByTestId('vorname-input').locator('.v-field__input');
    const nachnameInput: Locator = this.page.getByTestId('familienname-input').locator('.v-field__input');

    if (params.organisation) {
      if (params.dstNr) {
        await this.organisationAutocomplete.searchByTitle(
          params.organisation,
          false,
          PersonCreationViewPage.WORKFLOW_ENDPOINT,
        );
      } else {
        await this.organisationAutocomplete.searchByTitle(
          params.organisation,
          true,
          PersonCreationViewPage.WORKFLOW_ENDPOINT,
        );
      }
    }

    await this.rolleAutocomplete.searchAndSelectMultipleByTitle(params.rollen);

    await vornameInput.waitFor({ state: 'visible' });
    await vornameInput.fill(params.vorname);

    await nachnameInput.waitFor({ state: 'visible' });
    await nachnameInput.fill(params.nachname);

    if (params.klasse) {
      const autocomplete: Autocomplete = new Autocomplete(
        this.page,
        this.page.getByTestId('personenkontext-create-klasse-select'),
      );
      await autocomplete.searchByTitle(params.klasse, true);
    }
    if (params.kopersnr) {
      const kopersnrInput: Locator = this.page.getByTestId('kopersnr-input').locator('.v-field__input');
      await kopersnrInput.waitFor({ state: 'visible' });
      await kopersnrInput.fill(params.kopersnr);
    }
    if (params.befristung) {
      console.warn('Befristung field is not implemented yet.');
    }
  }

  public async searchOrganisation(org: string, exact: boolean): Promise<void> {
    await this.organisationAutocomplete.searchByTitle(org, exact, PersonCreationViewPage.WORKFLOW_ENDPOINT);
  }

  public async addRolle(rolle: string): Promise<void> {
    await this.rolleAutocomplete.searchByTitle(rolle, true, 'rolle/for-personenkontext-creation');
  }

  public async clearOrganisation(): Promise<void> {
    await this.organisationAutocomplete.clear();
    await waitForAPIResponse(this.page, PersonCreationViewPage.WORKFLOW_ENDPOINT);
  }

  public async submit(): Promise<PersonCreationSuccessPage> {
    await this.page.getByTestId('person-creation-form-submit-button').click();
    return new PersonCreationSuccessPage(this.page, this.mode).waitForPageLoad();
  }

  private getHeadline(): Locator {
    switch (this.mode) {
      case PersonCreationMode.CREATE_PERSON:
        return this.page.getByTestId('create-person-headline');
      case PersonCreationMode.ADD_ANOTHER_STATE_EMPLOYEE:
        return this.page.getByTestId('add-another-state-employee-headline');
    }
  }

  /* assertions */
  public async assertAvailableRollen(includes: string[], excludes: string[]): Promise<void> {
    for (const includedRolle of includes) {
      await this.rolleAutocomplete.validateItemExists(includedRolle, true);
    }
    for (const excludedRolle of excludes) {
      await this.rolleAutocomplete.validateItemNotExists(excludedRolle, true);
    }
  }
}
