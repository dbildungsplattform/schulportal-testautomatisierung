# Schulportal Testautomatisierung — AI Agent Router

> **Mandatory entry point.** Read this file completely before taking any action in this repository.

> **Maintainers:** `.github/copilot-instructions.md` is a symlink to this file. Edit only `AGENTS.md` — never edit the symlink directly.

---

## Step 1 — Bootstrap (ALWAYS first)

**MUST** read the instruction file matched in Step 3 before writing code or giving advice.

Only read `.github/instructions/basic_stack.md` when the routing table directs you to it (DevOps topics or no-match). It documents the full workspace and is only relevant for cross-repo context.

---

## Step 2 — Global Hard Constraints

These rules override everything else in every response and context.

| #   | Constraint                                                                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Language:** All code, comments, variable names, and responses are in **English**. Exception: official German administrative domain terms (e.g. `Personenkontext`, `Schulstrukturknoten`, `Befristung`, `Zuordnung`, `Rolle`). Never translate domain terms.                          |
| 2   | **No context-free changes:** Never modify code without first reading the target file and its surrounding context. Never edit based on a path or symbol name alone.                                                                                                                     |
| 3   | **No terminal edits:** Never use shell commands to edit files. Use file write/edit tools only.                                                                                                                                                                                         |
| 4   | **No hallucinated tools:** Only use build commands, scripts, and npm run targets documented in this project. Never invent commands.                                                                                                                                                    |
| 5   | **No hallucinated frameworks:** Only use libraries and frameworks that appear in `package.json`. Never import undeclared packages.                                                                                                                                                     |
| 6   | **No commands without permission:** Never run any shell command, terminal command, or npm script without explicit user confirmation. This includes installs, builds, starts, and Docker operations.                                                                                    |
| 7   | **Auto-generated files are read-only:** Never edit anything under `base/api/generated/`. Regenerate with `npm run generate-api` — but ask the user first.                                                                                                                              |
| 8   | **Scope discipline:** Only implement what was explicitly asked. Never add unrequested features, refactors, helpers, error handling, comments, or docstrings — even if they seem like improvements.                                                                                     |
| 9   | **One concern per response:** Never bundle edits that serve different concerns into one change. Independent edits that serve the _same_ concern may be applied in parallel.                                                                                                            |
| 10  | **Validate after every edit:** After modifying any TypeScript file, check TypeScript and ESLint errors before declaring the task complete.                                                                                                                                             |
| 11  | **No unnecessary file creation:** Never create a new file when the change can be made in an existing one. New files require explicit justification.                                                                                                                                    |
| 12  | **No assumptions:** When requirements are ambiguous, ask. Do not infer intent and proceed silently.                                                                                                                                                                                    |
| 13  | **No cross-repo edits without consent:** Never modify production code in `../schulportal-client` without first asking the user and explaining why the change is needed. Read-only inspection of test IDs, routes, or component behavior is allowed; edits require explicit permission. |

---

## Step 3 — Route to the Right Agent

Identify the primary topic, then read the matching instruction file **before** acting.

| Topic                  | Instruction file                         | Keywords                                                                                                                                                                              |
| :--------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Playwright E2E testing | `.github/instructions/testing_agent.md`  | `Playwright`, `E2E`, `end-to-end`, `spec`, `test`, `page object`, `POM`, `fixture`, `tag`, `global-setup`, `global-teardown`, `selector`, `assertion`, `helper`, `test data`, `faker` |
| Frontend under test    | `.github/instructions/frontend_agent.md` | `Vue`, `Vuetify`, `Pinia`, `router`, `i18n`, `SCSS`, `component`, `view`, `store`, `composable`, `form`, `validation` — use only to understand the application being tested           |
| Code review            | `.github/instructions/review_agent.md`   | `review`, `PR`, `code review`, `refactor`, `analyse`, `smell`, `quality`                                                                                                              |
| Runtime & CI           | `.github/instructions/devops_agent.md`   | `environment`, `FRONTEND_URL`, `env var`, `CI`, `GitHub Actions`, `workflow`, `Playwright execution`, `browser install`, `sharding`, `local setup`                                    |
| Cross-repo / no-match  | `.github/instructions/basic_stack.md`    | Workspace-wide stack, infrastructure, or when none of the above apply                                                                                                                 |

> If a request spans multiple topics, read **all** matching instruction files before proceeding.

### Cross-repo awareness

The `schulportal-client` repository is available at `../schulportal-client`. Read its instruction files when a test change requires understanding or adjusting frontend test IDs, component behavior, or routes.

### Editor skills & prompts

This repository also provides editor-invoked helpers under `.github/skills/` (e.g. `create-page-object`) and `.github/prompts/`. Use them when the request matches their documented purpose.

## Jira Integration

Whenever a prompt references a ticket matching `SPSH-\d+`, **MUST** immediately call the Jira MCP tool (`jira_get_issue` or `jira_search`) to fetch current ticket data before responding. Never answer from memory or context alone.

### Fetching complete Xray test steps

Only when explicitly asked for **all/complete/every** test step of a ticket (Xray "Manuelle Testschritte", `customfield_12204`):

1. Call `jira_get_issue` with `fields: customfield_12204,customfield_12206` and `expand: renderedFields`.
2. If the result is written to a session-resource file, do **NOT** read it with the file-reading tool — long single-line step text is silently truncated at 2000 chars per line, cutting steps off mid-text.
3. Ask the human user once per session which extraction tool to use — `jq` (default/recommended), `python3`, or `node` — unless they already named one in their prompt. Reuse that choice for the rest of the conversation.
4. Run the matching template below against the session-resource file to reflow each step onto short multi-line output:

   `jq`:
   ```
   jq -r '.result | fromjson | .customfield_12204.value.steps[] | "- [ ] Step \(.index)\n  **Action:** \(.fields.Action)\n  **Data:** \(.fields.Data)\n  **Expected:** \(.fields["Expected Result"])\n"'
   ```

   `python3`:
   ```
   python3 -c "
   import json, sys
   with open(sys.argv[1]) as f:
       data = json.load(f)
   steps = json.loads(data['result'])['customfield_12204']['value']['steps']
   for s in steps:
       fld = s['fields']
       print(f\"- [ ] Step {s['index']}\")
       print(f\"  **Action:** {fld.get('Action','')}\")
       print(f\"  **Data:** {fld.get('Data','')}\")
       print(f\"  **Expected:** {fld.get('Expected Result','')}\")
       print()
   " <content.json path>
   ```

   `node`:
   ```
   node -e "
   const fs = require('fs');
   const raw = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
   const steps = JSON.parse(raw.result).customfield_12204.value.steps;
   for (const s of steps) {
     const f = s.fields;
     console.log('- [ ] Step ' + s.index);
     console.log('  **Action:** ' + (f.Action || ''));
     console.log('  **Data:** ' + (f.Data || ''));
     console.log('  **Expected:** ' + (f['Expected Result'] || ''));
     console.log();
   }
   " <content.json path>
   ```

5. Never log in to Jira via browser to retrieve steps — MCP tool plus one of the above extraction tools is the only sanctioned path.
