---
name: playwright-test-workflow
description: 'End-to-end Workflow zur Playwright-Test-Erstellung aus einer Testbeschreibung.
  Prüft und erstellt fehlende Page Objects, erweitert bestehende bei Bedarf, generiert
  den Test und führt ihn iterativ bis zum Grün aus. Use when: vollständigen Test-Workflow
  starten, Test aus Beschreibung erstellen, Test von Anfang bis Ende automatisieren.'
---

# Playwright Test Workflow

Orchestriert den vollständigen Weg von einer Testbeschreibung bis zum grünen Test.
Ruft die Einzelskills `create-page-object`, `extend-page-object`, `create-playwright-test`
und `run-and-fix-test` in der richtigen Reihenfolge auf.

## Use When
- Eine Testbeschreibung (Ticket, Szenario, fachliche Schritte) vorliegt
  und der komplette Weg bis zum grünen Test automatisiert werden soll
- Der Nutzer sagt: „Erstelle einen Test für …", „Implementiere diesen Testfall",
  „Test-Workflow starten"

## Do Not Use When
- Nur ein Page-Object erstellt werden soll → [`create-page-object`](../create-page-object/SKILL.md)
- Nur eine bestehende Page erweitert werden soll → [`extend-page-object`](../extend-page-object/SKILL.md)
- Nur ein fehlgeschlagener Test repariert werden soll → [`run-and-fix-test`](../run-and-fix-test/SKILL.md)
- Kein Login-Zugang zur Zielumgebung vorhanden ist

---

## Workflow

### Phase 1 — Testbeschreibung einholen

Ohne vollständige Eingaben **nicht starten**.

| Information | Pflicht | Quelle |
|---|---|---|
| Fachliche Beschreibung des Testfalls (Schritte, Ziel) | ✅ | Nutzer / Ticket |
| Handelnde Rolle (Landesadmin, Schuladmin, …) | ✅ | Nutzer / Beschreibung |
| Betroffene Seite(n) / URL(s) | ✅ | Nutzer / Beschreibung |
| Tags (DEV, STAGE) | ⚪ | Nutzer (Default: `[DEV]`) |

Wenn die Beschreibung unvollständig ist → beim Nutzer nachfragen, **bevor** mit Phase 2 begonnen wird.

**Erwartetes Ergebnis:** Vollständige Testbeschreibung inkl. Rolle und Seiten liegt vor.

---

### Phase 2 — Page Objects prüfen und vorbereiten

Aus der Testbeschreibung alle benötigten Pages und Methoden ableiten.
Für jede benötigte Page der Reihe nach:

#### Schritt 2.1 — Existiert das Page-Object?

- Unter `pages/` und `pages/admin/<bereich>/` nach der Page suchen.
- **Nein** → Skill [`create-page-object`](../create-page-object/SKILL.md) vollständig ausführen,
  dann mit Schritt 2.2 fortfahren.
- **Ja** → weiter mit Schritt 2.2.

#### Schritt 2.2 — Sind alle benötigten Methoden und Locators vorhanden?

- Die vorhandene Page-Datei lesen und mit den Anforderungen aus der Testbeschreibung abgleichen.
- **Reuse-first prüfen:** Bevor neue Methoden geschrieben werden, nach bestehender Logik in `pages/` suchen (z. B. ähnliche Namen wie `complete*`, `navigate*`, `setup*`, `assert*`).
  - Wenn passende Logik existiert: bestehende Methode erweitern/parametrisieren statt duplizieren.
  - Nur wenn keine passende Methode existiert: neue Methode hinzufügen.
- **Fehlende Methoden / Locators** → Skill [`extend-page-object`](../extend-page-object/SKILL.md)
  vollständig ausführen.
- **Alles vorhanden** → direkt weiter mit Phase 3.

#### Schritt 2.3 — Locator-Wiederholung und Dead-Code prüfen

- Wenn derselbe Locator-Pattern in einer Page **2x oder häufiger** vorkommt, als private Helper-Methode kapseln (z. B. `getServiceProviderCard(name)`).
- Nach Erweiterungen prüfen, ob neu hinzugefügte öffentliche Methoden tatsächlich verwendet werden.
  - Ungenutzte Methoden entfernen oder korrekt integrieren.

> **Niemals überspringen.** Tests enthalten keine Locators direkt — fehlende Logik gehört zuerst
> in die Page-Objects.

**Erwartetes Ergebnis:** Alle benötigten Page-Objects existieren und enthalten alle
benötigten Methoden und Locators.

---

### Phase 3 — Testdaten-Bedarf analysieren und API-Wrapper prüfen

Aus der Testbeschreibung alle benötigten Testdaten-Konstellationen ableiten,
**bevor** mit der Test-Implementierung begonnen wird.

#### Schritt 3.1 — Testdaten-Konstellationen ableiten

Für jedes Szenario aus der Beschreibung bestimmen:

| Was | Frage |
|---|---|
| Entitäten | Welche Personen, Schulen, Klassen, Rollen, Admins werden benötigt? |
| Konstellationen | Positivfälle, Konfliktfälle, Mehrklassen-Szenarien? |
| Vorbedingungen | Müssen bestimmte Rollen/Kontexte bereits vor dem Test existieren? |
| Cleanup | Welche Entitäten erzeugt das globale Teardown anhand des `TAuto-PW`-Präfixes? Ist ausnahmsweise ein lokaler Cleanup vor Testlaufende erforderlich? |

#### Schritt 3.2 — Benötigte API-Wrapper prüfen

In `base/api/` und `tests/helpers/` prüfen, ob alle Hilfsfunktionen für das Testdaten-Setup vorhanden sind.
Referenz: [docs/testdaten.md](../../../docs/testdaten.md).

- **Alle Wrapper vorhanden** → weiter mit Schritt 3.3.
- **Fehlende Wrapper** → vor der Test-Implementierung in `base/api/` ergänzen, dann weiter mit Schritt 3.3.

> **Constraint-Erinnerung:** Schüler immer mit Schule + Klasse anlegen (`LERN_NOT_AT_SCHULE_AND_KLASSE`).
> Multi-Klasse-Szenarien: `createPersonWithZweiKlassenKontexte` statt CREATE+COMMIT.
> Schulen immer dynamisch per API anlegen — keine statischen Konstanten aus `base/organisation.ts`.

#### Schritt 3.3 — Testdaten-Plan dem Nutzer zur Freigabe vorlegen

**Vor dem Erstellen der Testdaten den Plan strukturiert ausgeben und auf Bestätigung warten.**

Ausgabeformat:

```
## Testdaten-Plan — Bitte prüfen und bestätigen

### Szenarien und Konstellationen
| Szenario | Entitäten | Konstellation | Cleanup |
|---|---|---|---|
| Szenario 1 | 1x Schule, 2x Klasse, 3x Schüler (1 Klasse), 1x Schuladmin | Positivfall | Schüler, Schule, Klassen |
| ... | ... | ... | ... |

### API-Funktionen (beforeEach)
- `createSchule(...)` → schoolA
- `createKlasse(...)` → classA1, classA2
- `createRolleAndPersonWithPersonenkontext(...)` × 3 → studentsSingleClass_A
- ...

### Cleanup
- Globales Teardown löscht nach dem Testlauf Personen, Rollen, Klassen und Schulen mit dem Präfix `TAuto-PW`.
- Lokalen `afterEach`-Cleanup nur bei begründeter Notwendigkeit aufführen, wenn Daten noch vor Testlaufende entfernt werden müssen.

---
Bitte bestätigen (ja) oder Änderungen angeben.
```

> **Warte auf Freigabe durch den Nutzer, bevor mit Phase 4 begonnen wird.**
> Bei Änderungswünschen: Plan anpassen und erneut vorlegen.

#### Schritt 3.4 — Freigegebenen Testdaten-Plan speichern

Nach Freigabe durch den Nutzer:
1. Datei `.github/skills/create-playwright-test/testdaten` vollständig leeren (bestehenden Inhalt löschen — es handelt sich um eine Arbeitsdatei).
2. Den finalisierten Plan in die geleerte Datei schreiben.

Der Skill `create-playwright-test` liest diese Datei als Grundlage für das `beforeEach`-Setup.

**Erwartetes Ergebnis:** Nutzer hat den Testdaten-Plan freigegeben und er ist unter
`.github/skills/create-playwright-test/testdaten` gespeichert.
Das `beforeEach`-Setup wird in Phase 4 exakt nach diesem Plan implementiert.

---

### Phase 4 — Test erstellen

Skill [`create-playwright-test`](../create-playwright-test/SKILL.md) vollständig ausführen.
Testbeschreibung aus Phase 1 und den gespeicherten Testdaten-Plan aus
`.github/skills/create-playwright-test/testdaten` als Input übergeben.

**Erwartetes Ergebnis:** Neue `.spec.ts`-Datei wurde erstellt (oder ein bestehender Describe-Block
wurde erweitert) — inkl. vollständigem `beforeEach`-Setup; die Daten werden durch das globale Teardown bereinigt.

---

### Phase 5 — Test ausführen und reparieren

Skill [`run-and-fix-test`](../run-and-fix-test/SKILL.md) vollständig ausführen.
Pfad zur Testdatei aus Phase 4 als Input übergeben.

**Erwartetes Ergebnis:** Test läuft grün. Kurze Zusammenfassung: was wurde erstellt,
was wurde geändert.

---

### Phase 6 — PR-Härtung (vor Abschluss verpflichtend)

Bevor der Workflow als „fertig“ gilt, folgende Checks durchführen:

1. **TypeScript-Check:** `npx tsc --noEmit`
2. **Lint auf betroffene Dateien:** `npx eslint <geänderte-dateien>`
3. **Duplicate-Locator-Schnellcheck:** neu hinzugefügte Locator-Strings auf Wiederholungen in derselben Page prüfen und ggf. extrahieren.
4. **Dead-Method-Schnellcheck:** neu hinzugefügte öffentliche Methoden auf tatsächliche Nutzung prüfen.
5. **Testdaten-Parameter minimieren:** Bei Helpern wie `createRolleAndPersonWithPersonenkontext(...)` optionale Felder (`familienname`, `vorname`, `rollenName`) nur setzen, wenn der Test sie fachlich benötigt.
6. **Schulstrategie bewusst wählen und begründen:**
  - Standard: dynamische Schule per API.
  - Ausnahme: bestehende/statische Schule nur bei klarer Begründung (z. B. Lifecycle/Cleanup-Risiko oder explizite Fachvorgabe).

**Erwartetes Ergebnis:** Test ist grün **und** der Code ist reviewer-ready (geringe Duplikation, kein Dead-Code, klare Testdaten-Entscheidungen).

---

## Ablaufübersicht

```mermaid
flowchart TD
    A[Testbeschreibung] --> B[Phase 1: Eingaben prüfen]
    B --> C{Page Object\nvorhanden?}
    C -- Nein --> D[create-page-object]
    D --> E{Methoden\nvollständig?}
    C -- Ja --> E
    E -- Nein --> F[extend-page-object]
    F --> G[Phase 3: Testdaten analysieren]
    E -- Ja --> G
    G --> G2{API-Wrapper
vorhanden?}
    G2 -- Nein --> G3[Wrapper ergänzen]
    G3 --> H[create-playwright-test]
    G2 -- Ja --> H
    H --> I[run-and-fix-test]
    I --> J[Test grün ✅]