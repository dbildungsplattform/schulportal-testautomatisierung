# Tags

## Environments

Tags control which tests are run. We use this to differentiate different environments, which may have different capabilities.
For currently used tags, see base/tags.ts

| Tag         | Base functionality | LDAP | third-party systems | Login |
| ----------- | ------------------ | ---- | ------------------- | ----- |
| dev         | x                  | x    |                     |       |
| stage       | x                  |      | x                   |       |
| stage-smoke |                    |      |                     | x     |

```sh
FRONTEND_URL='https://test.dev.spsh.dbildungsplattform.de/' npx playwright test -g "@stage-smoke"
```

To assign a tag to a test:

```typescript
// tests/example.spec.ts
import { DEV, STAGE } from '../base/tags';
test(`Example test`, { tag: [STAGE, DEV] }, async () => {});
```
