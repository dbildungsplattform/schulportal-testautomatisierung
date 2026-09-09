import { Page, expect } from '@playwright/test';
import { oeffentlichLandSH } from '../organisation';
import { generateDienststellenNr, generateSchulname } from '../utils/generateTestdata';
import { constructApi } from './apiFactory';
import {
  OrganisationControllerCreateOrganisationRequest,
  OrganisationControllerDeleteOrganisationRequest,
  OrganisationControllerFindOrganizationsRequest,
  OrganisationenApi,
} from './generated/apis/OrganisationenApi';
import { CreateOrganisationBodyParams, OrganisationResponse, OrganisationsTyp } from './generated/models';
import { ApiResponse } from './generated/runtime';

export function constructOrganisationApi(page: Page): OrganisationenApi {
  return constructApi(page, OrganisationenApi);
}

export async function getOrganisationId(page: Page, organisationName: string): Promise<string> {
  try {
    const organisations: OrganisationResponse[] = await getOrganisations(page, { name: organisationName });

    if (!organisations || organisations.length === 0) {
      throw new Error(`No organisations found with name: "${organisationName}"`);
    }

    if (!organisations[0] || !organisations[0].id) {
      throw new Error('First organisation in response does not have an ID');
    }

    const fetchedOrganisationId: string = organisations[0].id;
    return fetchedOrganisationId;
  } catch (error) {
    console.error('[ERROR] getOrganisationId failed:', error);
    throw error;
  }
}

export async function getOrganisations(
  page: Page,
  params: OrganisationControllerFindOrganizationsRequest,
): Promise<OrganisationResponse[]> {
  try {
    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<OrganisationResponse[]> =
      await organisationApi.organisationControllerFindOrganizationsRaw(params);
    expect(response.raw.status).toBe(200);
    return response.value();
  } catch (error) {
    console.error('[ERROR] getOrganisations failed:', error);
    throw error;
  }
}

export async function deleteKlasse(page: Page, klasseId: string): Promise<void> {
  try {
    const requestParameters: OrganisationControllerDeleteOrganisationRequest = {
      organisationId: klasseId,
    };

    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<void> =
      await organisationApi.organisationControllerDeleteOrganisationRaw(requestParameters);
    expect(response.raw.status).toBe(204);
  } catch (error) {
    console.error('[ERROR] deleteKlasse failed:', error);
    throw error;
  }
}

export async function getKlasseId(page: Page, klassennname: string): Promise<string | undefined> {
  try {
    const requestParameters: OrganisationControllerFindOrganizationsRequest = {
      name: klassennname,
      excludeTyp: [
        'ROOT',
        'LAND',
        'TRAEGER',
        'SCHULE',
        'ANBIETER',
        'SONSTIGE ORGANISATION / EINRICHTUNG',
        'UNBESTAETIGT',
      ],
    };

    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<OrganisationResponse[]> =
      await organisationApi.organisationControllerFindOrganizationsRaw(requestParameters);
    expect(response.raw.status).toBe(200);

    const organisations: OrganisationResponse[] = await response.value();
    if (!organisations || organisations.length === 0) {
      return undefined;
    }

    return organisations[0].id;
  } catch (error) {
    console.error('[ERROR] getKlasseId failed:', error);
    throw error;
  }
}

export async function getKlassenNamenBySchule(page: Page, schuleId: string): Promise<string[]> {
  const klassen: OrganisationResponse[] = await getOrganisations(page, {
    administriertVon: [schuleId],
    typ: OrganisationsTyp.Klasse,
    limit: 200,
  });
  return klassen.map((klasse: OrganisationResponse): string => klasse.name);
}

export async function createOrganisation(
  page: Page,
  params: OrganisationControllerCreateOrganisationRequest['createOrganisationBodyParams'],
): Promise<OrganisationResponse> {
  try {
    const createOrganisationBodyParams: CreateOrganisationBodyParams = {
      ...params,
      name: params.name ?? generateSchulname(),
      kennung: params.kennung ?? generateDienststellenNr(),
      typ: params.typ ?? OrganisationsTyp.Schule,
    };

    const requestParameters: OrganisationControllerCreateOrganisationRequest = {
      createOrganisationBodyParams,
    };

    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<OrganisationResponse> =
      await organisationApi.organisationControllerCreateOrganisationRaw(requestParameters);
    expect(response.raw.status).toBe(201);

    return response.value();
  } catch (error) {
    console.error('[ERROR] createSchule failed:', error);
    throw error;
  }
}

/**
 *
 * @param page
 * @param name
 * @param kennung
 * @returns id of created schule
 */
export async function createSchule(page: Page, name: string, kennung?: string): Promise<string> {
  try {
    const traegerId: string = await getOrganisationId(page, oeffentlichLandSH);
    const createOrganisationBodyParams: CreateOrganisationBodyParams = {
      administriertVon: traegerId,
      zugehoerigZu: traegerId,
      name: name,
      kennung: kennung ?? generateDienststellenNr(),
      typ: OrganisationsTyp.Schule,
    };

    const requestParameters: OrganisationControllerCreateOrganisationRequest = {
      createOrganisationBodyParams,
    };

    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<OrganisationResponse> =
      await organisationApi.organisationControllerCreateOrganisationRaw(requestParameters);
    expect(response.raw.status).toBe(201);

    const createdSchule: OrganisationResponse = await response.value();
    return createdSchule.id;
  } catch (error) {
    console.error('[ERROR] createSchule failed:', error);
    throw error;
  }
}

export async function createKlasse(page: Page, schuleId: string, name: string): Promise<string> {
  try {
    const createOrganisationBodyParams: CreateOrganisationBodyParams = {
      administriertVon: schuleId,
      zugehoerigZu: schuleId,
      name: name,
      typ: OrganisationsTyp.Klasse,
    };

    const requestParameters: OrganisationControllerCreateOrganisationRequest = {
      createOrganisationBodyParams,
    };

    const organisationApi: OrganisationenApi = constructOrganisationApi(page);
    const response: ApiResponse<OrganisationResponse> =
      await organisationApi.organisationControllerCreateOrganisationRaw(requestParameters);
    expect(response.raw.status).toBe(201);

    const createdKlasse: OrganisationResponse = await response.value();
    return createdKlasse.id;
  } catch (error) {
    console.error('[ERROR] createKlasse failed:', error);
    throw error;
  }
}
