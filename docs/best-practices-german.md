# TLDR

- Code soll TypeScript Best Practices folgen
- Frontend-Views werden als Pages abgebildet
- Funktionslogik (Actions und Assertions) als Methoden in Pages
- Navigation läuft über Pages und die `waitForPageLoad()`-Funktion wird aufgerufen
- Testlogik (inkl. Aufruf der Page-Methoden) in Tests
- Lokatoren werden in Pages gekapselt und bevorzugt methodenlokal verwendet. Tests greifen ausschließlich auf Page-Methoden zu
- API-Funktionen werden mit Hilfe einer generierten API und Playwright-Fetch-Wrapper implementiert
- Die API muss bei jeder Aktualisierung im Backend auch in Playwright aktualisiert werden
- Um Daten via API anzulegen, muss bis ins Portal navigiert werden, damit gegebenenfalls 2FA ausgeführt werden kann.

# Pages

Jede View im Frontend (schulportal-client) wird als Page in Playwright abgebildet.

Pages beinhalten drei Sektionen: Lokatoren, Actions und Assertions. Lokatoren dienen der Auffindbarkeit von Elementen in der Anwendung. Actions sind die Methoden zur Funktionslogik der Frontend-Views. Assertions sind die Überprüfungen (expects). Assertions beginnen mit dem Präfix "assert", bspw. `assertPersonalData()`.

## Lokatoren

Lokatoren sollen nur innerhalb der Page benutzt werden. Die Tests dürfen niemals direkt auf Page-Lokatoren zugreifen, sondern nur auf Page-Methoden. Lokatoren werden bevorzugt lokal in der jeweiligen Methode erzeugt. Dadurch entfällt die Notwendigkeit von Klassenfeldern bei einmalig genutzten Lokatoren und die Kapselung bleibt erhalten. Methodenübergreifende Lokatoren werden global definiert.

Die Namen der Locator-Variablen orientieren sich an den Benennungen der Test-Ids im Frontend.

## Actions

Methoden, die in Tests verwendet werden, müssen public sein. Methoden, die nur intern genutzt werden, sollen private sein. Die Tests sollen nur so wenig Parameter wie möglich (aber so viele wie nötig) an die Page-Funktionen übergeben.

Jede Page besitzt eine Methode waitForPageLoad(), die mindestens eine eindeutige Headline (oder ähnliches Element) der Seite überprüft und die Page anschließend zurückgibt.

Innerhalb der Pages beschreibt die Bezeichnung 'Workflow' einen fachlichen Ablauf, der im Frontend durchgeführt wird und in Playwright aus mehreren Einheiten (z.B. Actions, Pages, etc.) zusammengesetzt wird.

## Assertions

- Web-first Assertions bevorzugen: `await expect(locator).toBeVisible()` statt separatem `waitFor(...)` plus zusätzlichem `expect`.
- `expect.soft()` für nicht-kritische Mehrfachprüfungen nutzen.
- `toPass()` für polling-basierte Verifikation verwenden, statt manueller Retry-Loops.

Zusammengehörige Assertions sollen in einer gemeinsamen Methode zusammengefasst werden, sofern kein fachlicher Grund besteht, sie einzeln aufzurufen. Nur wenn eine Assertion separat und gezielt aufgerufen werden soll (z.B. weil sie einen eigenen Parameter benötigt wie `assertHeadline(schulname: string)`), wird sie als eigenständige Methode ausgelagert. Solche spezifischen Assertions können dann innerhalb einer übergeordneten Assertion-Methode aufgerufen werden.

## Test-Ids

Jedes sinnvoll mit Playwright zu testende HTML-Element im Frontend bekommt eine Test-Id über das HTML-Attribut data-testid. Dieses Attribut kann mit der Playwright-Funktion .getByTestId() ausgelesen werden. Vorzugsweise erfolgt die Benennung im Frontend in kebab-case nach dem Schema <Funktion>-<Element>, bspw. `data-testid="username-input"`.

Test-Ids müssen pro Seite eindeutig sein, damit die Tests eindeutig auf die Elemente zugreifen können. Das betrifft insbesondere programmatisch generierte Elemente, wie z.B. die Service-Provider-Cards. Bei solchen Elementen muss die Test-Id einen Affix bekommen, der sie unique macht, bspw. die Id des Models: `service-provider-card-7e6f10d7-b6e5-4686-9011-182634c03bf3`.

### Keine Id im Frontend vorhanden?

Sollte ein zu testendes Element keine Test-Id haben, muss im Frontend nachgearbeitet werden. Am sinnvollsten ist in diesem Fall ein Branch im schulportal-client mit der gleichen Nummer des Playwright-Tickets. Dadurch stellen wir sicher, dass die Tests immer konsistent durchlaufen.

### Ausnahmen wegen Vuetify

In einigen Fällen kann es vorkommen, dass ein konkretes Element (z.B. ein Inputfeld) keine Test-Id hat, obwohl im Frontend eine Test-Id vergeben wurde. Dann liegt es an Vuetify, der UI-Komponenten-Bibliothek, die im Frontend eingesetzt wird. Für Vuetify-Komponenten können wir (nach aktuellem Stand) nur auf oberster Ebene eine Test-Id vergeben. Wenn ein Element auf einer tieferen Ebene in Playwright lokalisiert werden muss, ist dies über Chaining der Playwright-Methoden möglich.

Beispiel: Das Inputfeld im Search Filter soll lokalisiert werden, der Search Filter ist eine Vuetify-Komponente mit Test-Id. Chaining wie folgt: `this.page.getByTestId('search-filter-input').locator('input')`.

# Testsuiten

Alle Testsuiten (Dateien) sind Use-Case bezogen. Eine Testsuite beinhaltet **nur einen** Use-Case. Ein Use-Case kann aus mehreren Testfällen bestehen.

Die Tests beinhalten keine Funktionslogik. Logik, Aktionen und Überprüfungen finden nur in den Pages statt.

Ein Top-Level describe-Block ist nicht nötig, wenn aus dem Dateinamen klar wird, was im Test inbegriffen ist.

Describe-Block-Namen sollen kurz und fachlich sein, z.B. `Testfälle für die Anlage von Personen`. Umgebungsinformationen wie `Umgebung`, `URL` oder `process.env.*` gehören nicht in den Describe-Namen, da diese Informationen bereits in Playwright-Reports und der Konfiguration vorhanden sind.

## Parallele Sicherheit

Module-Level mutable State (z.B. `let usernames: string[] = []`) ist bei parallelen Test-Workern fehleranfällig. Deshalb gilt:

- Variablen nur test-lokal (`test`) oder suite-lokal (`test.describe`) verwenden.
- Keine globalen Sammel-Arrays/Objekte für erstellte Daten nutzen.
- Für wiederverwendbares Setup/Teardown mittel- bis langfristig Playwright Custom Fixtures (`test.extend`) einsetzen.

## test.step() Richtlinien

- `test.step()` nur für fachliche Hauptphasen einsetzen (Setup, Aktion, Verifikation).
- Step-Namen kurz halten, auf Deutsch, und das Was beschreiben.
- Rückgabewerte aus Steps nutzen, um Daten klar an Folgeschritte zu übergeben.

# Namensgebung

| Element             | Empfohlener Case     | Endung   | Beispiel                 | Besonderheit                                   |
| ------------------- | -------------------- | -------- | ------------------------ | ---------------------------------------------- |
| Pages               | PascalCase           | .page.ts | PersonImportView.page.ts | Übernahme des Dateinamens der View im Frontend |
| Testsuiten          | PascalCase           | .spec.ts | RolleAnlegen.spec.ts     | Testsuiten sind immer Use Case bezogen         |
| Helper/Utils        | camelCase            | .ts      | generateTestdata.ts      |
| Variablen           | camelCase            | -        | organisationAutocomplete |
| Konstanten          | SCREAMING_SNAKE_CASE | -        | FRONTEND_URL             |
| Methoden            | camelCase            | -        | waitForPageLoad()        |
| Test Ids (Frontend) | kebab-case           | -        | person-creation-form     |

# Coding-Regeln

Vor dem Pushen _immer_ Linter, Build und Tests ausführen

```
npm run lint

npm run build

npm run coverage
```

# Tags

Mit Tags können wir die Ausführung der Tests gezielt steuern. So können beispielsweise Tests nur auf Stage oder nur auf Dev ausgeführt, je nachdem welche Drittsysteme oder andere Gegebenheiten berücksichtigt werden müssen. Die folgende Matrix zeigt, welche Tags vorhanden sind und welche Besonderheiten sie abdecken.

| Tag         | Grundfunktionen | LDAP | Drittsysteme | Login |
| ----------- | --------------- | ---- | ------------ | ----- |
| dev         | x               | x    |              |       |
| stage       | x               |      | x            |       |
| stage-smoke |                 |      |              | x     |

Tags werden immer alphabetisch sortiert angegeben: `{ tag: [DEV, STAGE] }`, nicht `{ tag: [STAGE, DEV] }`. Konsistente Reihenfolge erleichtert Suche und Review.

# Aufräumen (Cleanup)

Bevorzugter Projektstandard ist das Global Teardown, das alle Testdaten mit dem Prefix `TAuto` nach dem Testlauf aufräumt. Tests müssen daher keine eigenen Cleanup-Schritte für erstellte Entitäten implementieren.

Das Löschen von Testdaten in einem `afterEach` Hook ist nicht nötig, da das Global Teardown diese Aufgabe übernimmt.

Langfristig ist die Migration auf Playwright Custom Fixtures mit automatischem Teardown pro Test der bevorzugte Weg.

# API

Für die Erhaltung der Stabilität und Wartbarkeit der automatisierten Tests wurden auch die API-Calls in eigenen Klassen definiert. Es gibt einmal die von uns erstellten API-Klassen, bspw. base/api/personApi.ts (selbst vergebener Name, Modelname im Singular), in denen wir die Methoden zur Verwendung in Pages und Tests definieren. Dort benutzen wir die zugehörige generierte API-Klasse, bspw. base/api/generated/personenApi.ts (Name aus der API vom Backend vergeben). Diese wird aus dem Swagger Doc der Backend-API generiert.

Vor dem Refactoring gab es Helper-Klassen, die sowohl Funktionslogik, als auch API-Logik beinhaltet haben. Diese wurden durch das Refactoring getrennt, so dass die API-Klassen nur noch API-Logik beinhalten.

Bei jeder Änderung der API im Backend-Repo muss die API auch in Playwright neu generiert werden. Der Befehl dazu lautet im Playwright-Repo `npm run generate-api`.

# Github Workflows

Es gibt einen Github Workflow (run-playwright.yml), der sich um die Ausführung kümmert und Parameter für Umgebung, Browser und Testumfang (Tags) annimmt. Damit ist es möglich, jede mögliche Kombination von Parametern manuell und geplant auszuführen.

Die weiteren Github Workflows rufen run-playwright.yml parametrisiert auf.

Siehe docs/actions-github.md.

# Beispiele

## Page

```typescript
import ....

export class LoginViewPage {
  // Alle global in der Page verwendeten Variablen (z.B. wenn Variablen in mehreren Methoden benötigt werden) werden hier auf oberster Ebene definiert.
  // Alle Variablen, die nur lokal in den Methoden verwendet werden, werden auch nur lokal definiert.
  /* add global locators here */

  // protected readonly sorgt dafür, dass this.page verfügbar ist
  constructor(protected readonly page: Page) {}

  // Wir trennen zwischen Actions und Assertions
  // Actions sind alle Funktionen, die eine Page bereitstellt
  /* actions */
  // Jede Page benötigt eine Methode waitForPageLoad(), die public ist und in Tests verwendet werden kann
  // Indem this zurückgegeben wird, können wir den aufrufenden Code etwas verschlanken
  public async waitForPageLoad(): Promise<LoginViewPage> {
    await expect(this.page.getByTestId('login-page-title')).toHaveText('Anmeldung');
    return this;
  }

  // Alle Methoden, die nicht in Tests verwendet werden müssen, sind als private deklariert und werden nur innerhalb der Page aufgerufen
  private generateSecurePassword(): string {
    return generator.generate({ length: 8, numbers: true }) + '1Aa!';
  }

  // Public Methoden werden in Tests verwendet und haben meistens einen Rückgabewert
  // Der Rückgabewert kann in vielen Fällen eine weitere Page sein
  public async login(
    username: string = process.env.USER as string,
    password: string = process.env.PW as string
  ): Promise<StartViewPage> {
    // Wenn Lokatoren lokal mehrfach benutzt werden, sollten sie als Variable deklariert werden
    const usernameInput: Locator = this.page.getByTestId('username-input');
    const passwordInput: Locator = this.page.getByTestId('password-input');
    const loginButton: Locator = this.page.getByTestId('login-button');

    // Lokatoren, die nur einmalig benutzt werden, können direkt aufgerufen werden
    await expect(this.page.getByTestId('login-page-title')).toHaveText('Anmeldung');
    await expect(this.page.getByTestId('login-prompt-text')).toHaveText('Bitte geben Sie Ihre persönlichen Zugangsdaten ein.');

    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(username);

    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);

    await expect(loginButton).toBeVisible();
    await loginButton.click();
    return new StartViewPage(this.page);
  }

  // Assertions sind alle Methoden, die Überprüfungen von Page-Elementen oder -Verhalten dienen
  /* assertions */
  public async loginFailedWithWrongCredentials(): Promise<void> {
    const inputErrorSpan: Locator = this.page.getByTestId('input-error-message');

    await expect(inputErrorSpan).toBeVisible();
    await expect(inputErrorSpan).toHaveText('Ungültiger Benutzername oder Passwort.');
  }

  public async loginFailedWithLockedUser(): Promise<void> {
    const loginErrorSpan: Locator = this.page.getByTestId('login-error-message');

    await expect(loginErrorSpan).toBeVisible();
    await expect(loginErrorSpan).toHaveText('Ihr Benutzerkonto ist gesperrt. Bitte wenden Sie sich an Ihre schulischen Administratorinnen und Administratoren.');
  }
}
```

## Test

```typescript
import ....

// Globale Variablen für alle Tests in diesem Spec-File
const ADMIN: string | undefined = process.env.USER;
const PASSWORD: string | undefined = process.env.PW;

// Mit test.describe() werden einzelne Testsuites definiert.
// Ein Spec-File behandelt in unserem Projekt einen konkreten Anwendungsfall des Schulportals und kann mehrere Testsuites enthalten
test.describe('Testfälle für den Login', () => {
  // Lokale Variablen des Testfalls
  let landingPage: LandingViewPage;
  let loginPage: LoginViewPage;
  let header: HeaderPage;

  // Der beforeEach Hook einer Testsuite läuft vor jedem einzelnen Test und kann benötigte Ausgangssituationen herstellen
  // Z.B. für den Test benötigte Daten anlegen oder den Login durchführen etc.
  test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
    loginPage = await freshLoginPage(page);
    header = new HeaderPage(page);
  });

  // Ein konkreter Testfall wird mit test() ausgeführt
  // Im Idealfall sind die einzelnen Tests sehr schlank, da sie nur die einzelnen Schritte der Funktionslogik aus den Pages aufrufen
  // Hier werden bspw. nur 2 Methoden aufgerufen, loginPage.login() und startPage.assertServiceProvidersAreLoaded()
  test('Erfolgreicher Login', async () => {
    // In diesem Fall wird die StartPage bereits durch den Login zurückgegeben und muss deshalb nicht erneut beim waitForPageLoad gespeichert werden
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();
    await startPage.assertServiceProvidersAreLoaded();
  });

  // Tipp: Zum Debugging kann test.only() genutzt werden, um nur diesen Test auszuführen. test.only() darf nicht committed werden.
  test('Fehlgeschlagener Login mit falschen Daten', async () => {
    await loginPage.login('anakin', 'obi-wan');
    await loginPage.loginFailedWithWrongCredentials();
  });

  // Tipp: Sollte ein einzelner Test zu Problemen führen, kann er mit test.skip() geskippt werden
  // Das darf aber maximal eine Übergangslösung sein und ist eher zu vermeiden
  test.skip('Fehlgeschlagener Login mit gesperrtem Benutzer', async ({ page }: { page: Page }) => {
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();

    // Der gesperrte Nutzer wird nur in diesem Testfall benötigt und deshalb lokal angelegt
    /* create locked user */
    const testSchuleId: string = await getOrganisationId(page, testschuleName)
    const rolleName: string = await generateRolleName();
    const rolleId: string = await createRolle(page, 'LEHR', testSchuleId, rolleName);
    const userinfo: UserInfo = await createPerson(page, testSchuleId, rolleId)
    await lockPerson(page, userinfo.personId, testSchuleId);

    await header.logout();
    loginPage = await freshLoginPage(page);
    await loginPage.login(userinfo.username, userinfo.password);
    await loginPage.loginFailedWithLockedUser();
  });

  test('Erfolgreicher Logout', async () => {
    const startPage: StartViewPage = await loginPage.login(ADMIN, PASSWORD);
    await startPage.waitForPageLoad();

    await header.logout();
    await landingPage.waitForPageLoad();
  });
});
```