import { expect, Page } from '@playwright/test';
import { constructApi } from './apiFactory';
import {
  ProviderApi,
  ProviderControllerCreateServiceProviderRequest,
  ProviderControllerDeleteServiceProviderRequest,
} from './generated/apis/ProviderApi';
import {
  CreateServiceProviderBodyParams,
  CreateServiceProviderResponse,
  ServiceProviderResponse,
} from './generated/models';
import { ApiResponse } from './generated/runtime';

export interface ServiceProviderFromRolleResponse {
  id: string;
  name: string;
}

export function constructProviderApi(page: Page): ProviderApi {
  return constructApi(page, ProviderApi);
}

export async function createServiceProvider(
  page: Page,
  createServiceProviderBodyParams: CreateServiceProviderBodyParams,
): Promise<string> {
  try {
    const requestParameters: ProviderControllerCreateServiceProviderRequest = {
      createServiceProviderBodyParams,
    };

    const providerApi: ProviderApi = constructProviderApi(page);
    const response: ApiResponse<CreateServiceProviderResponse> =
      await providerApi.providerControllerCreateServiceProviderRaw(requestParameters);
    expect(response.raw.status).toBe(201);

    const createdServiceProvider: CreateServiceProviderResponse = await response.value();
    return createdServiceProvider.id;
  } catch (error) {
    console.error('[ERROR] createServiceProvider failed:', error);
    throw error;
  }
}

export async function deleteServiceProvider(page: Page, angebotId: string): Promise<void> {
  try {
    const requestParameters: ProviderControllerDeleteServiceProviderRequest = {
      angebotId,
    };

    const providerApi: ProviderApi = constructProviderApi(page);
    const response: ApiResponse<void> = await providerApi.providerControllerDeleteServiceProviderRaw(requestParameters);
    expect(response.raw.status).toBe(204);
  } catch (error) {
    console.error('[ERROR] deleteServiceProvider failed:', error);
    throw error;
  }
}

export async function getServiceProviderId(
  page: Page,
  serviceProviderName: string,
  schulstrukturknotenOfRolle: string,
): Promise<string> {
  try {
    const providerApi: ProviderApi = constructProviderApi(page);
    const response: ApiResponse<ServiceProviderResponse[]> =
      await providerApi.providerControllerGetAssignableServiceProvidersForRolleRaw({
        schulstrukturknotenOfRolle,
      });
    expect(response.raw.status).toBe(200);

    const fetchedServiceProviders: ServiceProviderResponse[] = await response.value();
    let serviceProviderId: string = '';

    for (const value of fetchedServiceProviders) {
      if (value.name === serviceProviderName) {
        serviceProviderId = value.id;
      }
    }

    return serviceProviderId;
  } catch (error) {
    console.error('[ERROR] getServiceProviderId failed:', error);
    throw error;
  }
}

/**
 *
 * @param page
 * @param serviceProviderNames
 * @returns a map of names to ids for the given service provider names. If a name is not found, it will not be included in the map.
 */
export async function getServiceProviderIdsMappedByName(
  page: Page,
  serviceProviderNames: string[],
  schulstrukturknotenOfRolle: string,
): Promise<Map<string, string>> {
  try {
    const providerApi: ProviderApi = constructProviderApi(page);
    const response: ApiResponse<ServiceProviderResponse[]> =
      await providerApi.providerControllerGetAssignableServiceProvidersForRolleRaw({
        schulstrukturknotenOfRolle,
      });
    expect(response.raw.status).toBe(200);

    const fetchedServiceProviders: ServiceProviderResponse[] = await response.value();
    const mappedServiceProviderIds = new Map<string, string>();

    for (const name of serviceProviderNames) {
      const serviceProvider: ServiceProviderResponse | undefined = fetchedServiceProviders.find(
        (sp) => sp.name === name,
      );
      if (serviceProvider) {
        mappedServiceProviderIds.set(name, serviceProvider.id);
      } else {
        console.warn(`[WARN] ServiceProvider with name "${name}" not found among fetched service providers.`);
      }
    }

    return mappedServiceProviderIds;
  } catch (error) {
    console.error('[ERROR] getServiceProviderIdsMappedByName failed:', error);
    throw error;
  }
}
