import { Browser, BrowserContext, chromium, Page } from '@playwright/test';

import { constructApi } from '../base/api/apiFactory';
import {
  ApiResponse,
  ImportApi,
  ImportResultResponse,
  OrganisationenApi,
  OrganisationResponse,
  OrganisationsTyp,
  PersonControllerFindPersons200Response,
  PersonendatensatzResponse,
  PersonenApi,
  ProviderApi,
  ProviderControllerFindRollenerweiterungenByServiceProviderId200Response,
  ResponseError,
  RolleApi,
  RollenerweiterungWithExtendedDataResponse,
} from '../base/api/generated';
import { constructOrganisationApi } from '../base/api/organisationApi';
import { constructPersonenApi } from '../base/api/personApi';
import { constructRolleApi } from '../base/api/rolleApi';
import { constructProviderApi } from '../base/api/serviceProviderApi';
import { loginAndNavigateToAdministration } from '../base/testHelperUtils';
import { LedgerEntityType, LedgerEntry, readLedger, removeLedger } from '../base/utils/testDataLedger';
import { ignoreHTTPSErrors } from '../playwright.config';

const FRONTEND_URL: string = process.env.FRONTEND_URL ?? '';

const limit: number = 100;
const batchSize: number = 20;

function isNotFound(reason: unknown): boolean {
  return reason instanceof ResponseError && reason.response.status === 404;
}

async function logDeleteError(reason: unknown): Promise<void> {
  if (reason instanceof ResponseError) {
    const body: string = await reason.response.text();
    console.error(`cleanup: delete failed (${reason.response.status} ${reason.response.url})`, body);
  } else {
    console.error('cleanup: delete failed', reason);
  }
}

/**
 * Deletes all items in batches. Items that no longer exist (404) count as deleted.
 * @returns the number of failed deletions
 */
async function deleteAll<T>(items: T[], del: (item: T) => Promise<void>): Promise<number> {
  let failures: number = 0;
  for (const promise of getBatchedDelPromise(items, del)) {
    const results: PromiseSettledResult<void>[] = await promise;
    for (const result of results) {
      if (result.status === 'rejected' && !isNotFound(result.reason)) {
        failures++;
        await logDeleteError(result.reason);
      }
    }
  }
  return failures;
}

function* getBatchedDelPromise<T>(
  arr: T[],
  del: (item: T) => Promise<void>,
): Generator<Promise<PromiseSettledResult<void>[]>> {
  for (let start = 0; start < arr.length; start += batchSize) {
    yield Promise.allSettled(arr.slice(start, start + batchSize).map(del));
  }
}

const maxAttempts: number = 3;

export default async function globalTeardown(): Promise<void> {
  const ledger: LedgerEntry[] = readLedger();
  console.log(`Global teardown started: ${ledger.length} recorded test data entities`);
  if (ledger.length === 0) {
    removeLedger();
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // fresh browser/session per attempt: a disposed request context can't be reused, deletions by ID are idempotent
    const browser: Browser = await chromium.launch();
    const context: BrowserContext = await browser.newContext({
      baseURL: FRONTEND_URL,
      ignoreHTTPSErrors,
    });
    const page: Page = await context.newPage();

    try {
      const failures: number = await runCleanup(page, ledger);
      if (failures === 0) {
        removeLedger();
        console.log('Global teardown finished successfully');
        return;
      }
      console.warn(`Global teardown attempt ${attempt}/${maxAttempts}: ${failures} deletions failed`);
      if (attempt === maxAttempts) {
        console.warn('Global teardown finished with failed deletions; the ledger is kept in .test-data-ledger/');
      }
    } catch (error) {
      console.error(`Global teardown attempt ${attempt}/${maxAttempts} failed`, error);
      if (attempt === maxAttempts) {
        throw error;
      }
    } finally {
      await browser.close();
    }
  }
}

async function getImportedUsernames(importApi: ImportApi, importvorgangId: string): Promise<string[]> {
  const usernames: string[] = [];
  try {
    let total: number = 1;
    while (usernames.length < total) {
      const result: ImportResultResponse = await importApi.importControllerGetImportedUsers({
        importvorgangId,
        offset: usernames.length,
        limit: 100,
      });
      if (result.importedUsers.length === 0) break;
      total = result.total;
      usernames.push(...result.importedUsers.map((user: { benutzername: string }) => user.benutzername));
    }
  } catch (error) {
    // An import that was uploaded but never executed has no imported users.
    if (!(error instanceof ResponseError)) throw error;
  }
  return usernames;
}

async function findPersonIdByUsername(personApi: PersonenApi, username: string): Promise<string | undefined> {
  const response: PersonControllerFindPersons200Response = await personApi.personControllerFindPersons({
    suchFilter: username,
    limit: 10,
  });
  return response.items.find((item: PersonendatensatzResponse) => item.person.username === username)?.person.id;
}

async function runCleanup(page: Page, ledger: LedgerEntry[]): Promise<number> {
  {
    const personApi: PersonenApi = constructPersonenApi(page);
    const rolleApi: RolleApi = constructRolleApi(page);
    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const providerApi: ProviderApi = constructProviderApi(page);
    const importApi: ImportApi = constructApi(page, ImportApi);
    const idsOf = (type: LedgerEntityType): string[] =>
      ledger.filter((entry: LedgerEntry) => entry.type === type).map((entry: LedgerEntry) => entry.id);
    let failures: number = 0;

    console.log('Login');
    await loginAndNavigateToAdministration(page, process.env.USER!, process.env.PW!);

    // ---------------------------------------------------------------------
    // PERSONEN LÖSCHEN
    // ---------------------------------------------------------------------
    // Imported Personen are only known by username: recorded from the import result, or resolved via
    // a recorded Importvorgang that still exists (e.g. when the test failed before completing the import).
    const usernames = new Set<string>(idsOf('personUsername'));
    for (const importvorgangId of idsOf('import')) {
      for (const username of await getImportedUsernames(importApi, importvorgangId)) {
        usernames.add(username);
      }
    }
    const personIds = new Set<string>(idsOf('person'));
    for (const username of usernames) {
      const personId: string | undefined = await findPersonIdByUsername(personApi, username);
      if (personId) personIds.add(personId);
    }
    console.log(`${personIds.size} personen to delete`);

    failures += await deleteAll([...personIds], async (personId: string) =>
      personApi.personControllerDeletePersonById({ personId }),
    );

    // ---------------------------------------------------------------------
    // ROLLEN LÖSCHEN
    // ---------------------------------------------------------------------
    const rolleIds: string[] = idsOf('rolle');
    console.log(`${rolleIds.length} rollen to delete`);

    failures += await deleteAll(rolleIds, async (rolleId: string) => rolleApi.rolleControllerDeleteRolle({ rolleId }));

    // ---------------------------------------------------------------------
    // ANGEBOTE LÖSCHEN
    // ---------------------------------------------------------------------
    // Muss vor dem Löschen der Schulen passieren: Schulen können nicht gelöscht werden,
    // solange ein Angebot an ihnen existiert. Rollenerweiterungen blockieren das Löschen eines Angebots.
    const angebotIds: string[] = idsOf('angebot');
    console.log(`${angebotIds.length} angebote to delete`);

    failures += await deleteAll(angebotIds, async (angebotId: string) => {
      const wrappedResponse: ApiResponse<ProviderControllerFindRollenerweiterungenByServiceProviderId200Response> =
        await providerApi.providerControllerFindRollenerweiterungenByServiceProviderIdRaw({ angebotId, limit: 500 });
      const rollenerweiterungen: RollenerweiterungWithExtendedDataResponse[] = (await wrappedResponse.value()).items;
      for (const rollenerweiterung of rollenerweiterungen) {
        await rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges({
          angebotId,
          organisationId: rollenerweiterung.organisationId,
          applyRollenerweiterungBodyParams: {
            addErweiterungenForRolleIds: [],
            removeErweiterungenForRolleIds: [rollenerweiterung.rolleId],
          },
        });
      }
      await providerApi.providerControllerDeleteServiceProvider({ angebotId });
    });

    // ---------------------------------------------------------------------
    // KLASSEN LÖSCHEN
    // ---------------------------------------------------------------------
    const klasseIds: string[] = idsOf('klasse');
    console.log(`${klasseIds.length} klassen to delete`);

    failures += await deleteAll(klasseIds, async (organisationId: string) =>
      organisationApi.organisationControllerDeleteOrganisation({ organisationId }),
    );

    // ---------------------------------------------------------------------
    // SCHULEN (UND ANDERE ORGANISATIONEN) LÖSCHEN
    // ---------------------------------------------------------------------
    const organisationIds: string[] = idsOf('organisation');
    console.log(`${organisationIds.length} schulen/organisationen to delete`);

    failures += await deleteAll(organisationIds, async (organisationId: string) => {
      // Klassen beneath an owned Schule are owned too, including those created implicitly (e.g. by an import).
      const wrappedResponse: ApiResponse<OrganisationResponse[]> =
        await organisationApi.organisationControllerFindOrganizationsRaw({
          administriertVon: [organisationId],
          typ: OrganisationsTyp.Klasse,
          limit,
        });
      const klassen: OrganisationResponse[] = await wrappedResponse.value();
      const klassenFailures: number = await deleteAll(klassen, async (klasse: OrganisationResponse) =>
        organisationApi.organisationControllerDeleteOrganisation({ organisationId: klasse.id }),
      );
      if (klassenFailures > 0) {
        throw new Error(`${klassenFailures} Klassen beneath organisation ${organisationId} could not be deleted`);
      }

      await organisationApi.organisationControllerDeleteOrganisation({ organisationId });
    });

    return failures;
  }
}
