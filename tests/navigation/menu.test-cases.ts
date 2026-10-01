import { RollenSystemRechtEnum } from '../../base/api/generated/models/RollenSystemRechtEnum';
import { MenuBarPage } from '../../pages/components/MenuBar.page';

/**
 * Represents a single menu item test case for the MenuBar.
 *
 * Each test case defines:
 * - `name`: Human-readable description of the menu item.
 * - `testId`: The data-testid used in the frontend to locate the menu item.
 * - `navigate`: Function that performs the navigation to the menu item using the MenuBarPage object.
 * - `route`: Expected URL route after navigation.
 * - `requiredPermissions`: Array of system rights required for this menu item to be visible.
 */
export interface MenuTestCase {
  name: string;
  testId: string;
  navigate: (menu: MenuBarPage) => Promise<unknown>;
  route: string;
  requiredPermissions: RollenSystemRechtEnum[];
}

/**
 * Array of all menu item test cases to validate visibility and navigation
 * according to the user's system rights.
 *
 * Each entry in this array corresponds to a menu item in the application.
 * During tests, the system will check:
 * - Whether the menu item is visible if the user has the required permissions.
 * - Whether navigation leads to the correct route.
 */
export const MENU_TEST_CASES: MenuTestCase[] = [
  {
    name: 'Zurück zur Startseite',
    testId: 'back-to-start-link',
    route: '/start',
    requiredPermissions: [],
    navigate: (menu: MenuBarPage) => menu.navigateToStartPage(),
  },
  {
    name: 'Alle Personen anzeigen',
    testId: 'person-management-menu-item',
    route: '/admin/personen',
    requiredPermissions: [RollenSystemRechtEnum.PersonenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToPersonManagement(),
  },
  {
    name: 'Neue Person anlegen',
    testId: 'person-creation-menu-item',
    route: '/admin/personen/new',
    requiredPermissions: [RollenSystemRechtEnum.PersonenAnlegen],
    navigate: (menu: MenuBarPage) => menu.navigateToPersonCreation(),
  },
  {
    name: 'Benutzer importieren',
    testId: 'person-import-menu-item',
    route: '/admin/personen/import',
    requiredPermissions: [RollenSystemRechtEnum.ImportDurchfuehren],
    navigate: (menu: MenuBarPage) => menu.navigateToPersonImport(),
  },
  {
    name: 'Landesbedienstete suchen und hinzufügen',
    testId: 'person-search-menu-item',
    route: '/admin/limited/personen/search',
    requiredPermissions: [RollenSystemRechtEnum.LandesbediensteteSuchenUndHinzufuegen],
    navigate: (menu: MenuBarPage) => menu.navigateToLandesbedienstetenSuchenUndHinzufuegen(),
  },
  {
    name: 'Andere Person neu anlegen',
    testId: 'person-add-menu-item',
    route: '/admin/limited/personen/new',
    requiredPermissions: [RollenSystemRechtEnum.EingeschraenktNeueBenutzerErstellen],
    navigate: (menu: MenuBarPage) => menu.navigateToPersonAdd(),
  },
  {
    name: 'Alle Klassen anzeigen',
    testId: 'klasse-management-menu-item',
    route: '/admin/klassen',
    requiredPermissions: [RollenSystemRechtEnum.KlassenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToKlasseManagement(),
  },
  {
    name: 'Neue Klasse anlegen',
    testId: 'klasse-creation-menu-item',
    route: '/admin/klassen/new',
    requiredPermissions: [RollenSystemRechtEnum.KlassenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToKlasseCreation(),
  },
  {
    name: 'Alle Rollen anzeigen',
    testId: 'rolle-management-menu-item',
    route: '/admin/rollen',
    requiredPermissions: [RollenSystemRechtEnum.RollenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToRolleManagement(),
  },
  {
    name: 'Neue Rolle anlegen',
    testId: 'rolle-creation-menu-item',
    route: '/admin/rollen/new',
    requiredPermissions: [RollenSystemRechtEnum.RollenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToRolleCreation(),
  },
  {
    name: 'Alle Angebote anzeigen',
    testId: 'angebot-management-menu-item',
    route: '/admin/angebote',
    requiredPermissions: [RollenSystemRechtEnum.AngeboteVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToAngebotManagement(),
  },
  {
    name: 'Schulische Angebote anzeigen',
    testId: 'angebot-display-schulspezifisch-menu-item',
    route: '/admin/angebote/schulspezifisch',
    requiredPermissions: [RollenSystemRechtEnum.RollenErweitern],
    navigate: (menu: MenuBarPage) => menu.navigateToAngebotManagementSchulspezifisch(),
  },
  {
    name: 'Neues Angebot anlegen',
    testId: 'angebot-creation-menu-item',
    route: '/admin/angebote/new',
    requiredPermissions: [RollenSystemRechtEnum.AngeboteVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToAngebotCreation(),
  },
  {
    name: 'Alle Schulen anzeigen',
    testId: 'schule-management-menu-item',
    route: '/admin/schulen',
    requiredPermissions: [RollenSystemRechtEnum.SchulenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToSchuleManagement(),
  },
  {
    name: 'Neue Schule anlegen',
    testId: 'schule-creation-menu-item',
    route: '/admin/schulen/new',
    requiredPermissions: [RollenSystemRechtEnum.SchulenVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToSchuleCreation(),
  },
  {
    name: 'Alle Schulträger anzeigen',
    testId: 'schultraeger-management-menu-item',
    route: '/admin/schultraeger',
    requiredPermissions: [RollenSystemRechtEnum.SchultraegerVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToSchultraegerManagement(),
  },
  {
    name: 'Neuen Schulträger anlegen',
    testId: 'schultraeger-creation-menu-item',
    route: '/admin/schultraeger/new',
    requiredPermissions: [RollenSystemRechtEnum.SchultraegerVerwalten],
    navigate: (menu: MenuBarPage) => menu.navigateToSchultraegerCreation(),
  },
  {
    name: 'Hinweise bearbeiten',
    testId: 'hinweise-edit-menu-item',
    route: '/admin/hinweise/new',
    requiredPermissions: [RollenSystemRechtEnum.SchulportalVerwalten, RollenSystemRechtEnum.HinweiseBearbeiten],
    navigate: (menu: MenuBarPage) => menu.navigateToHinweiseEdit(),
  },
];
