---
name: create-playwright-test
description: "Erstellt einen neuen Playwright-Test (.spec.ts) für das Schulportal. Berücksichtigt Projektkonventionen, Page-Objects, API-basierte Testdatenerstellung und bekannte Backend-Constraints. Use when asked to create a new test, write a test, implement a test case, neuen Test schreiben, Testfall implementieren."
argument-hint: "Beschreibung des Testfalls oder Pfad zur CSV mit Testschritten"
---

# Create Playwright Test

Erstellt einen neuen Playwright-Test für das Schulportal nach den Projektkonventionen.

## Use When
- Ein neuer Playwright-Test (.spec.ts) geschrieben werden soll
- Testschritte aus einer CSV- oder Ticket-Beschreibung umgesetzt werden sollen

## Do Not Use When
- Ein bestehender Test repariert werden soll → verwende [`run-and-fix-test`](../run-and-fix-test/SKILL.md)
- Nur ein Page-Object erstellt werden soll → verwende [`create-page-object`](../create-page-object/SKILL.md)

## See Also
- [`run-and-fix-test`][def] — Test ausführen und iterativ reparieren
- [`create-page-object`](../create-page-object/SKILL.md) — Neues Page-Object erstellen
- [`extend-page-object`](../extend-page-object/SKILL.md) — Bestehendes Page-Object erweitern
- [testdaten.md](../../../docs/testdaten.md) — Übersicht aller API-Wrapper, Generatoren und Cleanup-Helfer für Testdaten
- [best-practices.md](../../../docs/best-practices.md) — Coding-Konventionen
- [structure.md](../../../docs/structure.md) — Projektstruktur
- [tags.md](../../../docs/tags.md) — Tag-Konventionen

---

## Projektkonventionen (Kurzfassung)

Ausführlich in `docs/best-practices.md` und `docs/structure.md` beschrieben. Hier die wichtigsten Regeln:

- **Tests enthalten keine Funktionslogik** — Logik, Aktionen und Assertions gehören in Page-Objects
- **Locators nur in Pages** — Tests greifen ausschließlich auf Page-Methoden zu
- **Use-Case pro Datei** — Eine `.spec.ts` deckt genau einen Use-Case ab
- **Dateiname:** PascalCase, Endung `.spec.ts` (z.B. `RolleAnlegen.spec.ts`)
- **Describe-Blöcke:** kurz, fachlich, auf Deutsch
- **Tags:** alphabetisch sortiert: `{ tag: [DEV, STAGE] }`
- **`test.step()`:** nur für fachliche Hauptphasen, Step-Namen auf Deutsch
- **Assertions:** Präfix `assert` in Page-Methoden, Web-first Assertions bevorzugen

### Reviewer-Hardening (verpflichtend)

- **Reuse vor Neuimplementierung:** Vor neuen Page-Methoden nach bestehender, ähnlicher Logik suchen und diese bevorzugt erweitern/parametrisieren.
- **Locator-Deduplizierung:** Wenn ein Locator-Pattern in derselben Page mehrfach vorkommt, als private Helper-Methode kapseln.
- **Kein Dead-Code:** Neu hinzugefügte öffentliche Methoden müssen in Tests oder anderen Pages verwendet werden, sonst entfernen.
- **Minimale Testdaten-Parameter:** Bei Helpern wie `createRolleAndPersonWithPersonenkontext(...)` optionale Felder nur setzen, wenn fachlich erforderlich.
- **Schulstrategie bewusst entscheiden:**
  - Standard: `createSchule(...)` mit generiertem Namen.
  - Ausnahme (statisch/existierend) nur mit kurzer Begründung im Testkommentar oder in der Summary.

---

## API-basierte Testdatenerstellung — Bekannte Backend-Constraints

Vollständige Beschreibung mit Codebeispielen: [docs/testdaten.md](../../../docs/testdaten.md).

| Verhalten | CREATE (`POST`) | COMMIT (`PUT`) |
|---|---|---|
| Schüler ohne Klasse | ❌ `LERN_NOT_AT_SCHULE_AND_KLASSE` | ❌ `LERN_NOT_AT_SCHULE_AND_KLASSE` |
| 2 Klassen, gleiche Rolle | ✅ erlaubt | ❌ `DUPLICATE_KLASSENKONTEXT_FOR_SAME_ROLLE` |
| Versionierung (`count`/`lastModified`) | nicht nötig | ✅ erforderlich |

---

## Verfügbare API-Funktionen für Testdatenerstellung

Vollständige Übersicht inkl. Signaturen, Beispielen und Entscheidungshilfe: [docs/testdaten.md](../../../docs/testdaten.md).

Kurzreferenz:

| Funktion | Zweck |
|---|---|
| `createPersonWithPersonenkontext` | Person an existierender Org + Rolle anlegen |
| `createPerson` | Person mit bestehender Rolle + optional Klasse anlegen (kein neues Rollen-Anlegen; nutzen wenn Schüler eine bereits existierende Rolle teilen sollen) |
| `createRolleAndPersonWithPersonenkontext` | Rolle + Person + Personenkontext in einem Schritt (inkl. Klasse) |
| `createPersonWithZweiKlassenKontexte` | Person mit Schule + 2 Klassen in einem CREATE |
| `addSecondOrganisationToPerson` | Zweite Org/Klasse per COMMIT hinzufügen (Achtung: Versionierung!) |
| `createTeacherAndLogin` | Lehrkraft anlegen + direkt einloggen |
| `prepareAndLoginUserWithPermissions` | User mit definierten Systemrechten anlegen + einloggen ([tests/helpers/](../../../tests/helpers/prepareAndLoginUserWithPermissions.ts)) |
| `deletePerson` / `deletePersonenBySearchStrings` | Person(en) löschen (Cleanup) |
| `deleteRolleById` / `deleteRolleByName` | Rolle(n) löschen (Cleanup) |
| `deleteKlasseByName` | Klasse(n) löschen (Cleanup) |

Weitere Helpers:
- `base/api/organisationApi.ts`: `createSchule`, `createKlasse`, `getKlasseId`, `getOrganisationId`
- `base/api/rolleApi.ts`: `createRolle`, `getRolleId`, `addServiceProvidersToRolle`, `addSystemrechtToRolle` (sequentiell – optimistic locking)
- `base/api/serviceProviderApi.ts`: `getServiceProviderId`
- `base/testHelperDeleteTestdata.ts`: Bulk-Cleanup-Funktionen
- `tests/helpers/`: Spezialisierte Helper für komplexere Szenarien

---

## Workflow

### Phase 1 — Testbeschreibung einholen

Ohne Testbeschreibung **nicht starten**. Pflichtangaben:

| Information | Pflicht | Quelle |
|---|---|---|
| Use-Case-Beschreibung oder Testschritte | ✅ | Benutzer / CSV / Ticket |
| Welche Rolle agiert (Landesadmin, Schuladmin, …) | ✅ | Benutzer / Testschritte |
| Welche Testdaten benötigt werden | ✅ | Aus Testschritten ableiten |
| Tags (DEV, STAGE) | ⚪ | Benutzer (Default: `[DEV]`) |

Wenn die Beschreibung unklar ist → beim Benutzer nachfragen, **bevor** Page-Objects oder Tests erstellt werden.

### Phase 2 — Page-Objects und Locators prüfen

Aus den Testschritten ableiten, welche Pages und welche Methoden/Locators benötigt werden. Dann pro Page der Reihe nach prüfen:

1. **Existiert das Page-Object** unter `pages/` oder `pages/admin/<bereich>/`?
   - **Nein** → Skill [`create-page-object`](../create-page-object/SKILL.md) aufrufen, um die Page neu anzulegen. Erst danach hier weitermachen.
   - **Ja** → weiter zu Schritt 2.
2. **Sind alle benötigten Methoden/Locators in der Page vorhanden?**
   - **Nein** → Skill [`extend-page-object`](../extend-page-object/SKILL.md) aufrufen, um die fehlenden Methoden/Locators zu ergänzen. Erst danach hier weitermachen.
   - **Ja** → weiter zu Phase 3.
3. **Wichtig:** Vor Ergänzungen immer Reuse-first anwenden: vorhandene Methoden erweitern/parametrisieren statt denselben Flow ein zweites Mal zu implementieren.
4. Analog: Prüfen, ob die benötigten **API-Funktionen** für das Testdaten-Setup in `base/api/` existieren. Wenn nicht, vor dem Test ergänzen (siehe [docs/testdaten.md](../../../docs/testdaten.md)).

> Diese Phase **niemals überspringen**. Tests sollen keine Locators direkt enthalten – fehlende Logik gehört zuerst in die Page-Objects.

> **Unbekannte testids?** Nutze Playwright MCP (`run_playwright_code` / `read_page`) zur Live-Inspektion der Seite. Navigiere als passender User zum relevanten UI-State und lese die `data-testid`-Attribute aus dem DOM. Siehe [`extend-page-object`](../extend-page-object/SKILL.md) für Details.

### Phase 3 — Ablageort: bestehende `.spec.ts` wiederverwenden oder neu anlegen

Vor dem Schreiben prüfen, ob es bereits eine passende `.spec.ts` gibt, in der der neue Testfall ergänzt werden kann.

1. Unter `tests/<bereich>/` nach thematisch passenden Dateien suchen (z. B. `PersonAnlegen.spec.ts`, `KlasseBearbeiten.spec.ts`).
2. **Passende Datei vorhanden?**
  - **Ja** → neuen `test(...)`-Block in eine passende bestehende `test.describe`-Suite einfügen. Vorhandenes `beforeEach` wiederverwenden; bestehendes `afterEach` nur beibehalten, wenn dessen lokaler Cleanup fachlich erforderlich ist.
   - **Nein** → neue Datei `tests/<bereich>/<UseCase>.spec.ts` (PascalCase) anlegen.
3. **Vor dem Einfügen** prüfen, ob das vorhandene `beforeEach` bereits alle nötigen Testdaten anlegt:
   - Reicht das Setup aus → Test einfach ergänzen.
  - Es fehlen Testdaten → das `beforeEach` (oder ein eigenes inneres `test.describe` mit eigenem `beforeEach`) entsprechend erweitern. Alle Namen müssen den Generator-Präfix `TAuto-PW-…` tragen, damit das globale Teardown sie nach dem Lauf aufräumt.

> **Anti-Pattern: Duplicate Describe statt Merge.**
> Wenn ein bestehendes `beforeEach` bereits 80%+ des benötigten Setups enthält (z.B. Schule, Klassen, Rolle, Schuladmin-Login), füge fehlende Testdaten **dort** hinzu, statt einen eigenständigen Describe-Block mit nahezu identischem Setup zu erstellen. Dupliziertes Setup = längere Laufzeit + Wartungslast.

### Phase 4 — Test implementieren

#### 4.1 — Ablageort

`tests/<bereich>/` (z. B. `tests/personen/`, `tests/rollen/`, `tests/schulen/`).

#### 4.2 — Grundstruktur (bei neuer Datei)

Wenn eine bestehende Spec-Datei wiederverwendet wird, nur den `test(…)`-Block einfügen und ggf. das `beforeEach` erweitern – keine neue `test.describe`-Hülle bauen.

```ts
import test, { expect, PlaywrightTestArgs } from '@playwright/test';
// Imports für API-Funktionen, Pages, Testdaten-Generatoren, Tags...

test.describe(`<Fachlicher Use-Case Name>`, () => {
  test.describe(`Als <Rolle>`, () => {
    // Suite-lokale Variablen für Testdaten
    let someId: string;

    test.beforeEach(async ({ page }: PlaywrightTestArgs) => {
      // Login und Navigation
      // Testdaten via API anlegen
    });

    test(`Testfall-Beschreibung`, { tag: [DEV] }, async ({ page }: PlaywrightTestArgs) => {
      // Test-Schritte über Page-Methoden
    });
  });
});
```

#### 4.3 — Testdaten-Setup

- **Immer API-basiert**, nicht über die UI
- **Setup gehört in `beforeEach`** (oder in einen `test.step('Testdaten … anlegen')` ganz am Anfang des Tests) – nicht mitten im Testablauf
- Die Page muss vor API-Aufrufen eingeloggt sein (typisch: `loginAndNavigateToAdministration(page)` als Landesadmin), da die Wrapper über den Page-Cookie authentifizieren
- Bei Schülern **immer Schule + Klasse** zusammen anlegen (Constraint `LERN_NOT_AT_SCHULE_AND_KLASSE`)
- Bei Multi-Klasse-Szenarien: `createPersonWithZweiKlassenKontexte` statt CREATE+COMMIT
- Testdaten generieren mit Funktionen aus `base/utils/generateTestdata.ts`: `generateNachname()`, `generateVorname()`, `generateSchulname()`, `generateKlassenname()`, `generateRolleName()`, `generateDienststellenNr()`, `generateKopersNr()`. Alle Generatoren erzeugen Werte mit Präfix `TAuto-PW-…` für Wiedererkennbarkeit und Kollisionsfreiheit bei parallelen Tests.
- **Schulen werden im Test per API neu angelegt** mit `createSchule(page, generateSchulname(), generateDienststellenNr())`. Die statischen Konstanten `testschuleName` und `ersatzTestschuleName` aus [base/organisation.ts](../../../base/organisation.ts) dürfen für neue Tests **nicht** mehr verwendet werden; bei Refactorings sind sie durch frisch erzeugte Schulen zu ersetzen. Downstream-API-Funktionen wie `createPersonWithPersonenkontext`/`createRolleAndPersonWithPersonenkontext` werden mit dem dynamisch generierten `schuleName` aufgerufen.

#### 4.4 — Testlogik

- Aktionen über Page-Methoden aufrufen, keine direkten Locator-Zugriffe
- Navigation über `waitForPageLoad()`-Ketten
- `test.step()` für fachliche Hauptphasen

#### 4.5 — Cleanup

- Das globale Teardown in [tests/global-teardown.ts](../../../tests/global-teardown.ts) löscht nach dem Testlauf alle mit `TAuto-PW` erzeugten Personen, Rollen, Klassen und Schulen.
- Neue Tests implementieren deshalb keinen eigenen `afterEach`-Cleanup und müssen keine IDs oder Usernames für diesen Zweck sammeln.
- Ein lokaler `afterEach`-Cleanup über [base/testHelperDeleteTestdata.ts](../../../base/testHelperDeleteTestdata.ts) ist nur zulässig, wenn Daten noch vor Ende des Testlaufs gelöscht werden müssen; die Ausnahme ist im Test kurz zu begründen.

### Phase 5 — Validierung

1. TypeScript-Kompilierung:
   ```bash
   npx tsc --noEmit
   ```
2. Test ausführen:
   ```bash
   npx playwright test <testdatei> --reporter=list
   ```
3. Bei Fehlern → Skill `run-and-fix-test` verwenden
4. PR-Quick-Checks auf geänderten Dateien:
  ```bash
  npx eslint <geänderte-dateien>
  ```
  Danach kurz manuell prüfen:
  - doppelte Locator-Strings in derselben Page
  - neu hinzugefügte, aber ungenutzte öffentliche Methoden

---

## Referenz-Dateien

| Datei | Pattern |
|---|---|
| `tests/personen/PersonAnlegen.spec.ts` | Standard-Test mit API-Setup, Landesadmin, Schuladmin |
| `tests/personen/PersonenRolleZuordnenMehrfachbearbeitung.spec.ts` | Komplexer Test mit Multi-Klasse-Szenarien, Fehlerfall-Tests |
| `tests/helpers/createKlassenAndSchuelerForSchulen.ts` | Helper für Massen-Testdatenerstellung |
| `tests/helpers/prepareAndLoginUserWithPermissions.ts` | Helper für Login mit spezifischen Berechtigungen |

[def]: ../run-and-fix-test/SKILL.md