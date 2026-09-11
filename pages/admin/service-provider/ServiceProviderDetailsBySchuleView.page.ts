import { expect, Locator, Page } from '@playwright/test';
import { ServiceProviderKategorie } from '../../../base/api/generated';
import { KATEGORIE_LABEL } from '../../../base/sp';
import { MenuBarPage } from '../../components/MenuBar.page';
import { RollenArt } from '../../../base/api/rolleApi';

interface GroupCounter { selected: number; total: number }

interface CreatedRolle {
  id: string;
  name: string;
}

export class ServiceProviderDetailsBySchuleViewPage {
  private readonly card: Locator;
  private readonly serviceProviderDetailsHeadline: Locator;
  private readonly closeButton: Locator;
  private readonly nameField: Locator;
  private readonly administrationsebeneField: Locator;
  private readonly requires2faField: Locator;
  private readonly canBeAssignedToRollenField: Locator;
  private readonly kategorieField: Locator;
  private readonly linkField: Locator;
  private readonly rollenerweiterungField: Locator;
  private readonly rollenerweiterungenField: Locator;
  private readonly rollenerweiterungenHeadline: Locator;
  private readonly rollenerweiterungBearbeitenButton: Locator;
  private readonly rollenerweiterungTree: Locator;
  private readonly rollenerweiterungSuccessCloseButton: Locator;
  private readonly rollenerweiterungSuccessMessage: Locator;
  private readonly rollenerweiterungBaumGruppeLEHR: Locator;
  private readonly rollenerweiterungBaumGruppeLERN: Locator;
  private readonly rollenerweiterungBaumGruppeLEIT: Locator;
  private readonly rollenerweiterungBaumGruppeCheckboxLEHR: Locator;
  private readonly rollenerweiterungBaumGruppeCheckboxLERN: Locator;
  private readonly rollenerweiterungBaumGruppeCheckboxLEIT: Locator;
  private readonly rollenerweiterungCancelButton: Locator;
  private readonly rollenerweiterungSaveButton: Locator;

  public readonly menu: MenuBarPage;

  constructor(protected readonly page: Page) {
    this.card = this.page.getByTestId('service-provider-details-by-schule-card');
    this.serviceProviderDetailsHeadline = this.page
      .getByTestId('layout-card-headline')
      .filter({ hasText: 'Angebot bearbeiten' });
    this.closeButton = this.page.getByTestId('close-layout-card-button');
    this.nameField = this.page.getByTestId('service-provider-name');
    this.administrationsebeneField = this.page.getByTestId('service-provider-administrationsebene');
    this.requires2faField = this.page.getByTestId('service-provider-requires-2fa');
    this.canBeAssignedToRollenField = this.page.getByTestId('service-provider-can-be-assigned-to-rollen');
    this.kategorieField = this.page.getByTestId('service-provider-kategorie');
    this.linkField = this.page.getByTestId('service-provider-link');
    this.rollenerweiterungField = this.page.getByTestId('service-provider-rollenerweiterung');
    this.rollenerweiterungenField = this.page.getByTestId('service-provider-rollenerweiterungen');
    this.rollenerweiterungenHeadline = this.page
      .getByTestId('layout-card-headline')
      .filter({ hasText: 'Rollenauswahl bearbeiten' });
    this.rollenerweiterungBearbeitenButton = this.page.getByTestId('rollenerweiterung-bearbeiten-button');
    this.rollenerweiterungTree = this.page.getByTestId('rollenerweiterung-tree');
    this.rollenerweiterungSuccessCloseButton = this.page.getByTestId('close-rollenerweiterung-save-success-button');
    this.rollenerweiterungSuccessMessage = this.page.getByText(
      'Die Rollenerweiterungen wurden erfolgreich gespeichert.',
      { exact: true },
    );
    this.rollenerweiterungBaumGruppeLEHR = this.page.getByTestId('treeview-group-LEHR');
    this.rollenerweiterungBaumGruppeLERN = this.page.getByTestId('treeview-group-LERN');
    this.rollenerweiterungBaumGruppeLEIT = this.page.getByTestId('treeview-group-LEIT');
    this.rollenerweiterungBaumGruppeCheckboxLEHR = this.page.getByTestId('treeview-group-checkbox-LEHR');
    this.rollenerweiterungBaumGruppeCheckboxLERN = this.page.getByTestId('treeview-group-checkbox-LERN');
    this.rollenerweiterungBaumGruppeCheckboxLEIT = this.page.getByTestId('treeview-group-checkbox-LEIT');
    this.rollenerweiterungCancelButton = this.page.getByTestId('rollenerweiterung-cancel-button');
    this.rollenerweiterungSaveButton = this.page.getByTestId('rollenerweiterung-save-button');
    this.menu = new MenuBarPage(this.page);
  }

  private getGroupHeader(gruppe: RollenArt): Locator {
    return this.page.getByTestId(`treeview-group-${gruppe}`);
  }

  private getGroupTreeItem(gruppe: RollenArt): Locator {
    const groupHeader: Locator = this.getGroupHeader(gruppe);
    return this.rollenerweiterungTree.locator('[role="treeitem"]').filter({ has: groupHeader });
  }

  /* actions */
  public async waitForPageLoad(): Promise<ServiceProviderDetailsBySchuleViewPage> {
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.card).toBeVisible();
    await expect(this.serviceProviderDetailsHeadline).toContainText('Angebot bearbeiten');
    // Die Detailfelder werden erst nach dem Laden des Angebots gerendert.
    await expect(this.page.getByTestId('service-provider-info-row')).toBeVisible();
    await expect(this.nameField).toBeVisible();
    return this;
  }

  public async getName(): Promise<string> {
    return this.nameField.innerText();
  }

  public async getAdministrationsebene(): Promise<string> {
    return this.administrationsebeneField.innerText();
  }

  public async getRequires2fa(): Promise<string> {
    return this.requires2faField.innerText();
  }

  public async getCanBeAssignedToRollen(): Promise<string> {
    return this.canBeAssignedToRollenField.innerText();
  }

  public async getKategorie(): Promise<string> {
    return this.kategorieField.innerText();
  }

  public async getLink(): Promise<string> {
    return this.linkField.innerText();
  }

  public async getRollenerweiterung(): Promise<string> {
    return this.rollenerweiterungField.innerText();
  }

  public async getRollenerweiterungen(): Promise<string> {
    return this.rollenerweiterungenField.innerText();
  }

  public async clickRollenerweiterungBearbeiten(): Promise<void> {
    await this.rollenerweiterungBearbeitenButton.click();
  }

  public async cancelRollenerweiterung(): Promise<void> {
    await this.rollenerweiterungCancelButton.click();
    await expect(this.rollenerweiterungCancelButton).toBeHidden();
  }

  public async saveRollenerweiterung(): Promise<void> {
    await this.rollenerweiterungSaveButton.click();
  }

  public async closeRollenerweiterungSuccessDialog(): Promise<void> {
    await this.rollenerweiterungSuccessCloseButton.click();
    await expect(this.rollenerweiterungSuccessCloseButton).toBeHidden();
  }

  public async toggleGroupExpand(gruppe: RollenArt): Promise<void> {
    const groupTreeItem: Locator = this.getGroupTreeItem(gruppe);
    const expandToggle: Locator = groupTreeItem.locator('.v-list-item-action--start .v-btn');
    await expandToggle.click();
  }

  public async toggleGroupCheckbox(gruppe: RollenArt): Promise<void> {
    await this.page.getByTestId(`treeview-group-checkbox-${gruppe}`).click();
  }

  public async toggleRolleByName(rolleName: string): Promise<void> {
    // :not([aria-expanded]) excludes group nodes, which always carry that attribute
    const roleRow: Locator = this.rollenerweiterungTree
      .locator('[role="treeitem"]:not([aria-expanded])')
      .filter({ hasText: rolleName });
    await expect(roleRow).toHaveCount(1);
    await roleRow.scrollIntoViewIfNeeded();
    await roleRow.getByRole('checkbox').click();
  }

  public async getGroupCounter(gruppe: RollenArt): Promise<GroupCounter> {
    const text: string = await this.getGroupHeader(gruppe).innerText();
    const match: RegExpMatchArray | null = text.match(/\((\d+)\s+von\s+(\d+)\)/);
    if (!match) {
      throw new Error(`Unable to parse counter for group ${gruppe}: ${text}`);
    }

    return {
      selected: Number(match[1]),
      total: Number(match[2]),
    };
  }

  public async openRollenerweiterungDialog(): Promise<void> {
    await this.clickRollenerweiterungBearbeiten();
    await this.assertRollenerweiterungDialogVisible();
  }

  public async assertRollenerweiterungDialogInitialState(): Promise<void> {
    await this.assertGroupExpanded('LEHR', true);
    await this.assertGroupExpanded('LERN', true);
    await this.assertGroupExpanded('LEIT', false);

    const lehrCounter: GroupCounter = await this.getGroupCounter('LEHR');
    const lernCounter: GroupCounter = await this.getGroupCounter('LERN');
    const leitCounter: GroupCounter = await this.getGroupCounter('LEIT');

    await this.assertGroupCounter('LEHR', 0, lehrCounter.total);
    await this.assertGroupCounter('LERN', 0, lernCounter.total);
    await this.assertGroupCounter('LEIT', 0, leitCounter.total);
  }

  public async toggleInitialGroupExpansionAndAssert(): Promise<void> {
    await this.toggleGroupExpand('LEHR');
    await this.assertGroupExpanded('LEHR', false);

    await this.toggleGroupExpand('LERN');
    await this.assertGroupExpanded('LERN', false);

    await this.toggleGroupExpand('LEIT');
    await this.assertGroupExpanded('LEIT', true);
  }

  public async selectGroupAndAssertAllSelected(gruppe: RollenArt): Promise<GroupCounter> {
    await this.toggleGroupCheckbox(gruppe);
    const selectedCounter: GroupCounter = await this.getGroupCounter(gruppe);
    expect(selectedCounter.selected).toBe(selectedCounter.total);
    return selectedCounter;
  }

  public async deselectRolesAndAssertPartialSelection(
    gruppe: RollenArt,
    rollenNamen: string[],
    selectedCounterBeforeDeselect: GroupCounter,
  ): Promise<GroupCounter> {
    for (const rollenName of rollenNamen) {
      await this.toggleRolleByName(rollenName);
    }

    const selectedCounterAfterDeselect: GroupCounter = await this.getGroupCounter(gruppe);
    expect(selectedCounterAfterDeselect.selected).toBe(selectedCounterBeforeDeselect.selected - rollenNamen.length);
    expect(selectedCounterAfterDeselect.total).toBe(selectedCounterBeforeDeselect.total);
    await this.assertGroupPartiallySelected(gruppe);

    return selectedCounterAfterDeselect;
  }

  public async saveRollenerweiterungAndAssertSuccess(): Promise<void> {
    await this.saveRollenerweiterung();
    await this.assertSuccessDialogVisible();
  }

  public async close(): Promise<void> {
    await this.closeButton.click();
  }

  /* assertions */
  public async assertPageIsVisible(): Promise<void> {
    await expect(this.page.getByTestId('admin-headline')).toHaveText('Administrationsbereich');
    await expect(this.card).toBeVisible();
    await expect(this.serviceProviderDetailsHeadline).toContainText('Angebot bearbeiten');
  }

  public async assertRollenerweiterungBearbeitenVisible(): Promise<void> {
    await expect(this.rollenerweiterungBearbeitenButton).toBeVisible();
  }

  public async assertRollenerweiterungDialogVisible(): Promise<void> {
    await expect(this.rollenerweiterungTree).toBeVisible();
    await expect(this.page.getByText('Rollenauswahl bearbeiten', { exact: true })).toBeVisible();
    await expect(this.rollenerweiterungCancelButton).toBeVisible();
    await expect(this.rollenerweiterungSaveButton).toBeVisible();
  }

  public async assertGroupExpanded(gruppe: RollenArt, expanded: boolean): Promise<void> {
    await expect(this.getGroupTreeItem(gruppe)).toHaveAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  public async assertGroupCounter(gruppe: RollenArt, selected: number, total: number): Promise<void> {
    const currentCounter: { selected: number; total: number } = await this.getGroupCounter(gruppe);
    expect(currentCounter.selected).toBe(selected);
    expect(currentCounter.total).toBe(total);
  }

  public async assertSuccessDialogVisible(): Promise<void> {
    await expect(this.page.getByText('Rollenauswahl bearbeiten', { exact: true })).toBeVisible();
    await expect(this.rollenerweiterungSuccessMessage).toBeVisible();
    await expect(this.rollenerweiterungSuccessCloseButton).toBeVisible();
  }

  public async assertGroupPartiallySelected(gruppe: RollenArt): Promise<void> {
    await expect(this.page.getByTestId(`treeview-group-checkbox-${gruppe}`).locator('input')).toHaveAttribute(
      'aria-checked',
      'mixed',
    );
  }

  public async assertServiceProviderDetailsHeadline(schulname: string): Promise<void> {
    await expect(this.serviceProviderDetailsHeadline).toHaveText(`Angebot bearbeiten ${schulname}`);
  }

  public async assertCanEditRollenerweiterung(): Promise<void> {
    await expect(this.rollenerweiterungBearbeitenButton).toBeVisible();
    await expect(this.rollenerweiterungBearbeitenButton).toBeEnabled();
  }

  public async assertServiceProviderDetails(expected: {
    organisation?: string;
    name?: string;
    administrationsebene?: string;
    requires2fa?: string;
    kategorie?: ServiceProviderKategorie;
    link?: string;
    rollenerweiterung?: string;
  }): Promise<void> {
    if (expected.name) await expect(this.nameField).toHaveText(expected.name);
    if (expected.organisation) await expect(this.administrationsebeneField).toHaveText(expected.organisation);
    if (expected.administrationsebene)
      await expect(this.administrationsebeneField).toHaveText(expected.administrationsebene);
    if (expected.requires2fa) await expect(this.requires2faField).toHaveText(expected.requires2fa);
    if (expected.kategorie) await expect(this.kategorieField).toHaveText(KATEGORIE_LABEL[expected.kategorie]);
    if (expected.link) await expect(this.linkField).toHaveText(expected.link);
    if (expected.rollenerweiterung) await expect(this.rollenerweiterungField).toHaveText(expected.rollenerweiterung);
  }

  public async assertRollenerweiterungenDetails(): Promise<void> {
    await expect(this.rollenerweiterungenHeadline).toHaveText('Rollenauswahl bearbeiten');
    await expect(this.rollenerweiterungBaumGruppeCheckboxLEHR).toBeVisible();
    await expect(this.rollenerweiterungBaumGruppeLEHR).toBeVisible();
    await expect(this.rollenerweiterungBaumGruppeCheckboxLERN).toBeVisible();
    await expect(this.rollenerweiterungBaumGruppeLERN).toBeVisible();
    await expect(this.rollenerweiterungBaumGruppeCheckboxLEIT).toBeVisible();
    await expect(this.rollenerweiterungBaumGruppeLEIT).toBeVisible();
    await expect(this.rollenerweiterungCancelButton).toBeVisible();
    await expect(this.rollenerweiterungCancelButton).toBeEnabled();
    await expect(this.rollenerweiterungSaveButton).toBeVisible();
    await expect(this.rollenerweiterungSaveButton).toBeEnabled();
  }

  public async assertRollenerweiterungen(expected: string): Promise<void> {
    await expect(this.rollenerweiterungenField).toHaveText(expected);
  }

  public async assertRollenerweiterungenContain(expectedRollen: string[]): Promise<void> {
    for (const rollenName of expectedRollen) {
      await expect(this.rollenerweiterungenField).toContainText(rollenName);
    }
  }

  public async applyRollenerweiterungSelectionAndAssertions(
    lehrRollen: CreatedRolle[],
    lernRollen: CreatedRolle[],
    leitRollen: CreatedRolle[],
  ): Promise<void> {
    await this.openRollenerweiterungDialog();

    const lehrBeforeUncheck = await this.selectGroupAndAssertAllSelected('LEHR');
    await this.deselectRolesAndAssertPartialSelection(
      'LEHR',
      [lehrRollen[0]!.name, lehrRollen[1]!.name],
      lehrBeforeUncheck,
    );

    const lernBeforeUncheck = await this.selectGroupAndAssertAllSelected('LERN');
    await this.deselectRolesAndAssertPartialSelection(
      'LERN',
      [lernRollen[0]!.name],
      lernBeforeUncheck,
    );

    const leitBeforeUncheck = await this.selectGroupAndAssertAllSelected('LEIT');
    await this.toggleGroupExpand('LEIT');
    await this.assertGroupExpanded('LEIT', true);
    await this.deselectRolesAndAssertPartialSelection(
      'LEIT',
      [leitRollen[0]!.name],
      leitBeforeUncheck,
    );
  }
}
