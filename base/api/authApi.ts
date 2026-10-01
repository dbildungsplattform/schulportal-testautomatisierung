import { Page } from '@playwright/test';
import { constructApi } from './apiFactory';
import { ApiResponse, AuthApi } from './generated';

export function constructAuthApi(page: Page): AuthApi {
  return constructApi(page, AuthApi, { withCsrf: false });
}

export async function getCsrfToken(authApi: AuthApi): Promise<string> {
  const response: ApiResponse<{ csrfToken: string }> = await authApi.authenticationControllerGetCsrfTokenRaw();

  const data = await response.value();

  if (!data.csrfToken) {
    throw new Error('CSRF token missing');
  }

  return data.csrfToken;
}
