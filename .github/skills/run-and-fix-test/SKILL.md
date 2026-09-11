---
name: run-and-fix-test
description: "Führt einen Playwright-Test aus, analysiert Fehler bei Fehlschlag und behebt den Code automatisch. Wiederholt diesen Zyklus bis der Test erfolgreich durchläuft. Use when: a test is failing, fix failing test, run test and fix errors, iterate until test passes, debug playwright test, test reparieren, Test ausführen und Fehler beheben."
argument-hint: "Pfad zur Testdatei, z.B. tests/personen/PersonAnlegen.spec.ts"
---

# Run and Fix Test

Führt einen Playwright-Test wiederholt aus und behebt automatisch Fehler, bis er erfolgreich durchläuft.

## Use When
- Ein Playwright-Test fehlschlägt und automatisch repariert werden soll
- Iteratives Debugging gewünscht ist: Test → Fehler analysieren → Fix → Test
- Der Nutzer sagt: „Starte den Test und behebe Fehler", „fix the failing test", „Test reparieren"

## Do Not Use When
- Der Test bereits grün ist
- Der Fehler außerhalb des Testcodes liegt (z.B. Backend nicht erreichbar, fehlende `.env`-Variablen) — dann Nutzer informieren

---

## Procedure

### Schritt 1: maxFailures deaktivieren
Setze in `playwright.config.ts` den Wert `maxFailures` auf `0`, damit der Testlauf nicht vorzeitig bei Fehlern abbricht und alle Tests ausgeführt werden:
```
maxFailures: 0,
```

### Schritt 2: Testdatei bestimmen
Wurde ein Pfad als Argument übergeben? Wenn nicht, frage den Nutzer:
> „Welche Testdatei soll ausgeführt und repariert werden?"

### Schritt 3: Test ausführen
Führe den Test mit dem folgenden Befehl aus:

```bash
npx playwright test <testdatei> --reporter=list
```

Bei einem einzelnen Test-Case (`test.only` oder per Titelfilter):
```bash
npx playwright test <testdatei> --reporter=list -g "<Testname>"
```

**Wichtig — Timeout:** Wenn der Test über einen Subagent (`execution_subagent`) ausgeführt wird, setze den Timeout explizit auf **mindestens 600000 ms (10 min)**. Global setup/teardown plus ein einzelner Test brauchen leicht 2–3 Minuten; der Subagent-Default von 120 s bricht sonst mitten im Lauf ab und die Fehlerdetails gehen verloren.

### Schritt 4: Ergebnis auswerten

**Erfolgreich (Exit Code 0):**
→ Weiter mit Schritt 8 (maxFailures wiederherstellen). Melde dem Nutzer: Test läuft grün. Beschreibe kurz, was geändert wurde (falls Fixes gemacht wurden).

**Fehlgeschlagen:**
→ Weiter mit Schritt 5.

### Schritt 5: Fehler analysieren
- Lese die vollständige Fehlerausgabe aus dem Terminal.
- **Lese immer zuerst die Fehler-Artefakte unter `test-results/<test-ordner>/`:**
  - `error-context.md` (Page-Snapshot zum Fehlerzeitpunkt — zeigt den tatsächlichen DOM-State)
  - `test-failed-1.png` (Screenshot — via `view_image` öffnen, um den UI-State zu sehen)
  Diese geben oft schneller Aufschluss als der reine Stack-Trace, ob z.B. eine Aktion gar nicht im DOM ankam oder ein erwarteter Text leicht abweicht.
- Identifiziere: Fehlermeldung, Stack-Trace, betroffene Datei und Zeile.
- Lese die betroffene Datei, um den Kontext zu verstehen.
- Klassifiziere den Fehler:

| Fehlertyp | Typische Ursache | Fix-Strategie |
|-----------|------------------|---------------|
| `TimeoutError` / `locator.waitFor` | Locator falsch, `data-testid` geändert, fehlende `await` | Locator korrigieren, `await` ergänzen |
| `expect(...).toHaveText` fehlgeschlagen | Text im UI geändert, falscher Locator | Erwartungstext im Spec anpassen |
| TypeScript-Kompilierfehler | Falsche Typen, fehlende Imports | Typen/Imports korrigieren |
| `Cannot find element` | Seite lädt nicht, falscher URL/Pfad | Navigation prüfen |
| `Error: page.goto` | `baseURL` oder Routing-Problem | URL/Route prüfen |
| `toBeChecked()` schlägt nach Wrapper-`click()` fehl | Vuetify Radio/Checkbox: Klick auf `[data-testid]` trifft nur das Label-Wrapper, nicht den Input | `.locator('input').click()` oder `.check({ force: true })` direkt auf dem Input |
| `toContainText` mit ähnlicher, aber umgestellter Zeichenkette | UI-Wortlaut weicht von hardcodiertem Erwartungstext im Spec ab | Erwartungstext im **Spec** an UI angleichen — nicht umgekehrt |
| `TimeoutError` auf Close-Button nach vorherigem Dialog-Close | Übergeordneter Dialog schließt sich automatisch bei Bestätigung eines Unterdialogs (Vuetify Modal-Stack) | Close-Aufruf entfernen; ggf. mit `waitFor({ state: 'hidden' })` verifizieren, dass der Dialog bereits weg ist |

### Schritt 6: Fix implementieren
- Behebe ausschließlich den identifizierten Fehler — keine spekulativen oder unrequested Änderungen.
- Typische Fixes:
  - Locator korrigieren (`getByTestId`, `getByRole`, `getByText`)
  - Fehlende `await` ergänzen
  - Erwarteten Text aktualisieren
  - Import hinzufügen

### Schritt 7: Zurück zu Schritt 3
Führe den Test erneut aus. Wiederhole den Zyklus.

### Schritt 8: maxFailures wiederherstellen
Wenn alle Tests grün sind, setze in `playwright.config.ts` den Wert `maxFailures` wieder auf `2` zurück:
```
maxFailures: 2,
```
Dies stellt sicher, dass die ursprüngliche Konfiguration erhalten bleibt und nur während der Fehlerbehebung deaktiviert war.

---

## Abbruchbedingungen

| Bedingung | Aktion |
|-----------|--------|
| Test grün | maxFailures auf 2 zurücksetzen (Schritt 8), Erfolg melden, Summary der Änderungen |
| 5 Iterationen ohne Fortschritt | Anhalten, Fehlerbild beschreiben, Nutzer um Entscheidung bitten |
| Infrastruktur-Fehler (Backend, Env) | Sofort stoppen, Nutzer informieren |
| Fehler in generiertem API-Code (`base/api/generated/`) | Nicht manuell fixen — `npm run generate-api` empfehlen |

---

## Projekt-Kontext

- **Test-Framework:** Playwright mit TypeScript
- **Testverzeichnis:** `tests/`
- **Page-Objects:** `pages/`
- **Playwright-Config:** `playwright.config.ts`
- **Befehl für Typ-Prüfung:** `npm run type-check`
- **Locator-Konvention:** bevorzugt `getByTestId('<data-testid>')` aus dem DOM
- **Timeout (global):** 90 Sekunden pro Test, 10 Sekunden für `expect`
