---
name: extend-service-provider-tests
description: "Extends the ServiceProvider visibility test with a new provider for a RollenArt. Use when adding a service provider to ServiceProviderAufStartseite.spec.ts, updating its fixture data, and registering the provider constant in base/sp.ts. Do not use when the request changes application UI/behavior, targets a different test file, or needs multi-role visibility."
argument-hint: "Provider display name, camelCase constant name, and target RollenArt"
---

# Extend Service Provider Tests

Adds one ServiceProvider to the start-page visibility coverage for exactly one `RollenArt`.

## Do Not Use When / See Also
- The request changes the application UI or ServiceProvider behavior
- A different test file owns the requested visibility behavior
- The provider should be available for multiple roles; clarify the intended scope first

## Required Inputs

Collect these values before editing:

| Input | Requirement |
|---|---|
| Provider display name | Exact label shown in the application, including capitalization and punctuation |
| Provider constant name | Existing-style camelCase TypeScript identifier |
| Target role | Exact member name of `RollenArt`, for example `Lehr` |

If any input is missing or ambiguous, ask the user before editing.

## Preflight Checks

Read the target files and verify all of the following before making changes:

1. `base/sp.ts` exists and contains the ServiceProvider constants.
2. `tests/start/ServiceProviderAufStartseite.data.ts` exists and contains `testFixtures`.
3. `tests/start/ServiceProviderAufStartseite.spec.ts` exists and contains `allProviderNames`.
4. `RollenArt.<target_role>` exists in the generated API types. Do not edit generated files.
5. The provider constant name is not already declared in `base/sp.ts`.
6. The provider display name is not already registered under a different constant in `base/sp.ts`.
7. The provider is not already present in the target role's `serviceProviderNames`.
8. The provider is not already present in `allProviderNames`.

If the target role is unknown, stop and ask the user for the exact `RollenArt` member. If any provider check detects an existing declaration or registration, stop and ask whether the request is an adjustment rather than an addition. Do not duplicate entries or silently change existing coverage.

## Required Changes

Make only these changes:

1. In `base/sp.ts`, add:

   ```ts
   export const <provider_constant_name>: string = '<provider_display_name>';
   ```

   Place it with the other ServiceProvider constants and preserve the file's existing ordering style.

2. In `tests/start/ServiceProviderAufStartseite.data.ts`:
   - Import `<provider_constant_name>` from `../../base/sp`.
   - Add `<provider_constant_name>` to `serviceProviderNames` only for the fixture whose `rollenArt` is `RollenArt.<target_role>`.
   - Do not alter the provider lists for other roles.

3. In `tests/start/ServiceProviderAufStartseite.spec.ts`:
   - Import `<provider_constant_name>` from `../../base/sp`.
   - Add `<provider_constant_name>` to `allProviderNames`.

`allProviderNames` must remain the complete set of known providers. The visibility assertion derives hidden providers from this list, so omitting the new provider would make the negative checks incomplete.

## Validation

After editing:

1. Run `npm run type-check`.
2. Run `npm run lint:ci -- base/sp.ts tests/start/ServiceProviderAufStartseite.data.ts tests/start/ServiceProviderAufStartseite.spec.ts`.
3. Run the focused test with the repository's Playwright command:

   ```bash
   npx playwright test tests/start/ServiceProviderAufStartseite.spec.ts --reporter=list
   ```

4. Confirm that the focused test verifies the new provider as visible for `RollenArt.<target_role>` and hidden for every other fixture role.
5. Confirm that no other role's provider list changed.

Commands require explicit user permission under this repository's agent rules. If permission is unavailable, report the exact commands that remain to be run.

## Completion Checklist

- [ ] New constant added once in `base/sp.ts`.
- [ ] New provider added only to the requested role fixture.
- [ ] New provider added to `allProviderNames`.
- [ ] Type-check passes.
- [ ] ESLint passes for the changed TypeScript files.
- [ ] Focused Playwright test passes.
