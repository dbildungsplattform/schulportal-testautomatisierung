# Project Tech Stack & Architecture — Schulportal Platform (Workspace Scope)

> **Scope:** Applies to the repositories available in this workspace:
> - `schulportal-client` — Vue SPA frontend
> - `schulportal-testautomatisierung` — Playwright E2E test suite

---

## Global Rules

- **Language:** All code, comments, commit messages, and agent instructions are in **English**. Exception: domain object names and route paths that reflect official German administrative terminology (e.g. `Personenkontext`, `Schulstrukturknoten`, `Befristung`) are kept in German.
- **Node.js version:** `24.x` is the platform target; Docker builds pin `24.16.0`.
- **Package manager:** `npm` (npm `>=11.10.0`). Never use `yarn` or `pnpm`.
- **License:** EUPL-1.2 in both repositories.
- **Code quality:** SonarCloud is used for static analysis. Coverage reports use Istanbul/lcov.
- **CI/CD:** GitHub Actions workflows exist in both repositories.

---

## Repository Overview

### 1. `schulportal-client` — Frontend SPA

| Category | Technology |
|---|---|
| Framework | Vue 3 `^3.5` (Composition API, `<script setup>`) |
| Language | TypeScript `^5.9` |
| UI Library | Vuetify 4 `^4.1`, Material Design Icons (`@mdi/font`) |
| State | Pinia `^3.0` |
| Routing | Vue Router `^5.1` |
| i18n | Vue I18n `^11.4` (locale: `de`) |
| Forms | vee-validate `^4.15` + yup `^1.7` + `@vee-validate/yup` |
| HTTP | Axios `^1.17` |
| Date utilities | date-fns `^4.4` |
| Build | Vite `^8.0` |
| Tests | Vitest `^4.1`, jsdom, `@vue/test-utils`, `axios-mock-adapter` |
| Test data | `@faker-js/faker` via `test/DoFactory.ts` |
| Linting | ESLint 9 flat config + `eslint-plugin-vue` + `typescript-eslint` |
| Formatting | Prettier `^3.8` |
| Web server | Nginx `1.31.1-alpine` serving static build and proxying `/api` |
| API contract | OpenAPI client generated under `src/api-client/generated/` via `openapi-generator-cli` |

**Key architecture notes:**
- Routes use `AppRouteMeta` with `requiresAuth`, `layout`, `requiredStepUpLevel` (`NONE`/`SILVER`/`GOLD`), and `requiresPermission`.
- Two layouts are used: `AdminLayout` (authenticated area) and `DefaultLayout` (public).
- CSRF token handling is wired through `AuthStore` and Axios request interception in `ApiService`.
- The Vuetify theme is named `shTheme` in `src/plugins/vuetify.ts`.
- CSP nonces are injected by Nginx via `$request_id` in `nginx-vue.conf`.

---

### 2. `schulportal-testautomatisierung` — E2E Test Suite

| Category | Technology |
|---|---|
| Framework | Playwright `^1.58` |
| Language | TypeScript `^5.6` (ESM) |
| Pattern | Page Object Model (POM) — page classes in `pages/`, specs grouped by domain in `tests/` |
| Browser projects | `chromium`, `firefox`, `webkit`, `msedge`, `chrome` |
| API client | OpenAPI client generated under `base/api/generated/` via `openapi-generator-cli` |
| Test data | `@faker-js/faker` |
| 2FA | `totp-generator` + `jsqr` + `pngjs` for QR-based TOTP setup |
| CSV | `@fast-csv/format` + `@fast-csv/parse` |
| LDAP | `ldapts ^7` (direct LDAP checks in assertions) |
| Date utilities | `date-fns ^4`, `moment ^2` |
| Password generation | `generate-password-ts` |
| Random strings | `ts-randomstring` |
| MCP integration | `@playwright/mcp` |
| Linting | ESLint 9 + `eslint-plugin-playwright` |
| Formatting | Prettier `^3.8` |

**Test execution:**
- `globalSetup` bootstraps admin users via backend APIs before test execution.
- `globalTeardown` removes created test data after the run.
- Execution defaults: `workers = 4`, `maxFailures = 2`, retries `2` on CI (`0` locally).
- Global timeout is `90s`; WebKit project timeout is `150s`.
- Target environment is configured via `.env.dev` / `.env.local` / `.env.stage` (`FRONTEND_URL`).
- Artifacts are stored in `playwright-report/`, `test-results/`, and `test-downloads/`.

**Primary test areas covered:**
`Authentifizierung`, `Klassen`, `Navigation`, `Personen`, `Profile`, `Rollen`, `Schulen`, `Service-Provider`, `Start`, `ZweiFaktorAuth`, `InbetriebnahmePasswort`, `LandesbedienstetenSuchenUndHinzufügen`

---

## Infrastructure & Deployment (Workspace Scope)

| Component | Technology | Notes |
|---|---|---|
| Frontend container image | Docker multi-stage build | Builder: `node:24.16.0-alpine3.24`; runtime: `nginx:1.31.1-alpine3.23` |
| Frontend web server | Nginx | Serves Vue SPA, proxies `/api`, injects CSP nonce placeholder replacement |
| Helm chart | Kubernetes + Helm | Present in `schulportal-client/charts/schulportal-client/` |
| CI/CD | GitHub Actions | Both repos provide repository-specific workflows |
| Code analysis | SonarCloud | Configured via `sonar-project.properties` in both repos |
| E2E runtime model | Node.js + Playwright | Test suite runs against target environments configured by `FRONTEND_URL` |