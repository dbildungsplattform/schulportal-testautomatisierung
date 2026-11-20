# Testdaten

Diese Übersicht beschreibt, wie in diesem Projekt Testdaten für Playwright-Tests erstellt, verwendet und wieder aufgeräumt werden.

## Grundprinzipien

- **Testdaten werden ausschließlich über die Backend-API angelegt**, nicht über die UI. Damit bleiben Tests schnell, stabil und unabhängig von UI-Änderungen.
- **UI wird nur für das tatsächliche Testszenario verwendet** (z. B. Login, Navigation, das zu prüfende Verhalten).
- **Testdaten werden im `beforeEach` erstellt – nicht mitten im eigentlichen Testablauf.** Der Testkörper enthält nur das zu prüfende Verhalten und die Assertions.
- **Das globale Teardown räumt die Testdaten nach dem Testlauf auf** (siehe Abschnitt „Aufräumen").
- **Generierte Namen tragen den Präfix `TAuto-PW-…`**, damit Testdaten erkennbar sind. Für das Aufräumen ist der Präfix nicht maßgeblich – das globale Teardown löscht anhand der aufgezeichneten IDs.
- **Eindeutigkeit:** Vornamen, Nachnamen, Rollennamen, Klassen- und Schulnamen werden mit Faker und Zufallssuffix generiert, um Kollisionen bei parallelen Tests zu vermeiden.

## Verzeichnisse und Bausteine

| Pfad                                                                                                                                                                                                      | Zweck                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [base/api/](../base/api)                                                                                                                                                                                  | Wrapper um die generierten OpenAPI-Clients (Personen, Organisationen, Rollen, Service-Provider, Personenkontext, 2FA). Hier liegen die High-Level-Funktionen zum Anlegen/Löschen von Testdaten. |
| [base/api/generated/](../base/api/generated)                                                                                                                                                              | Aus `openapispec.json` per `openapi-generator` erzeugter TypeScript-Client. **Nicht manuell editieren.**                                                                                        |
| [base/api/playwrightFetchAdapter.ts](../base/api/playwrightFetchAdapter.ts)                                                                                                                               | Adapter, damit der OpenAPI-Client `page.request.fetch` von Playwright verwendet (nutzt damit den Login-Cookie der Page).                                                                        |
| [base/utils/generateTestdata.ts](../base/utils/generateTestdata.ts)                                                                                                                                       | Generatoren für Vorname, Nachname, Rollenname, Klassenname, Schulname, KoPers-Nr, Dienststellen-Nr, Datumswerte.                                                                                |
| [base/testHelperDeleteTestdata.ts](../base/testHelperDeleteTestdata.ts)                                                                                                                                   | Hilfsfunktionen zum Löschen von Personen/Rollen/Klassen über die API.                                                                                                                           |
| [base/organisation.ts](../base/organisation.ts), [base/rollen.ts](../base/rollen.ts), [base/sp.ts](../base/sp.ts), [base/rollentypen.ts](../base/rollentypen.ts), [base/merkmale.ts](../base/merkmale.ts) | Konstanten für vorhandene Schulen, Standardrollen, Service-Provider, Rollentypen und Merkmale.                                                                                                  |
| [tests/helpers/](../tests/helpers)                                                                                                                                                                        | Wiederverwendbare High-Level-Setups (z. B. [prepareAndLoginUserWithPermissions.ts](../tests/helpers/prepareAndLoginUserWithPermissions.ts)).                                                    |

## API-Wrapper im Überblick

Alle Wrapper folgen demselben Muster: Sie konstruieren den passenden OpenAPI-Client mit dem Playwright-Fetch-Adapter, rufen den Endpunkt auf, prüfen den HTTP-Status mit `expect(...).toBe(2xx)` und liefern eine schlanke Datenstruktur zurück.

### Personen ([base/api/personApi.ts](../base/api/personApi.ts))

- `createPerson(page, organisationId, rolleId, familienname?, vorname?, koPersNr?, klasseId?, merkmalNames?)` – legt eine Person mit einem oder mehreren Personenkontexten an. Liefert `UserInfo` (`username`, `password`, `personId`, `rolleId`, `organisationId`, `vorname`, `nachname`, `kopersnummer`).
- `createPersonWithPersonenkontext(page, organisationName, rolleName, …)` – komfortabel: löst Organisation und Rolle per Name auf und legt die Person an.
- `createRolleAndPersonWithPersonenkontext(page, organisationName, rollenArt, familienname, vorname, idSPs, rolleName, koPersNr?, klasseId?, merkmale?)` – legt **eine eigene Rolle** + Person an (Standardweg, wenn ein Test isolierte Rechte benötigt).
- `createTeacherAndLogin(page)` – Convenience: Lehrkraft mit Email/Kalender/Adressbuch anlegen und direkt einloggen.
- `addOrganisationenToPerson(page, personId, organisationIds[], rolleId)` – fügt einer Person eine oder mehrere Organisationen mit derselben Rolle hinzu.
- `setTimeLimitPersonenkontext(...)`, `lockPerson(...)`, `setInbetriebnahmePasswort(...)`, `removeAllPersonenkontexte(...)`, `getEmailByPersonId(...)`, `getPersonId(...)`, `deletePerson(...)`.

### Organisationen / Klassen ([base/api/organisationApi.ts](../base/api/organisationApi.ts))

- `createSchule(page, name, kennung?)` – legt eine Schule unterhalb von „Öffentliche Schulen Land SH" an. **Standardweg für neue Tests:** Schulen werden pro Test mit `createSchule(page, generateSchulname(), generateDienststellenNr())` frisch angelegt. Die statischen Konstanten `testschuleName` und `ersatzTestschuleName` aus [base/organisation.ts](../base/organisation.ts) dürfen für neue Tests **nicht** mehr verwendet werden; bei Refactorings sind sie durch frisch erzeugte Schulen zu ersetzen.
- `getOrganisationId(page, name)` – Schul-/Organisations-ID per Name auflösen (nur für Schulen sinnvoll, die nicht selbst angelegt wurden, z. B. `landSH`).
- `createOrganisation(page, params)` – generischer Anker für individuelle Organisationen.
- `createKlasse(page, schuleId, name)` – legt eine Klasse zu einer Schule an.
- `getKlasseId(page, name)`, `deleteKlasse(page, klasseId)`.

### Rollen ([base/api/rolleApi.ts](../base/api/rolleApi.ts))

- `createRolle(page, rollenArt, organisationId, rolleName, merkmale?)` – legt eine neue Rolle an.
- `addServiceProvidersToRolle(page, rolleId, serviceProviderIds)` – ordnet Service-Provider zu (Email, Kalender, Adressbuch, Schulportal-Administration usw.).
- `getRolleId(page, name)`, `deleteRolle(page, rolleId)`.

### Service-Provider ([base/api/serviceProviderApi.ts](../base/api/serviceProviderApi.ts))

- `getServiceProviderId(page, name, schulstrukturknotenOfRolle, rollenArt)` und `getServiceProviderIds(page, names[])` – IDs für `email`, `kalender`, `adressbuch`, `Schulportal-Administration` etc. (Konstanten in [base/sp.ts](../base/sp.ts)).

## Run isolation

[playwright.config.ts](../playwright.config.ts) calls `initializeTestRunId()` from [testDataLedger.ts](../base/utils/testDataLedger.ts) before setup or spec loading. Setup, workers, and teardown share the same `TEST_RUN_ID` through the process environment.

- Local runs generate a UUID once when `TEST_RUN_ID` is unset.
- CI supplies an ID containing the repository, workflow run, rerun attempt, job, browser, tag, and matrix shard.
- Explicit IDs must contain only ASCII letters, digits, underscores, and hyphens. Never reuse an ID across independent runs.

Every created entity is recorded by ID in `.test-data-ledger/<TEST_RUN_ID>/<process-id>.jsonl` (one file per process, because setup and workers run in separate processes):

- **API helpers:** [playwrightFetchAdapter.ts](../base/api/playwrightFetchAdapter.ts) records successful `POST` requests to `/api/personenkontext-workflow` (Personen), `/api/organisationen` (Schulen, Klassen), `/api/rolle`, `/api/provider` (Angebote), and `/api/import/upload` (Importvorgänge), as well as the usernames returned by `GET /api/import/importedUsers` (imported Personen).
- **UI flows:** [FromAnywhere.ts](../pages/FromAnywhere.ts) registers `trackCreatedEntities(page)` on the browser context, which records the same requests when the frontend sends them. All logins go through `FromAnywhere`, so every authenticated page is covered.

Because ownership is tracked by ID, generated names no longer encode the run and are not subject to length limits of the UI or of privacyIDEA. Test data created without one of the endpoints above is not recorded and must be cleaned up by the test itself.

## Generatoren ([base/utils/generateTestdata.ts](../base/utils/generateTestdata.ts))

| Function                                                        | Example output                          |
| --------------------------------------------------------------- | --------------------------------------- |
| `generateVorname()`                                             | `TAuto-PW-VLaraXyzab`                   |
| `generateNachname()`                                            | `TAuto-PW-NMeyerAbcde`                  |
| `generateRolleName()`                                           | `TAuto-PW-R-fluminoQwert`               |
| `generateKlassenname()`                                         | `TAuto-PW-K-fluminorQwert`              |
| `generateSchulname()`                                           | `TAuto-PW-S-fluminorQwert`              |
| `generateAngebotname()`                                         | `TAuto-PW-A-fluminorQwert`              |
| `generateEmailAdress()`                                         | `TAuto-PW-E-Lara@example.orgXyzab`      |
| `generateKopersNr()`                                            | `081512345678`                          |
| `generateDienststellenNr()`                                     | `012345678`                             |
| `generateCurrentDate({ days, months })` / `formatDateDMY(date)` | Date helpers (for example Befristung)   |

## Aufräumen

[Global teardown](../tests/global-teardown.ts) reads the ledger of the current run and deletes exactly the recorded IDs, in the order Personen, Rollen, Angebote (including their Rollenerweiterungen), Klassen, and Schulen. Imported Personen are resolved by their usernames, recorded from the import result or read from a recorded Importvorgang that still exists (the frontend deletes it after the result download). Klassen beneath a recorded Schule are deleted too, including Klassen created implicitly (e.g. by an import). It never searches by name, so it cannot delete another run's data.

IDs that no longer exist (HTTP 404, e.g. deleted by the test itself) count as deleted. Other failed deletions are retried up to three times; afterwards the ledger is kept in `.test-data-ledger/` for inspection. On success the run's ledger is removed. Data of runs that were cancelled before teardown (e.g. a CI timeout) is not cleaned up automatically. New tests should not duplicate this lifecycle with an `afterEach` cleanup.

Ein `afterEach`-Cleanup ist nur bei einer ausdrücklich begründeten Ausnahme erforderlich, wenn Daten noch innerhalb desselben Testlaufs entfernt werden müssen. Dann können die folgenden Hilfsfunktionen verwendet werden:

```ts
let usernames: string[] = [];
let rolleIds: string[] = [];

test.afterEach(async ({ page }) => {
  if (usernames.length > 0) {
    await deletePersonenBySearchStrings(page, usernames);
    usernames = [];
  }
  if (rolleIds.length > 0) {
    await deleteRolleById(rolleIds, page);
    rolleIds = [];
  }
});
```

Hilfsfunktionen in [base/testHelperDeleteTestdata.ts](../base/testHelperDeleteTestdata.ts):

- `deletePersonById(personIds[], page)` / `deletePersonBySearchString(page, search)` / `deletePersonenBySearchStrings(page, search[])`
- `deleteRolleById(rolleIds[], page)` / `deleteRolleByName(rolleNamen[], page)`
- `deleteKlasseByName(klassenNamen[], page)`

Dynamisch angelegte Schulen werden vom globalen Teardown gelöscht. Deshalb werden Schulen für neue Tests mit `createSchule(page, generateSchulname(), generateDienststellenNr())` angelegt; feste Test-Schulen aus [base/organisation.ts](../base/organisation.ts) sind dafür nicht zu verwenden.

## Praxisbeispiele

### Beispiel 1: Lehrkraft mit eigener Rolle anlegen

Aus [tests/personen/PersonBearbeiten.spec.ts](../tests/personen/PersonBearbeiten.spec.ts):

```ts
const userInfoLehrer = await createRolleAndPersonWithPersonenkontext(
  page,
  testschuleName,
  typeLehrer,
  generateNachname(),
  generateVorname(),
  [await getServiceProviderId(page, email)],
  generateRolleName(),
);
usernames.push(userInfoLehrer.username);
rolleIds.push(userInfoLehrer.rolleId);
```

Hier wird eine neue Rolle (`typeLehrer`) mit Service-Provider „email" an `testschuleName` erzeugt und gleich eine Person darauf gesetzt. Für neue Tests ist statt der festen Schule ein dynamisch erzeugter Schulname zu verwenden; die angelegten Daten werden nach dem Lauf durch das globale Teardown entfernt.

### Beispiel 2: Person mit bestehender Rolle und Schule

Aus [tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts](../tests/LandesbedienstetenSuchenUndHinzufuegen.spec.ts):

```ts
const schuladmin: UserInfo = await createPersonWithPersonenkontext(page, testschuleName, schuladminOeffentlichRolle);
```

Nutzt eine **bereits existierende** Rolle und Schule (per Name aufgelöst). Geeignet, wenn keine spezielle Rechte-Konstellation gebraucht wird.

### Beispiel 3: Person mit zweiter Schule

```ts
const primarySchuleId = await getOrganisationId(page, primarySchuleName);
const secondSchuleId = await getOrganisationId(page, secondSchuleName);
const rolleId = await getRolleId(page, rolle);
await addOrganisationenToPerson(page, schuladmin.personId, [primarySchuleId, secondSchuleId], rolleId);
```

### Beispiel 4: User mit konkreten Systemrechten + Login

Über den Helper [tests/helpers/prepareAndLoginUserWithPermissions.ts](../tests/helpers/prepareAndLoginUserWithPermissions.ts):

```ts
await prepareAndLoginUserWithPermissions(page, [
  RollenSystemRechtEnum.PersonenVerwalten,
  RollenSystemRechtEnum.KlassenVerwalten,
]);
```

Der Helper legt Rolle + Person an, vergibt die Rechte sequentiell (optimistic locking!), fügt eine zweite Schule zu, loggt aus, loggt mit dem neuen User ein und führt den initialen Passwortwechsel durch.

## Entscheidungshilfe: Welche Funktion wann?

| Bedarf                                                                   | Empfohlene Funktion                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Person an existierender Rolle/Schule                                     | `createPersonWithPersonenkontext`                                                                             |
| Person + neue, isolierte Rolle (eigene Rechte/Merkmale/Service-Provider) | `createRolleAndPersonWithPersonenkontext`                                                                     |
| Komplette Lehrkraft inkl. Login                                          | `createTeacherAndLogin`                                                                                       |
| Person mit definierten Systemrechten + Login                             | `prepareAndLoginUserWithPermissions`                                                                          |
| Klasse zu einer Schule                                                   | `createKlasse`                                                                                                |
| Mehrere Klassen + Schüler                                                | [tests/helpers/createKlassenAndSchuelerForSchulen.ts](../tests/helpers/createKlassenAndSchuelerForSchulen.ts) |
| Schule (nur in Ausnahmefällen)                                           | `createSchule` / `createOrganisation`                                                                         |

## Wichtige Constraints

- **Schulen können aktuell nicht gelöscht werden** → Test-Schulen aus [base/organisation.ts](../base/organisation.ts) wiederverwenden.
- **Systemrechte für Rollen sequentiell setzen** (Server nutzt optimistic locking auf der Rolle).
- **Befristungs-Pflichtfeld:** Für Rollen mit Merkmal `befristungPflicht` wird in `createPerson` automatisch eine Befristung von 6 Monaten gesetzt.
- **Login mit Test-User:** Nach `createPerson…` muss der Initial-Passwortwechsel durchlaufen werden – dafür gibt es `loginNewUserWithPasswordChange(username, password)` auf der `LoginViewPage`.
- **API nutzt den Page-Cookie:** Aufrufe laufen über [playwrightFetchAdapter.ts](../base/api/playwrightFetchAdapter.ts), die `Page` muss also bereits eingeloggt sein (typisch: `loginAndNavigateToAdministration(page)` als Landesadmin).
