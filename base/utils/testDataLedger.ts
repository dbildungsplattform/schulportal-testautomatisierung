import type { BrowserContext, Page, Response } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Records the IDs of all test data created during a run, so global teardown deletes exactly
 * that data instead of searching by name. Setup, workers and teardown run in separate
 * processes; each process appends to its own file below `.test-data-ledger/<TEST_RUN_ID>/`.
 */
export type LedgerEntityType = 'person' | 'personUsername' | 'rolle' | 'angebot' | 'klasse' | 'organisation' | 'import';

export interface LedgerEntry {
  type: LedgerEntityType;
  id: string;
}

const ledgerRoot: string = fileURLToPath(new URL('../../.test-data-ledger', import.meta.url));

export function initializeTestRunId(): void {
  process.env.TEST_RUN_ID ??= randomUUID();
  console.log(`TEST_RUN_ID: ${getTestRunId()}`);
}

function getTestRunId(): string {
  const runId: string | undefined = process.env.TEST_RUN_ID;
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) {
    throw new Error('TEST_RUN_ID must be initialized and contain only letters, digits, underscores, and hyphens.');
  }
  return runId;
}

function getLedgerDir(): string {
  return path.join(ledgerRoot, getTestRunId());
}

export function recordCreatedEntity(type: LedgerEntityType, id: string): void {
  const ledgerDir: string = getLedgerDir();
  mkdirSync(ledgerDir, { recursive: true });
  appendFileSync(path.join(ledgerDir, `${process.pid}.jsonl`), JSON.stringify({ type, id }) + '\n');
}

export function readLedger(): LedgerEntry[] {
  const ledgerDir: string = getLedgerDir();
  if (!existsSync(ledgerDir)) {
    return [];
  }

  const unique = new Map<string, LedgerEntry>();
  for (const file of readdirSync(ledgerDir).filter((name: string) => name.endsWith('.jsonl'))) {
    for (const line of readFileSync(path.join(ledgerDir, file), 'utf8').split('\n')) {
      if (line.trim() === '') continue;
      const entry: LedgerEntry = JSON.parse(line) as LedgerEntry;
      unique.set(`${entry.type}:${entry.id}`, entry);
    }
  }
  return [...unique.values()];
}

export function removeLedger(): void {
  rmSync(getLedgerDir(), { recursive: true, force: true });
}

/**
 * Inspects a backend response and records the entities it created.
 * Shared by the API helpers (via the Playwright fetch adapter) and UI flows (via `trackCreatedEntities`).
 */
export async function recordCreatedEntitiesFromResponse(
  method: string,
  url: string,
  status: number,
  readJson: () => Promise<unknown>,
): Promise<void> {
  if (status < 200 || status >= 300) return;

  const pathname: string = new URL(url).pathname;
  const isPost: boolean = method.toUpperCase() === 'POST';

  if (isPost && pathname === '/api/personenkontext-workflow') {
    const body = (await readJson()) as { person: { id: string } };
    recordCreatedEntity('person', body.person.id);
  } else if (isPost && pathname === '/api/organisationen') {
    const body = (await readJson()) as { id: string; typ?: string };
    recordCreatedEntity(body.typ === 'KLASSE' ? 'klasse' : 'organisation', body.id);
  } else if (isPost && pathname === '/api/rolle') {
    const body = (await readJson()) as { id: string };
    recordCreatedEntity('rolle', body.id);
  } else if (isPost && pathname === '/api/provider') {
    const body = (await readJson()) as { id: string };
    recordCreatedEntity('angebot', body.id);
  } else if (isPost && pathname === '/api/import/upload') {
    const body = (await readJson()) as { importvorgangId: string };
    recordCreatedEntity('import', body.importvorgangId);
  } else if (method.toUpperCase() === 'GET' && pathname === '/api/import/importedUsers') {
    // The frontend deletes the Importvorgang after the result download, so imported Personen
    // must be recorded while their usernames are still available.
    const body = (await readJson()) as { importedUsers: { benutzername: string }[] };
    for (const user of body.importedUsers) {
      recordCreatedEntity('personUsername', user.benutzername);
    }
  }
}

const trackedContexts = new WeakSet<BrowserContext>();

/**
 * Records entities created through the UI of any page in the page's browser context.
 */
export function trackCreatedEntities(page: Page): void {
  const context: BrowserContext = page.context();
  if (trackedContexts.has(context)) return;
  trackedContexts.add(context);

  context.on('response', (response: Response) => {
    recordCreatedEntitiesFromResponse(response.request().method(), response.url(), response.status(), () =>
      response.json(),
    ).catch((error: unknown) => console.warn(`[WARN] Could not record test data from ${response.url()}:`, error));
  });
}
