---
name: extend-page-object
description: 'Erweitert eine bestehende Playwright Page-Object-Klasse um neue Locators und Methoden für eine Admin-Seite im Schulportal. Liest die Bestandsdatei, inspiziert die Zielseite per Playwright MCP als Landesadmin und fügt neue Elemente korrekt und konfliktfrei ein. Use when asked to extend, update, or add methods to an existing page object class in the schulportal test automation project.'
---

# Extend Page Object

Dieser Skill erweitert eine bestehende Playwright Page-Object-Klasse um neue Locators und Methoden. Er analysiert zunächst die Bestandsdatei, inspiziert dann die Zielseite live per Playwright MCP und ergänzt anschließend die TypeScript-Klasse nach den Projektkonventionen — ohne bestehenden Code zu verändern.

## Use When
- Eine bestehende Page-Klasse um neue Methoden oder Locators erweitert werden soll
- Neue UI-Elemente in eine vorhandene Page eingebunden werden sollen
- Die `data-testid`-Attribute neuer Elemente unbekannt sind und per MCP ermittelt werden müssen

## Do Not Use When
- Eine komplett neue Page-Klasse erstellt werden soll → verwende stattdessen [`create-page-object`](../create-page-object/SKILL.md)
- Kein Login-Zugang zur Zielseite vorhanden ist

---

## Projektkonventionen

Vollständige Konventionen: [docs/best-practices.md](../../../docs/best-practices.md)

### Blockreihenfolge in einer Page-Klasse
```
1. Felder (private readonly Locators, Hilfsklassen)
2. constructor
3. /* actions */   ← read- und edit-Methoden, waitForPageLoad()
4. /* assertions */ ← Methoden mit assert-Präfix
```

### Reviewer-Hardening (verpflichtend)

- **Reuse vor Neuimplementierung:** Vor neuen Methoden zuerst in der Zieldatei und in benachbarten Pages nach bestehender Logik suchen (`complete*`, `navigate*`, `setup*`, `assert*`).
- **Locator-Deduplizierung:** Wenn ein Locator-Pattern in derselben Page mehrfach vorkommt, als private Helper-Methode oder Feld kapseln.
- **Kein Dead-Code:** Neu hinzugefügte öffentliche Methoden müssen aufrufbar genutzt werden (Spec/Page) oder wieder entfernt werden.
- **Minimal-invasive Erweiterung:** Bestehende Methoden nur erweitern/parametrisieren, wenn dadurch Duplikation reduziert wird; keine parallelen Doppel-Implementierungen.

---

## Workflow

### Phase 1 — Eingaben sammeln

Folgende Informationen sind erforderlich, bevor mit der Implementierung begonnen wird:

| Information | Pflicht | Quelle |
|-------------|---------|--------|
| Zieldatei (Pfad zur `.page.ts`-Datei) | ✅ | Benutzer |
| Was soll hinzugefügt werden? (Beschreibung neuer Aktionen / Assertions) | ✅ | Benutzer |
| URL der Zielseite | ✅ | Benutzer |
| Login-Credentials oder Test-User | ✅ | Benutzer / `global-setup.ts` |

> **Warte auf alle Pflicht-Informationen, bevor du mit Phase 2 beginnst.**

---

### Phase 2 — Bestandsanalyse der Zieldatei

Lese die angegebene Datei vollständig ein und erstelle eine strukturierte Übersicht:

#### 2.1 — Klassentyp ermitteln
| Klassendeklaration | Typ |
|--------------------|-----|
| `export class XPage extends AbstractAdminPage` | extends AbstractAdminPage |
| `export class XPage` | Standalone |

#### 2.2 — Bestehende Felder inventarisieren
Liste alle `private readonly`- und `public readonly`-Felder auf. Diese **dürfen nicht** durch neue Felder mit demselben Namen überschrieben werden.

#### 2.3 — Bestehende Methoden inventarisieren
Liste alle `public` und `private`-Methoden auf. Keine Methodennamen doppelt verwenden.

Zusätzlich prüfen:
- Gibt es bereits eine Methode, die den gewünschten Flow ganz oder teilweise abdeckt?
- Kann die bestehende Methode mit optionalen Parametern erweitert werden statt eine neue, ähnliche Methode einzuführen?

#### 2.4 — Bestehende Imports inventarisieren
Liste alle aktuellen Imports auf, damit nur wirklich fehlende hinzugefügt werden.

#### 2.5 — Wiederholte Locator-Patterns identifizieren
Suche nach bereits vorhandenen Locator-Patterns, die durch die neuen Anforderungen erneut verwendet würden.

- Bei 2x+ Nutzung desselben Patterns: über gemeinsames Feld oder private Helper-Methode kapseln.
- Keine mehrfachen Inline-Varianten desselben Selektors in verschiedenen Methoden einführen.

**Erwartetes Ergebnis:** Vollständige Liste der vorhandenen Felder, Methoden und Imports als Grundlage für den Konfliktcheck.

---

### Phase 3 — MCP-Inspektion der Zielseite

Inspiziere die Zielseite immer als **Landesadmin** — dieser sieht alle UI-Elemente unabhängig von Systemrechten.

1. **Browser öffnen** — Zur Login-Seite der Anwendung navigieren
2. **Einloggen** — Login-Workflow durchführen (Credentials aus `global-setup.ts` oder vom Benutzer)
3. **Zur Zielseite navigieren** — Die vom Benutzer angegebene URL aufrufen
4. **Snapshot erstellen** — `browser_snapshot` ausführen
5. **Neue `data-testid`-Attribute dokumentieren** — Nur Elemente, die für die gewünschte neue Funktionalität relevant sind und **noch nicht** in der Klasse vorhanden sind:
   - Buttons (neue Aktionen)
   - Formularfelder
   - Dialoge / Modals
   - Tabellen, Dropdowns, Autocomplete-Felder
6. **Interaktionstyp bestimmen** — Für jedes neue Element: lesend, editierbar oder Aktion auslösend?

**Erwartetes Ergebnis:** Liste aller neuen `data-testid`-Werte mit Bedeutung und Interaktionstyp.

---

### Phase 4 — Implementierung

Ergänze die bestehende Datei gezielt. Ändere **niemals** vorhandene Zeilen — nur Ergänzungen.

#### 4.1 — Imports ergänzen
Nur hinzufügen, was tatsächlich neu benötigt wird und noch nicht importiert ist:
- `Page`, `Locator`, `expect` aus `@playwright/test`
- Hilfsklassen (`DataTable`, `Autocomplete`, `SearchFilter` etc.) nur wenn neu genutzt

#### 4.2 — Neue Felder im Konstruktor ergänzen
Nur wenn ein Locator in **mehreren** neuen Methoden genutzt wird:
```ts
private readonly neuerButton: Locator;
// ...im constructor:
this.neuerButton = this.page.getByTestId('neuer-button-test-id');
```
Bei Autocomplete oder DataTable entsprechend:
```ts
private readonly neueAutocomplete: Autocomplete;
// ...im constructor:
this.neueAutocomplete = new Autocomplete(this.page, this.page.getByTestId('neue-autocomplete-test-id'));
```

#### 4.3 — Neue Methoden einfügen

**Im `/* actions */`-Block** — neue Aktionsmethoden:
```ts
public async neueAktion(param: string): Promise<void> {
  // Locator methoden-lokal wenn nur hier genutzt
  const locator: Locator = this.page.getByTestId('element-test-id');
  await locator.click();
}
```

**Im `/* assertions */`-Block** — neue Assertion-Methoden (`assert`-Präfix):
```ts
public async assertNeuesElementSichtbar(): Promise<void> {
  await expect(this.page.getByTestId('element-test-id')).toBeVisible();
}
```

**Best Practices für Assertions:**
```ts
// Web-first Assertions bevorzugen
await expect(locator).toBeVisible();           // ✅
await locator.waitFor(); expect(true).toBe(true); // ❌

// expect.soft() für nicht-kritische Mehrfachprüfungen
await expect.soft(locator).toHaveText('...');

// Zusammengehörige Assertions in einer Methode bündeln
public async assertDialogInhalte(): Promise<void> {
  await expect.soft(this.headline).toBeVisible();
  await expect.soft(this.saveButton).toBeEnabled();
}
```

---

### Phase 5 — Validierung

1. **TypeScript-Kompilierung prüfen:**
   ```bash
   npx tsc --noEmit
   ```
2. **Lint auf betroffene Datei ausführen:**
  ```bash
  npx eslint <zieldatei>
  ```
3. **Import-Pfade verifizieren** — Relative Pfade müssen korrekt sein
4. **Konfliktcheck wiederholen** — Kein bestehender Code darf verändert worden sein
5. **Reviewer-Quick-Checks:**
  - Keine neu eingeführte, ungenutzte öffentliche Methode
  - Keine unnötig duplizierten Locator-Strings
  - Bei ähnlicher vorhandener Logik: begründet erweitert/parametrisiert statt dupliziert

---

## Referenz-Beispiel

### Ausgangslage: PersonManagementViewPage

Die Datei [pages/admin/personen/PersonManagementView.page.ts](../../../pages/admin/personen/PersonManagementView.page.ts) ist ein gutes Referenz-Beispiel für eine komplexe Page-Klasse mit `extends AbstractAdminPage`, mehreren Hilfsklassen und beiden Methodenblöcken.

**Bestehende Felder (Auszug):**
```ts
private readonly personTable: DataTable;
private readonly organisationAutocomplete: Autocomplete;
private readonly table: Locator;
private readonly schuelerVersetzenDialogCard: Locator;
public readonly menu: MenuBarPage;
```

**Beispiel: Neues Feld + Methode korrekt ergänzen**

Ausgangslage — Konstruktor endet mit:
```ts
    this.passwortZuruecksetzenDialogCard = this.page.getByTestId('password-reset-layout-card');
  }
```

Erweiterung — neues Feld im Konstruktor:
```ts
    this.passwortZuruecksetzenDialogCard = this.page.getByTestId('password-reset-layout-card');
    this.lockUserDialogCard = this.page.getByTestId('lock-user-layout-card');  // NEU
  }
```

Neue Methode im `/* actions */`-Block am Ende des Blocks:
```ts
  public async lockUser(): Promise<void> {
    await this.lockUserDialogCard.getByTestId('lock-user-submit-button').click();
  }
```

Neue Assertion im `/* assertions */`-Block:
```ts
  public async assertLockDialogVisible(): Promise<void> {
    await expect(this.lockUserDialogCard).toBeVisible();
  }
```

---

## Weitere Referenz-Dateien im Projekt

| Datei | Pattern |
|-------|---------|
| [pages/admin/rollen/RolleDetailsView.page.ts](../../../pages/admin/rollen/RolleDetailsView.page.ts) | Detailseite mit Edit- und Delete-Aktionen |
| [pages/admin/service-provider/ServiceProviderManagementView.page.ts](../../../pages/admin/service-provider/ServiceProviderManagementView.page.ts) | extends AbstractAdminPage, DataTable |
| [pages/components/DataTable.page.ts](../../../pages/components/DataTable.page.ts) | Wiederverwendbare DataTable-Komponente |
| [pages/components/Autocomplete.ts](../../../pages/components/Autocomplete.ts) | Autocomplete-Komponente |

---

## Bekannte Vuetify-Pitfalls bei Autocomplete/Dropdown-Interaktionen

### Problem: „Keine Daten gefunden." bei Dropdown-Öffnung

Vuetify-Autocomplete-Felder laden Daten oft erst per API-Call, wenn das Feld sichtbar/aktiv wird. Wenn die Page das Dropdown öffnet, bevor die API-Antwort da ist, zeigt es „Keine Daten gefunden." und `waitForData()` in der `Autocomplete`-Klasse schlägt fehl.

**Lösung:** Nach dem Öffnen des Dropdowns `waitUntilLoadingIsDone()` aufrufen, bevor auf Inhalte zugegriffen wird. Das wartet, bis der Lade-Spinner verschwindet.

### Problem: DOM-Detachment bei `pressSequentially`

`pressSequentially` tippt Zeichen für Zeichen. Jeder Tastendruck kann eine API-Suche triggern, die das DOM der Ergebnisliste neu rendert. Zwischen dem Finden des Elements und dem Klick wird das Element durch ein Re-Render aus dem DOM entfernt → `element was detached from the DOM, retrying` → Timeout.

**Lösung:** `click({ force: true })` verwenden, um Playwright's Stability-Check zu überspringen. Dies ist ein akzeptiertes Pattern im Projekt (siehe `Autocomplete.openModal()`).

### Problem: Stale Overlays – falsches Dropdown wird angesprochen

Vuetify hält vorherige Overlay-Elemente im DOM. Der globale Selektor `.v-overlay .v-list-item` matched auch Items aus bereits geschlossenen Dropdowns (Org, Rolle), die noch unsichtbar im DOM liegen.

**Lösung:** Nur das **aktive** Overlay ansprechen:
```ts
// ❌ Matched alle Overlays (inkl. stale)
this.page.locator('.v-overlay .v-list-item')

// ✅ Nur das aktive Overlay
this.page.locator('div.v-overlay--active').getByRole('option')
```

### Zusammenfassung: Robustes Pattern für Vuetify-Autocomplete-Auswahl

```ts
// 1. Input klicken und Text tippen (triggert API-Suche)
await selectLocator.locator('input').click();
await selectLocator.locator('input').pressSequentially(suchtext);

// 2. Warten bis Laden abgeschlossen
const autocomplete = new Autocomplete(this.page, selectLocator);
await autocomplete.waitUntilLoadingIsDone();

// 3. Nur im aktiven Overlay suchen, force-click wegen DOM-Instabilität
const option = this.page.locator('div.v-overlay--active')
  .getByRole('option')
  .filter({ hasText: suchtext });
await option.first().click({ force: true });
```
