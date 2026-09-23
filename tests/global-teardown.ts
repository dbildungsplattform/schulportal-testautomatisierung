import { Browser, BrowserContext, chromium, Page } from '@playwright/test';

import {
  ApiResponse,
  ManageableServiceProviderListEntryResponse,
  OrganisationenApi,
  OrganisationResponse,
  OrganisationsTyp,
  PersonenApi,
  PersonendatensatzResponse,
  PersonenFrontendApi,
  PersonFrontendControllerFindPersons200Response,
  ProviderApi,
  ProviderControllerGetAvailableServiceProviders200Response,
  ProviderControllerGetManageableServiceProvidersForOrganisationId200Response,
  ResponseError,
  RolleApi,
  RolleWithServiceProvidersResponse,
  ServiceProviderResponse,
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

export default async function globalTeardown(): Promise<void> {
  console.log('Global teardown started');

  const browser: Browser = await chromium.launch();
  const context: BrowserContext = await browser.newContext({
    baseURL: FRONTEND_URL,
    ignoreHTTPSErrors: true,
  });

  const page: Page = await context.newPage();

  try {
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
        await cleanup(
          async () => {
            const wrappedResponse: ApiResponse<ProviderControllerGetManageableServiceProvidersForOrganisationId200Response> =
              await providerApi.providerControllerGetManageableServiceProvidersForOrganisationIdRaw({
                organisationId: item.id,
                limit: 500,
              });
            const angebote: ProviderControllerGetManageableServiceProvidersForOrganisationId200Response =
              await wrappedResponse.value();
            if (angebote.total === 0) return [];

            console.log(
              `Angebote gefunden für ${item.id}:${item.name} (total=${angebote.total}, items=${angebote.items.length}):`,
              angebote.items.map((angebot) => ({
                id: angebot.id,
                name: angebot.name,
                administrationsebeneId: angebot.administrationsebene.id,
              })),
            );

            const relevanteAngebote: ManageableServiceProviderListEntryResponse[] = angebote.items.filter(
              (angebot) => angebot.name.startsWith(testDataPrefix) || angebot.administrationsebene.id === item.id,
            );

            // Rollenerweiterungen auch für geerbte (nicht von dieser Schule administrierte) Angebote entfernen,
            // da diese sonst nie gelöscht werden und die cleanup-Schleife nicht terminiert.
            for (const angebot of relevanteAngebote) {
              const rollenIds: string[] = angebot.rollenerweiterungen.map((re) => re.rolle.id);
              if (rollenIds.length > 0) {
                console.log(
                  `${angebot.rollenerweiterungen.length} Rollenerweiterungen für ${angebot.id}:${angebot.name} an ${item.id}:${item.name} löschen`,
                );
                await rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges({
                  angebotId: angebot.id,
                  organisationId: item.id,
                  applyRollenerweiterungBodyParams: {
                    addErweiterungenForRolleIds: [],
                    removeErweiterungenForRolleIds: rollenIds,
                  },
                });
              }
            }

            const ownedAngebote: ManageableServiceProviderListEntryResponse[] = relevanteAngebote.filter(
              (angebot) => angebot.administrationsebene.id === item.id,
            );
            if (ownedAngebote.length > 0) {
              console.log(`${ownedAngebote.length} Angebote für ${item.id}:${item.name} löschen`);
            }
            return ownedAngebote;
          },
          async (angebot: ManageableServiceProviderListEntryResponse) =>
            providerApi.providerControllerDeleteServiceProvider({ angebotId: angebot.id }),
        );

        return organisationApi.organisationControllerDeleteOrganisation({ organisationId: item.id });
      },
    );

    // ---------------------------------------------------------------------
    // LANDESWEITE ANGEBOTE LÖSCHEN
    // ---------------------------------------------------------------------
    console.log('Landesweite Angebote löschen');

    await cleanup(
      async () => {
        const wrappedResponse: ApiResponse<ProviderControllerGetAvailableServiceProviders200Response> =
          await providerApi.providerControllerGetManageableLandRootServiceProvidersRaw({
            searchStr: testDataPrefix,
            limit,
          });
        const response: ProviderControllerGetAvailableServiceProviders200Response = await wrappedResponse.value();
        console.log(`${response.total} landesweite Angebote löschen`);
        return response.items;
      },
      async (item: ServiceProviderResponse) =>
        providerApi.providerControllerDeleteServiceProvider({ angebotId: item.id }),
    );

    console.log('Global teardown finished successfully');
  } catch (error) {
    console.error('Global teardown failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}
