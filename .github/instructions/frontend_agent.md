# Frontend Reference — schulportal-client

> **Scope:** Read-only reference for E2E test authors in `schulportal-testautomatisierung`. Use this file to understand how the frontend is built, how to identify selectors, and how routes, stores, and components behave. **Do NOT generate or modify frontend application code from this repository.** Frontend changes belong to `schulportal-client` and require explicit user consent.
> **Language:** Application UI is German-only. All code, comments, and this file are English.

## Core Technologies

| Tool | Version | Role |
|---|---|---|
| Vue 3 | `^3.5` | UI framework — Composition API + `<script setup>` only |
| TypeScript | `^5.9` | Strict typing; explicit annotations are linted and strongly expected |
| Vuetify 4 | `^4.1` | Component library + theming (`shTheme`) |
| Pinia | `^3.0` | Global state management |
| Vue Router | `^5.1` | Client-side routing with navigation guards |
| Vue I18n | `^11.4` | i18n — locale `de`, all strings in `de-DE.json` |
| vee-validate + yup | `^4.15` / `^1.7` | Form validation via `toTypedSchema` |
| Axios | `^1.17` | HTTP client — use only via `axiosApiInstance` |
| Vite | `^8.0` | Build tool |
| Vitest | `^4.1` | Unit + component tests (jsdom) |
| Node.js | `24.x` | Required runtime |

## Directory Structure

```
src/
  api-client/generated/   # AUTO-GENERATED — never edit; regenerate with: npm run generate-client
  assets/                 # Static assets (logos, images)
  components/             # Reusable UI components, grouped by domain
    admin/                # Shared admin components + domain subfolders
      # Core shared components: ResultTable, SearchField, LabeledField, MenuBar, SpshTooltip, RelationshipAssign
      # Domain folders: personen/, rollen/, schulen/, klassen/, schultraeger/, service-provider/, organisationen/
    alert/                # SpshAlert.vue
    cards/                # LayoutCard.vue
    dialog/               # Dialog components (e.g. BulkErrorDialog.vue)
    filter/               # Filter components
    form/                 # FormWrapper.vue, FormRow.vue, PasswordOutput.vue, …
    layout/               # TheFooter.vue, TheHeader.vue, …
    profile/              # Profile-specific components
    two-factor-authentication/
  composables/            # Vue composables — MUST follow `use` prefix naming
  layouts/                # AdminLayout.vue, DefaultLayout.vue
  locales/                # de-DE.json — ALL user-facing strings live here
  plugins/                # vuetify.ts, i18n.ts, pinia.ts
  router/                 # index.ts (guards + AppRouteMeta) + routes.ts
  services/               # ApiService.ts — single Axios instance
  stores/                 # Pinia stores + types/ subdirectory
  styles/                 # SCSS: main.scss, variables.scss, settings.scss, typography.scss + components/
  utils/                  # Pure, side-effect-free helper functions
  views/                  # Route-level page components
    admin/                # Admin views + subfolders: organisationen/, rollen/, service-provider/
test/
  DoFactory.ts            # ONLY source of test data objects — always use this, never inline fabricate
```

## Rules by Category

### 1. Components

The frontend uses `<script setup lang="ts">`. The examples below document existing patterns so E2E authors can read component code confidently. Do not write new components from this repository.

```vue
<script setup lang="ts">
  import { ref, type Ref } from 'vue';
  import { useI18n, type Composer } from 'vue-i18n';

  type Props = {
    label: string;
    disabled?: boolean;
  };
  const props: Props = defineProps<Props>();

  type Emits = {
    (event: 'onConfirm'): void;
  };
  const emit: Emits = defineEmits<Emits>();

  const { t }: Composer = useI18n({ useScope: 'global' });
  const isLoading: Ref<boolean> = ref(false);

  function handleClick(): void {
    emit('onConfirm');
  }
</script>

<template>
  <v-btn
    :disabled="props.disabled"
    :loading="isLoading"
    data-testid="my-button"
    @click="handleClick"
  >
    {{ t('someKey') }}
  </v-btn>
</template>

<style scoped lang="scss">
  @use '@/styles/variables';
</style>
```

Component spec files are co-located: `MyComponent.vue` → `MyComponent.spec.ts`.

---

### 2. Composables

Composables are named with a `use` prefix and focused on one concern.

Current composables in this repo:
- `useAutoselectedSchule`
- `useBulkErrors`
- `useKlassen`
- `useOrganisationen`
- `useRollen`
- `useSchulen`

---

### 3. TypeScript — Reference

The frontend enforces strict typing with lint-level guardrails. E2E authors should recognize these patterns when reading frontend code.

| Rule | Severity | Requirement |
|---|---|---|
| `@typescript-eslint/typedef` | `warn` | Explicit type annotation on variables, parameters, and return types |
| `@typescript-eslint/no-explicit-any` | `error` | `any` is forbidden — use `unknown` + type narrowing |
| `@typescript-eslint/explicit-function-return-type` | `error` | Every function MUST declare a return type |
| `@typescript-eslint/explicit-member-accessibility` | `error` | Every class member MUST declare `public` or `private` |
| `@typescript-eslint/no-unused-vars` | `error` | Prefix intentionally unused params/vars with `_` |
| `import/no-cycle` | `error` | Circular imports are forbidden |

`typedef` is technically a warning in ESLint config, but follow it as a mandatory project convention.

```ts
// ✅ CORRECT
const count: Ref<number> = ref(0);
const items: ComputedRef<string[]> = computed((): string[] => []);
function fetchData(id: string): Promise<void> { ... }

// ❌ WRONG — implicit types, missing return type
const count = ref(0);
const fetchData = async (id) => { ... };
```

---

### 4. Pinia Stores

The frontend follows this structure. Recognize it when inspecting store code to understand state shape and API usage patterns.

```ts
import { defineStore, type Store, type StoreDefinition } from 'pinia';
import { XApiFactory, type XApiInterface } from '@/api-client/generated/api';
import axiosApiInstance from '@/services/ApiService';
import { getResponseErrorCode } from '@/utils/errorHandlers';

// API instance MUST be at module level — never inside an action
const xApi: XApiInterface = XApiFactory(undefined, '', axiosApiInstance);

type XState = {
  currentItem: Item | null;
  errorCode: string | null;  // MUST be present on every store
  loading: boolean;   // MUST be present on every store
};

type XGetters = object;

type XActions = {
  loadItem: (id: string) => Promise<void>;
};

export type XStore = Store<'x', XState, XGetters, XActions>;

export const useXStore: StoreDefinition<'x', XState, XGetters, XActions> = defineStore('x', {
  state: (): XState => ({
    currentItem: null,
    errorCode: null,
    loading: false,
  }),
  actions: {
    async loadItem(id: string): Promise<void> {
      this.loading = true;
      try {
        const { data }: { data: Item } = await xApi.someEndpoint(id);
        this.currentItem = data;
      } catch (error: unknown) {
        this.errorCode = getResponseErrorCode(error, 'LOAD_ITEM_ERROR');
      } finally {
        this.loading = false;
      }
    },
  },
});
```

API factory instances are kept at module level. Errors set `this.errorCode` via `getResponseErrorCode`.

---

### 5. API Client

**MUST NOT** edit any file under `src/api-client/generated/` — this directory is auto-generated.

To regenerate after backend spec changes:
```bash
npm run generate-client
```

HTTP calls are routed through the shared singleton:
```ts
import axiosApiInstance from '@/services/ApiService';
```

`ApiService.ts` automatically injects the `X-CSRF-Token` header and redirects to `/api/auth/login` on `401` responses.

---

### 6. Routing

Routes use `AppRouteMeta` for metadata. Inspect route definitions to understand required permissions, layouts, auth, and step-up levels.

```ts
type Permission =
  | 'klassenverwaltung'
  | 'personenanlegen'
  | 'personenimport'
  | 'personenverwaltung'
  | 'rollenverwaltung'
  | 'angebotsverwaltung'
  | 'eingeschränktangebotsverwaltung'
  | 'schulspezifischeangebotsverwaltung'
  | 'schulverwaltung'
  | 'schultraegerverwaltung'
  | 'portalverwaltung'
  | 'hinweisebearbeiten'
  | 'landesbedienstetesuchenundhinzufügen'
  | 'limitedpersonenanlegen';

export type AppRouteMeta = {
  layout?: 'DefaultLayout' | 'AdminLayout';
  requiresAuth?: boolean;
  requiresOrga?: boolean;
  missingOrgaRedirect?: string | { name: string };
  requiredStepUpLevel?: StepUpLevel;
  requiresPermission?: Permission | Permission[];
  permissionMode?: 'any' | 'all';
  requiresFeatureFlag?: keyof FeatureFlagResponse;
  createType?: 'limited' | 'add-person-to-own-schule';
};
```

Protected routes declare `requiresAuth` and `layout`. `requiredStepUpLevel` is present where step-up is part of the flow.

```ts
// routes.ts
{
  path: '/admin/example',
  name: 'example',
  component: () => import('../views/admin/ExampleView.vue'), // lazy-loaded
  meta: {
    layout: 'AdminLayout',           // 'AdminLayout' | 'DefaultLayout'
    requiresAuth: true,
    requiredStepUpLevel: StepUpLevel.GOLD,   // when step-up is required
    requiresPermission: 'personenverwaltung', // string | string[]
  } satisfies AppRouteMeta,
},
```

Router guards in `src/router/index.ts` enforce auth, step-up, permission mode, optional organisation checks, and feature-flag gates.

---

### 7. Internationalisation (i18n)

User-facing strings live in `src/locales/de-DE.json`; templates and scripts reference keys via `t()` or `$t()`. This matters for E2E tests because asserting on visible text can be brittle when labels change.

```ts
// In <script setup>
const { t }: Composer = useI18n({ useScope: 'global' });
const label: string = t('admin.person.create');

// In <template>
{{ $t('admin.person.create') }}
:label="$t('admin.person.create')"
```

**MUST NOT** pass `useScope: 'local'` — always use the global scope.

---

### 8. Form Validation

Forms use vee-validate + yup with `toTypedSchema` and reuse regex constants from `src/utils/validation.ts`.

```ts
import { toTypedSchema } from '@vee-validate/yup';
import { useForm, type FormContext, type TypedSchema } from 'vee-validate';
import { object, string } from 'yup';
import { DIN_91379A, DDMMYYYY, NO_LEADING_TRAILING_SPACES } from '@/utils/validation';

const schema: TypedSchema = toTypedSchema(
  object({
    familienname: string().required().matches(DIN_91379A),
    befristung: string().matches(DDMMYYYY),
  }),
);

const { handleSubmit, defineField }: FormContext = useForm({ validationSchema: schema });
```

Available validators in `src/utils/validation.ts`: `DIN_91379A`, `DIN_91379A_EXT`, `DDMMYYYY`, `NO_LEADING_TRAILING_SPACES`, `HAS_LETTER_OR_NUMBER`.

Domain-specific validation helpers also exist in:
- `src/utils/validationKlasse.ts`
- `src/utils/validationPersonenkontext.ts`
- `src/utils/validationRolle.ts`
- `src/utils/validationSchultraeger.ts`

---

### 9. Styling

The frontend uses Vuetify's `v-row` / `v-col` grid for layout and scoped SCSS with `@use '@/styles/variables'`. Hardcoded hex values are avoided. Inline `style` attributes are not used in templates. `useDisplay()` from Vuetify may be used for responsive breakpoint logic.

```scss
// ✅ CORRECT
@use '@/styles/variables';
.my-element { color: variables.$primaryColor; }

// ❌ WRONG
.my-element { color: #001e49; }
```

Custom Vuetify theme token: `shTheme` — defined in `src/plugins/vuetify.ts`.

---

### 10. Accessibility (a11y)

Icon-only buttons have `aria-label` attributes. Table rows support `Enter` key activation (see `src/components/admin/ResultTable.vue`). Semantic Vuetify elements are preferred over generic `<div @click>` handlers.

---

### 11. `data-testid` Convention

`data-testid` is added to every interactive or semantically important element. Format: `kebab-case`, prefixed with the feature/component name.

```vue
<v-btn data-testid="create-person-button">…</v-btn>
<v-alert data-testid="person-creation-error-alert">…</v-alert>
<v-text-field data-testid="person-familienname-input" />
```

This convention is the primary source of stable selectors for E2E tests.

---

### 12. Testing

Component tests are co-located with source: `MyComponent.spec.ts` next to `MyComponent.vue`. The frontend uses Vitest and `@vue/test-utils`. E2E authors do not write these tests, but knowing the stack helps when reading component behavior.

```ts
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { DoFactory } from 'test/DoFactory';
import MockAdapter from 'axios-mock-adapter';
import axiosApiInstance from '@/services/ApiService';

const mockAdapter: MockAdapter = new MockAdapter(axiosApiInstance);

beforeEach((): void => {
  setActivePinia(createPinia());
  mockAdapter.reset();
});

afterEach((): void => {
  wrapper?.unmount(); // unmount to prevent memory leaks
});
```

| Rule | Requirement |
|---|---|
| Test data | Uses `DoFactory` — raw inline fabrication is avoided |
| HTTP mocking | Uses `MockAdapter` — no real network calls |
| Async store actions | `await flushPromises()` after triggering them |
| Store reset | `store.$reset()` in `beforeEach` for store unit tests |
| Global `vi` / `expect` | Available without import — Vitest globals are enabled |

---

## Anti-Patterns Reference

Patterns the frontend avoids. Recognize them when reading code; do not generate frontend fixes from this repo.

| Anti-pattern | Use instead |
|---|---|
| `any` type | `unknown` + type narrowing |
| `defineComponent` / Options API | `<script setup lang="ts">` |
| Inline `style="…"` | Vuetify props + scoped SCSS variables |
| Hardcoded German string in component | `$t('key')` + entry in `de-DE.json` |
| Editing `src/api-client/generated/` | Run `npm run generate-client` in the frontend repo |
| `axios.create()` / `new Axios()` in a component or action | `import axiosApiInstance from '@/services/ApiService'` |
| `new SomeApi()` inside an action | Module-level factory: `const api = XApiFactory(undefined, '', axiosApiInstance)` |
| Catching error without setting `errorCode` | `this.errorCode = getResponseErrorCode(error, 'FALLBACK_CODE')` |
| Missing `data-testid` | Add `data-testid="…"` to all interactive elements |
| Missing return type on function | `function foo(): ReturnType { … }` |
| Missing type annotation on variable | `const x: string = '…'` |
| Circular imports | Refactor — `import/no-cycle` is an error |