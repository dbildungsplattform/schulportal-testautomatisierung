# Schulportal Playwright, Doku für lokale Ausführung von den Tests

## Playwright lokal installieren

git clone https://github.com/dBildungsplattform/schulportal-testautomatisierung
cd schulportal-testautomatisierung
npm ci
npx playwright install --with-deps

## Entwicklungsumgebung

Empfohlen wird VS-Code

## Oft verwendetet Konsolenbefehle

### Code-Generator lokal starten:

#### npx playwright codegen https://main.dev.spsh.dbildungsplattform.de

#### npx playwright codegen https://SPSH-1234.dev.spsh.dbildungsplattform.de

#### npx playwright codegen https://spsh.staging.spsh.dbildungsplattform.de

#### npx playwright codegen https://localhost:8099/ --ignore-https-errors

### API generieren

Grundlage für die API-Generierung sind die Swagger Docs aus dem Backend. Das aktuellste Doc befindet sich auf main und kann über https://main.dev.spsh.dbildungsplattform.de/docs-json abgerufen werden.

Das doc dann in die Datei base/api/openapispec.json einfügen (alles kopieren und alles überschreiben) und mit dem folgenden Befehl die Generierung ausführen:

`npm run generate-api`

### Tests lokal ausführen

#### Alle Tests mit einer beliebigen URL ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test
```

#### Alle Tests mit einem bestimmten Browser ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test --project chromium
```

#### Tracing aktivieren
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test --trace on
```

#### Alle Tests mit einem bestimmten Tag ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test -g "@dev"
```

#### Alle Tests mit einem bestimmten Stichwort ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test -g "Stichwort"
```

#### Alle Tests einer bestimmten Datei ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test Schule.spec.ts
```

#### Alle Tests OHNE ein bestimmtes Stichwort ausführen
```
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test --grep-invert "Stichwort"
```

### Tests ausführen mit LDAP-Operationen:
- Zusätzlich die Variablen LDAP_URL und LDAP_ADMIN_PASSWORD definieren
- Bsp.:

```properties
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' LDAP_URL='ldap://localhost' LDAP_ADMIN_PASSWORD='xxx' npx playwright test

USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' LDAP_URL='ldap://localhost' LDAP_ADMIN_PASSWORD='xxx' npx playwright test -g "Einen Benutzer mit der Rolle Lehrkraft anlegen" --headed

USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' LDAP_URL='ldap://localhost' LDAP_ADMIN_PASSWORD='xxx' npx playwright test Schule.spec.ts

...
```

### Lokale Ausfuehrung gegen Stage (mit 2FA)

Um Tests lokal gegen Stage auszuführen, muss der initiale Login-User bereits ein konfiguriertes 2FA-Token haben, und der passende Seed muss lokal gesetzt sein.

1. Lege eine `.env`-Datei im Projekt-Root an (oder überschreibe die Variablen beim Start der Tests).
2. Setze mindestens die folgenden Variablen:

```env
USER="<stage-admin-username>"
PW="<stage-admin-password>"
FRONTEND_URL="<stage-url>"
OTP_SEED_B32="<base32-seed-of-the-users-2fa-token>"
```

3. Starte die Tests lokal, zum Beispiel:

```bash
npx playwright test --project=chromium
```

Hinweis: `global-setup` erstellt pro Worker dedizierte Admin-Accounts und konfiguriert für diese automatisch 2FA. Für den initialen Start ist entscheidend, dass der initiale `USER` auf Stage mit gütigem `OTP_SEED_B32` funktioniert.

#### debug-mode:

PWDEBUG=1 USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test -g "Einen Benutzer mit der Rolle Lehrkraft anlegen"

### Den letzten Report von der Testausführung öffnen:

npx playwright show-report

## AI Agents and MCP

### Copilot Instructions

The file `.github/copilot-instructions.md` in this repository is just a **placeholder**.
A Symlink has been created to use AGENTS.md as routing entry point and should work on every other computer after cloning the repo.

If the symlink should not work, re-create it with this command:
```bash
cd .github
rm copilot-instructions.md
ln -s ../AGENTS.md copilot-instructions.md
```

> **Why Symlink?** GitHub Copilot reads `.github/copilot-instructions.md` automatically.
> `AGENTS.md` is used by the Copilot Coding Agent and CLI as entry point.
> The Symlink ensures that both use the same file.

### Agent routing
`AGENTS.md` is the mandatory entry point for every AI coding session. It routes requests to specialized instruction files under `.github/instructions/`:

| Topic | Instruction file |
|---|---|
| Playwright / E2E / Page Objects / Fixtures | `testing_agent.md` |
| Frontend architecture reference (read-only for E2E authors) | `frontend_agent.md` |
| Code review / refactoring | `review_agent.md` |
| DevOps / CI / Docker / Helm / Workflows | `devops_agent.md` |
| Cross-repo / workspace-wide stack | `basic_stack.md` |


### Jira MCP server
A Jira MCP server is configured in `.vscode/mcp.json` using [mcp-atlassian](https://github.com/sooperset/mcp-atlassian). It runs in read-only mode and gives Copilot direct access to ticket data without leaving the editor.

Since the .vscode folder is ignored by Git, an example for the MCP config lies in `.mcp.json.example`. Copy this example to your .vscode folder.

**Setup:**
1. Create `.env.mcp` in the workspace root (ignored by Git).
2. Populate it with Jira URL and your Jira PAT (Personal Access Token):
  ```
  JIRA_URL=https://jira.example.com
  JIRA_PERSONAL_TOKEN=your_personal_access_token_here
  ```
3. Install `uvx` locally on your system, if not present.
4. Start the MCP server

**Usage:** In Agent mode only, reference a ticket by key (e.g. `SPSH-1234`) and Copilot will fetch the current ticket data via the MCP tool.

## Umgebungen

Die Default-Umgebung ist in der playwright.config.ts konfiguriert (dotenv.config)

### .env.dev(Default, main)

### .env.devTest

### .env.local

### .env.staging

## ESLint ausführen

npm run lint

## Testdatenerstellung durch die Playwright-Tests

Neue Testdaten, die während der Testausführung erstellt werden, haben den Prefix 'TAuto-PW-', gefolgt von einem Buchstaben für den Typ des Objekts + einen Zufallswert
aus faker oder einem festen Wert. Der Name einer Rolle ist z.B. TAuto-PW-R-xxxxxxxxx. Somit ist es einfacher, die Testdaten zu erkennen, die durch die Playwright-Tests erstellt wurden.

## Hinweise für die Entwicklung der Tests

### Während der Entwicklung nur einen Test markieren, der alleine ausgeführt wird(temporär only hinzufügen in dem Test)

test.only('2 Schulen nacheinander anlegen', async ({ page }: PlaywrightTestArgs) => {

## Definition Testsuiten

Die Testsuiten werden über Tags definiert. Siehe docs/tags.md
