# Code Review — schulportal-testautomatisierung

> **Scope:** All PRs touching `pages/`, `tests/`, `base/`, `docs/`, or `.github/workflows/`.
> Rules are mandatory. This file governs *how to review* for the Playwright E2E repository.

---

## Behaviour Rules

**MUST NOT** comment unless confidence is >80%. When uncertain, stay silent.

**MUST** raise each problem as a **separate comment** — never bundle multiple issues.

**MUST NOT** report anything that CI already catches: Prettier formatting, TypeScript compile errors, ESLint violations, failing tests, outdated dependencies.

**MUST NOT** comment on:
- Naming style that does not cause a bug
- Missing code comments on self-documenting code
- Refactors not requested by the author
- Logging additions unless their absence creates a security or correctness gap

---

## Priority Order

Evaluate in this order. Report the highest-priority finding first.

### 1. Security

| Check | What to look for |
|---|---|
| Sensitive data exposure | No credentials, seeds, tokens, or PII in source, logs, traces, screenshots, or report artifacts (`USER`, `PW`, `OTP_SEED_B32`, `LDAP_ADMIN_PASSWORD`). |
| Hardcoded environment targets | No hardcoded environment URLs, users, or secrets in tests/pages/helpers. Target configuration MUST come from environment variables. |
| Unsafe logging | No `console.*` output that can expose user data, credentials, or internal identifiers in committed test code. |
| LDAP safety (conditional) | If a change touches LDAP-related flows/files, ensure untrusted input is not interpolated unsafely into LDAP query/filter strings. |
| Generated API client integrity | Any direct edit under `base/api/generated/` is forbidden. Instruct to regenerate via `npm run generate-api`. |

### 2. Correctness

| Check | What to look for |
|---|---|
| Async correctness | Playwright interactions and assertions MUST be awaited. Flag missing `await` on async page/test/helper calls. |
| Wait strategy stability | Avoid brittle hard waits/timeouts when web-first assertions or deterministic waits are possible. |
| Test isolation | Tests MUST not depend on execution order, shared mutable module state, or data created by another spec. |
| Setup/teardown consistency | Test data lifecycle must be coherent with `global-setup`/`global-teardown` and fixture cleanup behavior. Flag leaked or orphaned data patterns. |
| Selector robustness | Prefer stable selectors (`getByTestId`, resilient role/name selectors). Flag fragile deep CSS/XPath chains likely to break on minor UI changes. |
| 2FA flow reliability (conditional) | If 2FA-related code is changed, validate QR/TOTP flow handling and failure-path assertions for login/setup behavior. |

### 3. Architecture & Conventions

Only flag deviations that will cause bugs, flaky tests, or maintainability breakage — not style preferences.

| Check | Rule |
|---|---|
| Page Object boundaries | Functional UI logic and assertions belong in page objects; specs should orchestrate use cases, not reimplement UI interaction details. |
| Spec focus | One spec file should cover one business use case; avoid mixing unrelated flows in a single file. |
| Locator encapsulation | Tests should use page methods rather than reaching into locator internals directly. |
| Repository-valid commands only | Documentation/workflow updates must reference commands that exist in `package.json` scripts or established Playwright CLI usage. |
| Workflow realism | Workflow changes must align with actual repo setup (Node version, Playwright browser install, sharding/retries, env usage). |
| No forbidden generated edits | Direct edits to generated API sources are not allowed; regeneration is the only acceptable path. |
| Magic values | Flag hardcoded strings or numbers whose meaning is non-obvious without surrounding context. Does not apply to self-evident literals (`0`, `''`, common status codes). |
| Opaque test steps | Flag `test.step()` names that don't describe the business action being performed. Enforces the convention from `docs/best-practices.md`: names must be short, German, and outcome-focused. |
| Oversized page methods | Flag a single page method that bundles multiple unrelated UI flows. Each method should cover one coherent interaction; split when concerns diverge. |

### 4. Testing

| Check | What to look for |
|---|---|
| Coverage of changed logic | Every changed branch/flow should have corresponding spec assertions, including negative/error paths when behavior changed. |
| Flakiness risk | Flag non-deterministic patterns (implicit timing assumptions, random data without sufficient uniqueness guarantees, cross-test coupling). |
| Fixture correctness | Custom fixture setup/teardown must be complete and scoped to avoid cross-worker leakage. |
| Tag usage consistency | Tags used in specs should match project conventions and intended environment execution model. |
| External dependency assumptions | If tests depend on external systems (for example LDAP), assertions and setup must make that dependency explicit and robust. |

### 5. Docs & Workflow Changes

| Check | What to look for |
|---|---|
| Command accuracy in docs | `docs/` updates must not introduce unsupported scripts/commands or contradict current setup instructions. |
| Workflow-to-doc consistency | If `.github/workflows/` changes, verify matching assumptions in docs/instructions where relevant (runtime, shards, required env vars). |
| Secret handling in CI config | Workflow changes must not echo or expose sensitive variables in logs or artifacts. |
| Review-signal quality | Flag process text that weakens mandatory safeguards (e.g., reducing confidence threshold, permitting bundled issues). |

---

## Comment Format

Every comment **MUST** use this structure:

1. **Problem** — one sentence: what is wrong.
2. **Risk** — why it matters (omit only if self-evident).
3. **Fix** — a concrete code snippet or specific action.

**Example:**

> **Problem:** A login helper logs `process.env.USER` and `process.env.PW` on failure.
> **Risk:** Credentials can leak into CI logs and test artifacts.
> **Fix:** Remove credential logging and log only a non-sensitive error code/context.

---

## Pre-Merge Checklist

Before approving, verify:

- [ ] No hardcoded credentials, OTP seeds, or LDAP secrets in changed files
- [ ] No unsafe `console.*` usage exposing sensitive data
- [ ] No direct edits under `base/api/generated/`
- [ ] Changed Playwright interactions use proper async/await and stable waits
- [ ] Selectors are stable and page-object encapsulation is preserved
- [ ] Changed logic has spec coverage, including relevant error paths
- [ ] Fixture/setup/teardown behavior prevents cross-test data leakage
- [ ] Docs/workflow updates reference only valid repository commands and realistic runtime assumptions
- [ ] LDAP/2FA review checks were applied when those areas were part of the change