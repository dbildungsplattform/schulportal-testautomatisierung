# DevOps & Runtime Environment (schulportal-testautomatisierung)

> **CRITICAL RULE FOR AI:** You MUST NOT run any command listed in this file without first asking the user for explicit confirmation. This applies to every command, including installs, test runs, formatting, and generation commands. Always describe what the command will do and ask: "Should I run this?" before proceeding.

---

## Scope

This repository is an **E2E Playwright test automation project**.

- It does **not** host local backend services.
- It does **not** require local PostgreSQL, Keycloak, Redis, Kafka, or Docker Compose for standard local execution.
- Tests run against a target environment provided through `FRONTEND_URL`.

> If a user explicitly asks for full-stack local backend setup, treat that as a **cross-repo task** and request the backend repository context before giving commands.

---

## Prerequisites

| Requirement | Version / Status | Notes |
|---|---|---|
| Node.js (local preferred) | `24.x` (target parity, e.g. `24.16.0`) | Preferred local runtime target for this project documentation |
| Node.js (current CI) | `22` | Currently configured in `.github/workflows/run-playwright.yml` |
| npm | Bundled with installed Node.js | No explicit npm version is enforced in `package.json` |
| Playwright browsers | Required | Install with `npx playwright install --with-deps` |
| Test credentials | Required | At minimum: `USER`, `PW`, `FRONTEND_URL` |

---

## Version Parity (Local vs CI)

Nice to know:

- Local documentation target: Node `24.x`
- CI runtime: Node `22`

Where the CI version is currently defined:

- `.github/workflows/run-playwright.yml` (`actions/setup-node`, `node-version: 22`)

If the team later decides to align CI with Node 24, useful places to note that decision are:

1. Keep this section updated in this file.
2. Document the implementation plan and rollout in the PR/ticket that updates the workflow.

---

## First-Time Setup

> **AI:** Present only the relevant steps and ask which one to run. Never execute automatically.

### Step 1 — Install dependencies
```bash
npm ci
```

### Step 2 — Install Playwright browsers and OS dependencies
```bash
npx playwright install --with-deps
```

### Step 3 — Configure environment variables
Use a `.env` file in project root or pass variables inline when starting tests.

Minimum required:

```env
USER="<username>"
PW="<password>"
FRONTEND_URL="https://main.dev.spsh.dbildungsplattform.de/"
```

For environments with enforced 2FA (for example stage), also set:

```env
OTP_SEED_B32="<base32-seed>"
```

---

## Environment Variables

| Variable | Required | When |
|---|---|---|
| `USER` | Yes | Always |
| `PW` | Yes | Always |
| `FRONTEND_URL` | Yes | Always |
| `OTP_SEED_B32` | Conditional | Required when initial login user requires 2FA (commonly stage) |
| `LDAP_URL` | Conditional | Required for scenarios with LDAP operations |
| `LDAP_ADMIN_USER` | Conditional | Required for LDAP operations in environments that need bind DN |
| `LDAP_ADMIN_PASSWORD` | Conditional | Required for LDAP operations |

---

## Local Test Execution

### Run all tests
```bash
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test
```

### Run in a specific browser project
```bash
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test --project chromium
```

### Run by tag
```bash
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test -g "@dev"
```

### Run by keyword
```bash
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test -g "keyword"
```

### Enable tracing
```bash
USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test --trace on
```

### Debug mode
```bash
PWDEBUG=1 USER='xxx' PW='xxx' FRONTEND_URL='https://main.dev.spsh.dbildungsplattform.de/' npx playwright test
```

### Open last report
```bash
npx playwright show-report
```

---

## Command Reference (Repository-Valid)

> **AI:** Only suggest commands that are documented here or in project docs, and ask for confirmation before executing any of them.

### npm scripts (`package.json`)

| Command | Effect |
|---|---|
| `npm ci` | Install exact dependency versions from lockfile |
| `npm run lint` | Run ESLint with autofix |
| `npm run lint:ci` | Run ESLint without autofix |
| `npm run type-check` | Run TypeScript check (`tsc --noEmit`) |
| `npm run format` | Format TypeScript files with Prettier |
| `npm run check-format` | Check TypeScript formatting with Prettier |
| `npm run format:spec` | Format `base/api/openapispec.json` |
| `npm run check-format:spec` | Check formatting of `base/api/openapispec.json` |
| `npm run generate-api` | Regenerate API client from configured OpenAPI source |

### Playwright CLI

| Command | Effect |
|---|---|
| `npx playwright install --with-deps` | Install browser binaries and required OS packages |
| `npx playwright test` | Run Playwright test suite |
| `npx playwright show-report` | Open latest Playwright HTML report |
| `npx playwright codegen <url>` | Start Playwright recorder for selector/test exploration |

---

## CI/CD Overview

CI runs on **GitHub Actions** in this repository.

- Reusable workflow: `.github/workflows/run-playwright.yml`
- Trigger workflows include:
  - `.github/workflows/run-playwright-pullrequest-main.yml`
  - `.github/workflows/run-playwright-push-main.yml`
  - `.github/workflows/run-playwright-scheduled.yml`
  - `.github/workflows/run-playwright-smoke-stage.yml`
- Supporting workflows:
  - `.github/workflows/auto-tag-release.yml` — creates release tags
  - `.github/workflows/check-sonarcloud-on-push.yml` — runs SonarCloud analysis on pushes

Current reusable workflow behavior:

- Uses `actions/setup-node` with Node `22`
- Runs quality gates: `npm run type-check`, `npm run lint:ci`, `npm run check-format`
- Installs browsers with `npx playwright install --with-deps`
- Executes tests in shards (`--shard=1/3`, `2/3`, `3/3`)
- Uploads Playwright reports as artifacts

Dev-tag workflows additionally perform LDAP tunnel preparation before tests.

---

## Troubleshooting

> **AI:** Use read-only diagnostics first. Ask for confirmation before running any command.

| Symptom | Diagnosis | Likely fix |
|---|---|---|
| Browser executable missing | Check whether Playwright browsers were installed | Run `npx playwright install --with-deps` |
| `FRONTEND_URL` not reachable | Open URL in browser / verify target environment availability | Correct URL or wait for target environment |
| Login fails immediately | Verify `USER`/`PW` values and target environment | Correct credentials or environment |
| 2FA login fails | Check whether `OTP_SEED_B32` is set and valid | Set/update correct seed for initial user |
| LDAP-related test failures | Verify `LDAP_URL` and LDAP admin credentials are present | Provide LDAP vars and ensure tunnel/connectivity |
| Type or lint checks fail | Run `npm run type-check` and `npm run lint:ci` | Fix reported issues before rerunning full suite |

---

## AI Operating Rules (Repo-Specific)

1. Always ask for explicit confirmation before executing any command.
2. Do not suggest backend-service orchestration commands (`docker compose`, DB migrations, backend `npm run start`) for this repository.
3. Only suggest commands present in this repository's `package.json` or established Playwright CLI usage.
4. If the user requests cross-repo environment setup, state that backend setup belongs to a separate repository and ask for that repository context.
5. Keep recommendations scoped to Playwright E2E automation unless the user explicitly requests broader infrastructure guidance.