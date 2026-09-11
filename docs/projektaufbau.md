# Projektaufbau: Schulportal Testautomatisierung

## Überblick

Das Projekt ist eine **Playwright-basierte E2E-Testautomatisierung** für das Schulportal Schleswig-Holstein. Es ist in TypeScript geschrieben und folgt dem **Page Object Model (POM)** als zentralem Entwurfsmuster.

---

## Technologie-Stack

| Technologie                          | Zweck                                    |
| ------------------------------------ | ---------------------------------------- |
| [Playwright](https://playwright.dev) | Test-Framework & Browser-Automatisierung |
| TypeScript                           | Programmiersprache                       |
| Node.js                              | Laufzeitumgebung                         |
| ESLint                               | Code-Qualitätsprüfung                    |

---

## Ordnerstruktur im Überblick

```
schulportal-testautomatisierung/
├── base/           → Hilfsfunktionen, API-Clients, Testdaten-Konstanten
├── components/     → Wiederverwendbare UI-Formular-Komponenten
├── pages/          → Page Objects (Seitenmodelle)
├── tests/          → Testfälle (.spec.ts)
├── docs/           → Projektdokumentation
└── playwright.config.ts  → Playwright-Konfiguration
```

---

## 1. `base/` – Hilfsfunktionen & Infrastruktur

Enthält alles, was **quer durch das gesamte Projekt** genutzt wird: API-Clients, Login-Helfer, Testdaten-Konstanten und LDAP-Hilfsfunktionen.

### Ablagekonvention für neue Helper

- Shared-Helper mit fachlichem Bezug werden unter `base/<domain>/` abgelegt (z. B. `base/2fa/`).
- `pages/` enthält nur Page Objects und seitennahe Komponenten, keine domänenübergreifenden Helper.
- Exporte erfolgen über den Domain-Index (z. B. `base/2fa/index.ts`), damit alle Verbraucher denselben Importpfad nutzen.

### Unterordner & wichtige Dateien

| Datei / Ordner                | Beschreibung                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `testHelperUtils.ts`          | Zentrale Login-Funktionen (`login()`, `loginAndNavigateToAdministration()`, `logout()`) |
| `testHelperDeleteTestdata.ts` | API-basiertes Aufräumen von Testdaten nach Testläufen                                   |
| `testHelperLdap.ts`           | LDAP-spezifische Hilfsfunktionen                                                        |
| `organisation.ts`             | Konstanten für Testorganisationen (Schulen, Land SH)                                    |
| `klassen.ts`                  | Konstanten für Testklassen                                                              |
| `rollen.ts`                   | Konstanten für Testrollen                                                               |
| `rollentypen.ts`              | Labels für Rollenarten                                                                  |
| `merkmale.ts`                 | Labels für Rollenmerkmale                                                               |
| `berechtigungen.ts`           | Berechtigungs-Konstanten                                                                |
| `tags.ts`                     | Test-Tags (`@smoke`, `@dev`, `@stage`)                                                  |
| `sp.ts`                       | Service-Provider-Konstanten                                                             |
| `api/`                        | Generierte und manuelle API-Clients (OpenAPI)                                           |
| `2fa/`                        | Verwaltung von 2FA-Credentials (`SharedCredentialManager`)                              |
| `ldap/`                       | LDAP-Fehlertypen                                                                        |
| `utils/generateTestdata.ts`   | Zufällige Testdaten-Generatoren (z. B. `generateRolleName()`)                           |

### Beispiel: Login-Hilfsfunktion

```typescript
// base/testHelperUtils.ts
export async function loginAndNavigateToAdministration(page: Page): Promise<PersonManagementViewPage> {
  const startPage = await login(page);
  return startPage.navigateToAdministration();
}
```

---

## 2. `pages/` – Page Objects

Das **Herzstück des Projekts**. Jede Seite der Anwendung hat ein korrespondierendes **Page Object**, das alle Lokatoren und Aktionen für diese Seite kapselt.

### Aufbau eines Page Objects

Jedes Page Object folgt dem gleichen Schema:

```typescript
export class MeineSeite {
  // 1. Lokatoren (private/readonly)
  private readonly headline: Locator = this.page.getByTestId('meine-headline');

  // 2. Konstruktor
  constructor(protected readonly page: Page) {}

  // 3. Aktionen (public async)
  public async waitForPageLoad(): Promise<MeineSeite> { ... }
  public async klickeButton(): Promise<void> { ... }

  // 4. Assertions (public async, Präfix: check...)
  public async checkSeiteninhalt(): Promise<void> { ... }
}
```

### Lokatoren

Lokatoren werden bevorzugt über **`data-testid`-Attribute** gesetzt:

```typescript
this.page.getByTestId('rolle-management-headline');
this.page.getByTestId('username-input');
```

Nur wenn kein `data-testid` verfügbar ist (z. B. Vuetify-Komponenten), werden CSS-Klassen als Fallback genutzt:

```typescript
this.page.locator('.v-data-table-footer');
```

### Ordnerstruktur `pages/`

```
pages/
├── LoginView.page.ts          → Login-Seite
├── LandingView.page.ts        → Startseite (nicht eingeloggt)
├── StartView.page.ts          → Dashboard (eingeloggt)
├── ProfileView.page.ts        → Profilseite
├── TwoFactorWorkflow.page.ts  → 2FA-Einrichtung
├── FromAnywhere.ts            → Navigation von überall
│
├── components/                → Wiederverwendbare Seitenkomponenten
│   ├── Header.page.ts         → Header mit Logout
│   ├── MenuBar.page.ts        → Navigationsmenü (Adminbereich)
│   ├── DataTable.page.ts      → Tabellen-Komponente
│   ├── FooterDataTable.page.ts → Tabellen-Footer (Paginierung)
│   ├── Alert.ts               → Alert/Snackbar-Meldungen
│   ├── Autocomplete.ts        → Dropdown-/Autocomplete-Felder
│   ├── BefristungsInput.page.ts → Datumseingabe für Befristungen
│   ├── SearchFilter.ts        → Suchfilter-Komponente
│   ├── SearchResultErrorDialog.ts → Fehler-Dialog in der Suche
│   └── service-provider-cards/ → Service-Provider-Karten auf der Startseite
│
└── admin/                     → Adminbereich-Seiten
    ├── AbstractAdmin.page.ts  → Abstrakte Basisklasse (Header + MenuBar)
    ├── personen/              → Personenverwaltung
    ├── rollen/                → Rollenverwaltung
    ├── organisationen/        → Organisationsverwaltung (Schulen, Klassen, Schulträger)
    ├── service-provider/      → Service-Provider-Verwaltung
    └── hinweise/              → Hinweise-Verwaltung
```

### Abstrakte Basisklasse

Alle Adminseiten erben von `AbstractAdminPage` und erhalten dadurch automatisch Zugriff auf **Header** und **MenuBar**:

```typescript
// pages/admin/AbstractAdmin.page.ts
export abstract class AbstractAdminPage {
  protected header: HeaderPage;
  protected menu: MenuBarPage;

  constructor(protected readonly page: Page) {
    this.header = new HeaderPage(page);
    this.menu = new MenuBarPage(page);
  }

  abstract waitForPageLoad(): Promise<AbstractAdminPage>;
}
```

### Detailstruktur `pages/admin/`

#### Personen (`pages/admin/personen/`)

```
personen/
├── PersonManagementView.page.ts      → Personenliste (Übersicht)
├── PersonImportView.page.ts          → Personen-Import
├── creation/
│   ├── PersonCreationView.page.ts    → Formular: Person anlegen
│   └── PersonCreationSuccess.page.ts → Erfolgsmeldung nach Anlage
├── details/
│   ├── PersonDetailsView.page.ts     → Personendetails
│   ├── Zuordnungen.page.ts           → Rollenzuordnungen der Person
│   └── zuordnung-workflows/
│       ├── AddZuordnungWorkflow.page.ts   → Neue Zuordnung hinzufügen
│       ├── BefristungWorkflow.page.ts     → Befristung setzen
│       ├── VersetzenWorkflow.page.ts      → Person versetzen
│       └── BaseWorkflow.page.ts           → Basisklasse für Workflows
├── mehrfachbearbeitung/
│   └── RolleZuordnen.page.ts         → Mehrfachbearbeitung: Rolle zuordnen
└── search/
    ├── LandesbedienstetenSearchForm.page.ts   → Suchformular
    ├── LandesbedienstetenSearchResult.page.ts → Suchergebnis
    ├── LandesbedienstetenHinzufuegen.page.ts  → Hinzufügen-Dialog
    └── LandesbedienstetenSucess.page.ts       → Erfolgsseite
```

#### Rollen (`pages/admin/rollen/`)

```
rollen/
├── RolleManagementView.page.ts    → Rollenliste (Übersicht)
├── RolleCreationView.page.ts      → Formular: Rolle anlegen
├── RolleCreationWorkflow.page.ts  → Workflow-Klasse für Rollenanlage
├── RolleCreationSuccess.page.ts   → Erfolgsmeldung nach Anlage
└── RolleDetailsView.page.ts       → Rollendetails / Bearbeitung
```

#### Organisationen (`pages/admin/organisationen/`)

```
organisationen/
├── schulen/
│   ├── SchuleManagementView.page.ts   → Schulliste
│   ├── SchuleCreationView.page.ts     → Formular: Schule anlegen
│   └── SchuleCreationSuccess.page.ts  → Erfolgsmeldung
├── klassen/
│   ├── KlasseManagementView.page.ts   → Klassenliste
│   ├── KlasseCreationView.page.ts     → Formular: Klasse anlegen
│   ├── KlasseCreationSuccess.page.ts  → Erfolgsmeldung
│   ├── details/                       → Klassendetails
│   └── deletion-workflow/             → Lösch-Workflow
└── schultraeger/
    ├── SchultraegerManagementView.page.ts  → Schulträgerliste
    └── SchultraegerCreationView.page.ts    → Formular: Schulträger anlegen
```

---

## 3. `components/` – Wiederverwendbare Formular-Komponenten

Enthält komplexe UI-Komponenten, die auf **mehreren Seiten** wiederverwendet werden:

| Datei                | Beschreibung                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `RolleForm/index.ts` | Formularfelder für die Rollenanlage (Administrationsebene, Rollenart, Rollenname, Merkmale, Angebote, Systemrechte) |
| `RolleForm/Row.ts`   | Generische Zeile mit Label, Input-Element und optionalem Anzeigewert                                                |

### Beispiel: `RolleForm`

```typescript
// components/RolleForm/index.ts
export class RolleForm {
  public readonly adminstrationsebene: Row<Autocomplete, Locator>;
  public readonly rollenart: Row<Autocomplete, Locator>;
  public readonly rollenname: Row<Locator, Locator>;
  public readonly merkmale: Row<Autocomplete, undefined>;
  // ...
}
```

---

## 4. `tests/` – Testfälle (`.spec.ts`)

Enthält alle eigentlichen **Testfälle**, organisiert nach Fachdomänen. Jede `.spec.ts`-Datei testet einen abgegrenzten Anwendungsfall.

### Struktur `tests/`

```
tests/
├── global-setup.ts              → Wird einmalig vor allen Tests ausgeführt (Login-Sessions anlegen)
├── global-teardown.ts           → Wird einmalig nach allen Tests ausgeführt (Testdaten löschen)
├── Authentifizierung.spec.ts    → Login / Logout
├── ZweiFaktorAuthEinrichten.spec.ts → 2FA-Einrichtung
├── InbetriebnahmePasswortEinrichten.spec.ts → Erstanmeldung
├── LandesbedienstetenSuchenUndHinzufuegen.spec.ts
│
├── helpers/
│   ├── prepareAndLoginUserWithPermissions.ts  → Test-Helfer für Benutzer mit bestimmten Rollen
│   └── createKlassenAndSchuelerForSchulen.ts  → Test-Helfer für Klassenerstellung
│
├── klassen/
│   ├── KlasseAnlegen.spec.ts
│   ├── KlasseBearbeiten.spec.ts
│   ├── KlasseErgebnislisteDurchsuchen.spec.ts
│   └── KlasseLoeschen.spec.ts
│
├── navigation/
│   ├── Navigieren.spec.ts
│   └── menu.test-cases.ts
│
├── personen/
│   ├── Person.spec.ts
│   ├── PersonAnlegen.spec.ts
│   ├── PersonBearbeiten.spec.ts
│   ├── PersonenErgebnislisteDurchsuchen.spec.ts
│   ├── PersonenImportieren.spec.ts
│   ├── PersonenMehrfachbearbeitung.spec.ts
│   ├── PersonenRolleZuordnenMehrfachbearbeitung.spec.ts
│   ├── PersonKlassenFilter.spec.ts
│   ├── PersonLoeschen.spec.ts
│   ├── PersonSperren.spec.ts
│   ├── PasswortZuruecksetzen.spec.ts
│   ├── SchuelerVersetzen.spec.ts
│   ├── SchulzuordnungBearbeiten.spec.ts
│   └── SchulzuordnungHinzufuegen.spec.ts
│
├── rollen/
│   ├── RolleAnlegen.spec.ts
│   ├── RolleAnlegen.data.ts     → Testdaten für Rollenanlage
│   ├── RolleBearbeiten.spec.ts
│   ├── RolleErgebnislisteDurchsuchen.spec.ts
│   └── RolleLoeschen.spec.ts
│
├── schulen/
│   ├── SchuleAnlegen.spec.ts
│   └── SchuleErgebnislisteDurchsuchen.spec.ts
│
├── profile/
│
└── start/
    ├── ServiceProviderAufStartseite.spec.ts
    ├── ServiceProviderAufStartseite.data.ts
    └── NewsboxAufStartseite.spec.ts
```

### Aufbau einer `.spec.ts`-Datei

```typescript
test.describe('Testfälle für die Rollenanlage', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Einloggen, zur Zielseite navigieren
    rolleCreationPage = await setupAndGoToRolleCreationPage(page);
  });

  test('Rolle anlegen und Zusammenfassung prüfen', async () => {
    // Arrange: Testdaten vorbereiten
    const params = { ...baseParams, name: generateRolleName() };

    // Act: Aktion ausführen (über Page Object)
    const successPage = await rolleCreationPage.createRolle(params);

    // Assert: Ergebnis prüfen (über Page Object)
    await successPage.checkSuccessPage(params);
  });
});
```

---

## 5. Zusammenspiel der Schichten

```
┌──────────────────────────────────────────────────────┐
│                  .spec.ts (Testfall)                 │
│  - Definiert WHAT wird getestet                      │
│  - Nutzt Page Objects für Aktionen und Assertions    │
│  - Nutzt base/ für Login, Konstanten, API-Calls      │
└─────────────────────┬────────────────────────────────┘
                      │ ruft auf
┌─────────────────────▼────────────────────────────────┐
│              Page Object (.page.ts)                  │
│  - Definiert HOW mit der Seite interagiert wird      │
│  - Kapselt Lokatoren (data-testid, Locator)          │
│  - Stellt Aktionen (click, fill, navigate) bereit    │
│  - Stellt Assertions (expect, check...) bereit       │
│  - Gibt andere Page Objects zurück (Navigations-Chain)│
└─────────────────────┬────────────────────────────────┘
                      │ nutzt
┌─────────────────────▼────────────────────────────────┐
│          Shared Components & base/                   │
│  - DataTable, MenuBar, Header, Alert, Autocomplete   │
│  - API-Clients (personApi, rolleApi, ...)            │
│  - Konstanten (organisation.ts, rollen.ts, ...)      │
│  - Test-Helfer (testHelperUtils.ts)                  │
└──────────────────────────────────────────────────────┘
```

---

## 6. Navigations-Chaining (Fluent Interface)

Page Objects geben beim Navigieren das nächste Page Object zurück. Das ermöglicht eine klare, lesbare Kette:

```typescript
const startPage: StartViewPage = await loginPage.login(user, pass);
const adminPage: PersonManagementViewPage = await startPage.navigateToAdministration();
const rolleManagement: RolleManagementViewPage = await adminPage.menu.navigateToRolleManagement();
await rolleManagement.checkManagementPage();
```

---

## 7. Playwright-Konfiguration (`playwright.config.ts`)

| Einstellung      | Wert                                  |
| ---------------- | ------------------------------------- |
| Testverzeichnis  | `./tests`                             |
| Timeout pro Test | 90 Sekunden                           |
| Parallele Worker | 4                                     |
| Retries (CI)     | 2                                     |
| Sprache          | `de-DE`                               |
| Screenshot       | Nur bei Fehler                        |
| Tracing          | Beim ersten Retry                     |
| Umgebung         | via `FRONTEND_URL` und `.env`-Dateien |

---

## 8. Test-Tags

Tags steuern, welche Tests in welcher Umgebung ausgeführt werden:

| Tag      | Bedeutung                                                 |
| -------- | --------------------------------------------------------- |
| `@smoke` | Grundlegende Funktionstests (laufen auf allen Umgebungen) |
| `@dev`   | Tests nur für die Entwicklungsumgebung                    |
| `@stage` | Tests für die Staging-Umgebung                            |

---

## 9. API-Schicht (`base/api/`)

Neben der UI-Automatisierung gibt es eine direkte **API-Schicht** für schnelle Testdaten-Vorbereitung und -Bereinigung:

| Datei                   | Beschreibung                                             |
| ----------------------- | -------------------------------------------------------- |
| `personApi.ts`          | Personen anlegen, Login-Seite aufrufen                   |
| `rolleApi.ts`           | Rollen per API anlegen/löschen                           |
| `organisationApi.ts`    | Organisations-IDs abfragen                               |
| `serviceProviderApi.ts` | Service-Provider per API verwalten                       |
| `baseApi.ts`            | Basis-Funktionen (z. B. `waitForAPIResponse`)            |
| `generated/`            | Automatisch aus OpenAPI-Spezifikation generierte Clients |
