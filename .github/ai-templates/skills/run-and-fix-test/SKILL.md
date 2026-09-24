---
name: run-and-fix-test
description: "Runs a Playwright test, analyzes failures, and automatically fixes the code, repeating until the test passes. Use when a test is failing and should be fixed automatically. Do not use when the test is already green, or when the failure is outside the test code (e.g. backend unreachable, missing .env variables) — inform the user instead."
argument-hint: "Pfad zur Testdatei, z.B. tests/personen/PersonAnlegen.spec.ts"
---

# Run and Fix Test

Runs a Playwright test repeatedly and automatically fixes failures until it passes.

## Do Not Use When / See Also
- The test is already green
- The failure is outside the test code (e.g. backend unreachable, missing `.env` variables) — inform the user instead

---

## Procedure

### Step 1: Disable maxFailures
Set `maxFailures` to `0` in `playwright.config.ts` so the run doesn't abort early on failures and all tests execute:
```
maxFailures: 0,
```

### Step 2: Determine the test file
Was a path passed as an argument? If not, ask the user:
> "Which test file should be executed and fixed?"

### Step 3: Run the test
Run the test with the following command:

```bash
npx playwright test <test-file> --reporter=list
```

For a single test case (`test.only` or via title filter):
```bash
npx playwright test <test-file> --reporter=list -g "<test name>"
```

**Important — timeout:** When the test is run via a subagent (`execution_subagent`), explicitly set the timeout to **at least 600000 ms (10 min)**. Global setup/teardown plus a single test can easily take 2–3 minutes; the subagent default of 120 s would otherwise abort mid-run and the error details would be lost.

### Step 4: Evaluate the result

**Success (exit code 0):**
→ Continue with step 8 (restore maxFailures). Tell the user: test is green. Briefly describe what changed (if fixes were made).

**Failed:**
→ Continue with step 5.

### Step 5: Analyze the error
- Read the full error output from the terminal.
- **Always read the failure artifacts under `test-results/<test-folder>/` first:**
  - `error-context.md` (page snapshot at the time of failure — shows the actual DOM state)
  - `test-failed-1.png` (screenshot — open via `view_image` to see the UI state)
  These often clarify faster than the raw stack trace whether, e.g., an action never reached the DOM or an expected text is slightly off.
- Identify: error message, stack trace, affected file and line.
- Read the affected file to understand the context.
- Classify the error:

| Error type | Typical cause | Fix strategy |
|-----------|------------------|---------------|
| `TimeoutError` / `locator.waitFor` | Wrong locator, `data-testid` changed, missing `await` | Fix the locator, add the missing `await` |
| `expect(...).toHaveText` failed | Text changed in the UI, wrong locator | Adjust the expected text in the spec |
| TypeScript compile error | Wrong types, missing imports | Fix types/imports |
| `Cannot find element` | Page not loading, wrong URL/path | Check navigation |
| `Error: page.goto` | `baseURL` or routing problem | Check URL/route |
| `toBeChecked()` fails after wrapper `click()` | Vuetify radio/checkbox: clicking `[data-testid]` only hits the label wrapper, not the input | Use `.locator('input').click()` or `.check({ force: true })` directly on the input |
| `toContainText` with a similar but reordered string | UI wording deviates from the hardcoded expected text in the spec | Align the expected text in the **spec** with the UI — not the other way around |
| `TimeoutError` on a close button after a previous dialog close | The parent dialog closes automatically when confirming a sub-dialog (Vuetify modal stack) | Remove the close call; optionally verify with `waitFor({ state: 'hidden' })` that the dialog is already gone |

### Step 6: Implement the fix
- Fix only the identified error — no speculative or unrequested changes.
- Typical fixes:
  - Correct the locator (`getByTestId`, `getByRole`, `getByText`)
  - Add a missing `await`
  - Update the expected text
  - Add an import

### Step 7: Back to step 3
Run the test again. Repeat the cycle.

### Step 8: Restore maxFailures
Once all tests are green, reset `maxFailures` back to `2` in `playwright.config.ts`:
```
maxFailures: 2,
```
This ensures the original configuration is preserved and was only disabled during the fix cycle.

---

## Termination Conditions

| Condition | Action |
|-----------|--------|
| Test green | Reset maxFailures to 2 (step 8), report success, summarize changes |
| 5 iterations without progress | Stop, describe the failure pattern, ask the user for a decision |
| Infrastructure error (backend, env) | Stop immediately, inform the user |
| Error in generated API code (`base/api/generated/`) | Don't fix manually — recommend `npm run generate-api` |

---

## Project Context

- **Test framework:** Playwright with TypeScript
- **Test directory:** `tests/`
- **Page objects:** `pages/`
- **Playwright config:** `playwright.config.ts`
- **Type-check command:** `npm run type-check`
- **Locator convention:** prefer `getByTestId('<data-testid>')` from the DOM
- **Timeout (global):** 90 seconds per test, 10 seconds for `expect`
