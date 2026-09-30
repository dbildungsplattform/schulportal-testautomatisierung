# Vuetify Autocomplete Inspection

Load this reference only when implementing or debugging autocomplete/dropdown interactions.

## Known Failure Modes

- A dropdown can briefly show no data while its API request is pending. Open it, then call `Autocomplete.waitUntilLoadingIsDone()` before inspecting options.
- Search results can rerender after each keystroke and detach a previously resolved option.
- Vuetify retains closed overlays in the DOM. Scope options to `div.v-overlay--active`.
- Avoid positional selectors unless the UI provides no stable semantic alternative.

## Established Interaction Pattern

```ts
await selectLocator.locator('input').click();
await selectLocator.locator('input').pressSequentially(searchText);

const autocomplete: Autocomplete = new Autocomplete(this.page, selectLocator);
await autocomplete.waitUntilLoadingIsDone();

const option: Locator = this.page
  .locator('div.v-overlay--active')
  .getByRole('option')
  .filter({ hasText: searchText });
await option.click({ force: true });
```

Use `force: true` only when observed rerendering causes Playwright's stability check to fail. Prefer a unique test ID or exact semantic locator when one is available.
