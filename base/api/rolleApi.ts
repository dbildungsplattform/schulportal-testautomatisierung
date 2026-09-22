import { expect, Page } from '@playwright/test';
import { constructApi } from './apiFactory';
import {
  RolleApi,
  RolleControllerCreateRolleRequest,
  RolleControllerDeleteRolleRequest,
  RolleControllerFindRollenRequest,
} from './generated/apis/RolleApi';
import {
  CreateRolleBodyParams,
  RollenArt,
  RollenMerkmal,
  RolleResponse,
  RolleWithServiceProvidersResponse,
} from './generated/models';
import { RollenSystemRechtEnum } from './generated/models/RollenSystemRechtEnum';
import { ApiResponse } from './generated/runtime';

export { RollenArt, RollenMerkmal };

export function constructRolleApi(page: Page): RolleApi {
  return constructApi(page, RolleApi);
}

/**
 *
 * @param page
 * @param rollenArt
 * @param organisationId
 * @param rolleName
 * @param merkmale
 * @returns id of created Rolle
 */
export async function createRolle(
  page: Page,
  rollenArt: RollenArt,
  organisationId: string,
  rolleName: string,
  merkmale?: Set<RollenMerkmal>,
  systemrechte?: Set<RollenSystemRechtEnum>,
  serviceProviderIds?: Set<string>,
): Promise<string> {
  try {
    const createRolleBodyParams: CreateRolleBodyParams = {
      name: rolleName,
      administeredBySchulstrukturknoten: organisationId,
      rollenart: rollenArt,
      merkmale: merkmale ?? new Set<RollenMerkmal>(),
      systemrechte: systemrechte ?? new Set<RollenSystemRechtEnum>(),
      serviceProviderIds: serviceProviderIds ?? new Set<string>(),
    };

    const requestParameters: RolleControllerCreateRolleRequest = {
      createRolleBodyParams,
    };

    const rolleApi: RolleApi = constructRolleApi(page);
    const response: ApiResponse<RolleResponse> = await rolleApi.rolleControllerCreateRolleRaw(requestParameters);
    expect(response.raw.status).toBe(201);

    const createdRolle: RolleResponse = await response.value();
    return createdRolle.id;
  } catch (error) {
    console.error('[ERROR] createRolle failed:', error);
    throw error;
  }
}

export async function deleteRolle(page: Page, rolleId: string): Promise<void> {
  try {
    const requestParameters: RolleControllerDeleteRolleRequest = {
      rolleId,
    };

    const rolleApi: RolleApi = constructRolleApi(page);
    const response: ApiResponse<void> = await rolleApi.rolleControllerDeleteRolleRaw(requestParameters);
    expect(response.raw.status).toBe(204);
  } catch (error) {
    console.error('[ERROR] deleteRolle failed:', error);
    throw error;
  }
}

export async function getRolleId(page: Page, rollenname: string): Promise<string> {
  try {
    const requestParameters: RolleControllerFindRollenRequest = {
      searchStr: rollenname,
    };

    const rolleApi: RolleApi = constructRolleApi(page);
    const response: ApiResponse<RolleWithServiceProvidersResponse[]> =
      await rolleApi.rolleControllerFindRollenRaw(requestParameters);
    expect(response.raw.status).toBe(200);

    const fetchedRollen: RolleWithServiceProvidersResponse[] = await response.value();
    let fetchedRolleId: string = '';

    for (const rolle of fetchedRollen) {
      if (rolle.name === rollenname) {
        fetchedRolleId = rolle.id;
      }
    }

    return fetchedRolleId;
  } catch (error) {
    console.error('[ERROR] getRolleId failed:', error);
    throw error;
  }
}

export async function applyRollenerweiterungChanges(
  page: Page,
  angebotId: string,
  organisationId: string,
  addErweiterungenForRolleIds: string[],
  removeErweiterungenForRolleIds: string[] = [],
): Promise<void> {
  try {
    const rolleApi: RolleApi = constructRolleApi(page);
    await rolleApi.rollenerweiterungControllerApplyRollenerweiterungChanges({
      angebotId,
      organisationId,
      applyRollenerweiterungBodyParams: {
        addErweiterungenForRolleIds,
        removeErweiterungenForRolleIds,
      },
    });
  } catch (error) {
    console.error('[ERROR] applyRollenerweiterungChanges failed:', error);
    throw error;
  }
}
