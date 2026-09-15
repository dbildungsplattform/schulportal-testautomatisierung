# Testdaten

Diese Übersicht beschreibt, wie in diesem Projekt Testdaten für Playwright-Tests erstellt, verwendet und wieder aufgeräumt werden.

## Grundprinzipien

- **Testdaten werden ausschließlich über die Backend-API angelegt**, nicht über die UI. Damit bleiben Tests schnell, stabil und unabhängig von UI-Änderungen.
- **UI wird nur für das tatsächliche Testszenario verwendet** (z. B. Login, Navigation, das zu prüfende Verhalten).
- **Testdaten werden im `beforeEach` erstellt – nicht mitten im eigentlichen Testablauf.** Der Testkörper enthält nur das zu prüfende Verhalten und die Assertions.
- **Jeder Test räumt seine Daten in `afterEach` selbst auf** (siehe Abschnitt „Aufräumen").
- **Generierte Namen tragen den Präfix `TAuto-PW-…`**, damit Testdaten erkennbar und im Notfall zentral aufräumbar sind.
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

- `getServiceProviderId(page, name)` und `getServiceProviderIds(page, names[])` – IDs für `email`, `kalender`, `adressbuch`, `Schulportal-Administration` etc. (Konstanten in [base/sp.ts](../base/sp.ts)).

## Generatoren ([base/utils/generateTestdata.ts](../base/utils/generateTestdata.ts))

| Funktion                                                        | Beispiel-Output                        |
| --------------------------------------------------------------- | -------------------------------------- |
| `generateVorname()`                                             | `TAuto-PW-V-Lara_xYz`                  |
| `generateNachname()`                                            | `TAuto-PW-N-Müller_aBc`                |
| `generateRolleName()`                                           | `TAuto-PW-R-flumino_qwe`               |
| `generateKlassenname()`                                         | `TAuto-PW-K-12a flumino_qwe`           |
| `generateSchulname()`                                           | `TAuto-PW-S-flumino_qwe`               |
| `generateKopersNr()`                                            | `081512345678`                         |
| `generateDienststellenNr()`                                     | `012345678`                            |
| `generateCurrentDate({ days, months })` / `formatDateDMY(date)` | Datums-Helfer (z. B. für Befristungen) |

Der Präfix `TAuto-PW-` ist Konvention und wird an mehreren Stellen verwendet (Suche, globales Aufräumen).

## Aufräumen

Tests müssen ihre Daten selbst löschen. Übliche Patterns:

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

Schulen werden aktuell **nicht** gelöscht – stattdessen die festen Test-Schulen aus [base/organisation.ts](../base/organisation.ts) wiederverwenden (z. B. `testschuleName`, `testschule665Name`, `ersatzTestschuleName`).

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

Hier wird eine neue Rolle (`typeLehrer`) mit Service-Provider „email" an `testschuleName` erzeugt und gleich eine Person darauf gesetzt. `username`/`rolleId` werden für `afterEach` gemerkt.

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
