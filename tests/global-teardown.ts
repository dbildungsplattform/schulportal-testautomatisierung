import { Browser, BrowserContext, chromium, Page } from '@playwright/test';

import {
  ApiResponse,
  ManageableServiceProviderSimpleListEntryResponse,
  OrganisationenApi,
  OrganisationResponse,
  OrganisationsTyp,
  PersonenApi,
  PersonendatensatzResponse,
  PersonenFrontendApi,
  PersonFrontendControllerFindPersons200Response,
  ProviderApi,
  ProviderControllerFindRollenerweiterungenByServiceProviderId200Response,
  ProviderControllerGetManageableServiceProviders200Response,
  ResponseError,
  RolleApi,
  RollenerweiterungWithExtendedDataResponse,
  RolleWithServiceProvidersResponse,
} from '../base/api/generated';
import { constructOrganisationApi } from '../base/api/organisationApi';
import { constructPersonenApi, constructPersonenFrontendApi } from '../base/api/personApi';
import { constructRolleApi } from '../base/api/rolleApi';
import { constructProviderApi } from '../base/api/serviceProviderApi';
import { loginAndNavigateToAdministration } from '../base/testHelperUtils';

const FRONTEND_URL: string = process.env.FRONTEND_URL ?? '';
const shardIndex = process.env.SHARD_INDEX ?? '0';
const shardLetter = String.fromCharCode(65 + parseInt(shardIndex, 10)); // 0→A, 1→B, 2→C

const testDataPrefix: string = `TAuto-PW-S${shardIndex}`;
const personDataPrefix = `TAuto-PW-S${shardLetter}`;
const limit: number = 100;
const batchSize: number = 20;

async function logDeleteError(reason: unknown): Promise<void> {
  if (reason instanceof ResponseError) {
    const body: string = await reason.response.text();
    console.error(`cleanup: delete failed (${reason.response.status} ${reason.response.url})`, body);
  } else {
    console.error('cleanup: delete failed', reason);
  }
}

async function cleanup<T>(get: () => Promise<T[]>, del: (item: T) => Promise<void>): Promise<void> {
  let items: T[] = await get();
  do {
    for (const promise of getBatchedDelPromise(items, del)) {
      const results: PromiseSettledResult<void>[] = await promise;
      for (const result of results) {
        if (result.status === 'rejected') {
          await logDeleteError(result.reason);
        }
      }
    }
    items = await get();
  } while (items.length > 0);
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
  console.log('Global teardown started');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // fresh browser/session per attempt: a disposed request context can't be reused, cleanup queries are idempotent (prefix-based)
    const browser: Browser = await chromium.launch();
    const context: BrowserContext = await browser.newContext({
      baseURL: FRONTEND_URL,
      ignoreHTTPSErrors: true,
    });
    const page: Page = await context.newPage();

    try {
      await runCleanup(page);
      console.log('Global teardown finished successfully');
      return;
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

async function runCleanup(page: Page): Promise<void> {
  {
    const personApi: PersonenApi = constructPersonenApi(page);
    const personFrontendApi: PersonenFrontendApi = constructPersonenFrontendApi(page);
    const rolleApi: RolleApi = constructRolleApi(page);
    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const providerApi: ProviderApi = constructProviderApi(page);

    console.log('Login');
    await loginAndNavigateToAdministration(page, process.env.USER!, process.env.PW!);

    // ---------------------------------------------------------------------
    // PERSONEN LÖSCHEN
    // ---------------------------------------------------------------------
    console.log('Personen löschen');

    await cleanup(
      async () => {
        const resp: PersonFrontendControllerFindPersons200Response =
          await personFrontendApi.personFrontendControllerFindPersons({
            suchFilter: personDataPrefix,
            limit,
          });
        console.log(`${resp.total} personen to delete`);
        return resp.items;
      },
      async (item: PersonendatensatzResponse) =>
        await personApi.personControllerDeletePersonById({ personId: item.person.id }),
    );

    // ---------------------------------------------------------------------
    // ROLLEN LÖSCHEN
    // ---------------------------------------------------------------------
    console.log('Rollen löschen');

    await cleanup(
      async () => {
        const wrappedResponse: ApiResponse<RolleWithServiceProvidersResponse[]> =
          await rolleApi.rolleControllerFindRollenRaw({
            searchStr: testDataPrefix,
            limit,
          });
        console.log(`${wrappedResponse.raw.headers.get('X-Paging-Total')} rollen to delete`);
        return wrappedResponse.value();
      },
      async (item: RolleWithServiceProvidersResponse) =>
        await rolleApi.rolleControllerDeleteRolle({ rolleId: item.id }),
    );

    // ---------------------------------------------------------------------
    // ANGEBOTE LÖSCHEN
    // ---------------------------------------------------------------------
    // Muss vor dem Löschen der Schulen passieren: Schulen können offenbar nicht gelöscht werden,
    // solange irgendein Angebot (auch nur geerbt/sichtbar, nicht direkt administriert) existiert.
    // Sucht auf allen Ebenen (nicht nur Landesebene) und ignoriert Merkmale, da sonst Angebote ohne
    // VERFUEGBAR_FUER_ROLLENERWEITERUNG in der merkmal-gefilterten Schulverwaltungsliste unsichtbar
    // blieben und ihre Schule dauerhaft mit ORGANISATION_HAT_ANGEBOTE blockiert hätten.
    console.log('Angebote löschen');

    await cleanup(
      async () => {
        const wrappedResponse: ApiResponse<ProviderControllerGetManageableServiceProviders200Response> =
          await providerApi.providerControllerGetManageableServiceProvidersRaw({
            searchFilter: testDataPrefix,
            limit,
          });
        const response: ProviderControllerGetManageableServiceProviders200Response = await wrappedResponse.value();
        console.log(`${response.total} Angebote löschen`);
        return response.items;
      },
      async (item: ManageableServiceProviderSimpleListEntryResponse) => {
        await cleanup(
          async () => {
            const wrappedResponse: ApiResponse<ProviderControllerFindRollenerweiterungenByServiceProviderId200Response> =
              await providerApi.providerControllerFindRollenerweiterungenByServiceProviderIdRaw({
                angebotId: item.id,
                limit: 500,
              });
            return (await wrappedResponse.value()).items;
          },
          async (rollenerweiterung: RollenerweiterungWithExtendedDataResponse) =>
            rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges({
              angebotId: item.id,
              organisationId: rollenerweiterung.organisationId,
              applyRollenerweiterungBodyParams: {
                addErweiterungenForRolleIds: [],
                removeErweiterungenForRolleIds: [rollenerweiterung.rolleId],
              },
            }),
        );
        await providerApi.providerControllerDeleteServiceProvider({ angebotId: item.id });
      },
    );

    // ---------------------------------------------------------------------
    // KLASSEN LÖSCHEN
    // ---------------------------------------------------------------------
    console.log('Klassen löschen');

    await cleanup(
      async () => {
        const wrappedResponse: ApiResponse<OrganisationResponse[]> =
          await organisationApi.organisationControllerFindOrganizationsRaw({
            searchString: testDataPrefix,
            typ: OrganisationsTyp.Klasse,
            limit,
          });
        const items: OrganisationResponse[] = await wrappedResponse.value();
        console.log(
          'Sample klassen found:',
          items.slice(0, 10).map((i: OrganisationResponse) => i.name),
        );
        console.log(`${wrappedResponse.raw.headers.get('X-Paging-Total')} klassen to delete`);
        return items;
      },
      async (item: OrganisationResponse) =>
        organisationApi.organisationControllerDeleteOrganisation({ organisationId: item.id }),
    );

    // ---------------------------------------------------------------------
    // SCHULEN LÖSCHEN
    // ---------------------------------------------------------------------
    console.log('Schulen löschen');

    await cleanup(
      async () => {
        const wrappedResponse: ApiResponse<OrganisationResponse[]> =
          await organisationApi.organisationControllerFindOrganizationsRaw({
            searchString: testDataPrefix,
            typ: OrganisationsTyp.Schule,
            limit,
          });
        console.log(`${wrappedResponse.raw.headers.get('X-Paging-Total')} schulen to delete`);
        return wrappedResponse.value();
      },
      async (item: OrganisationResponse) => {
        // Klassen der Schule löschen (auch solche mit numerischen Namen ohne Testdaten-Präfix)
        await cleanup(
          async () => {
            const wrappedResponse: ApiResponse<OrganisationResponse[]> =
              await organisationApi.organisationControllerFindOrganizationsRaw({
                administriertVon: [item.id],
                typ: OrganisationsTyp.Klasse,
                limit,
              });
            return wrappedResponse.value();
          },
          async (klasse: OrganisationResponse) =>
            organisationApi.organisationControllerDeleteOrganisation({ organisationId: klasse.id }),
        );

        return organisationApi.organisationControllerDeleteOrganisation({ organisationId: item.id });
      },
    );
  }
}
