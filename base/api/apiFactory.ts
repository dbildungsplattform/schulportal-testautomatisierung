import { Page } from '@playwright/test';
import { FRONTEND_URL } from './baseApi';
import { Configuration } from './generated/runtime';
import { makeFetchWithPlaywright } from './playwrightFetchAdapter';

export type ApiConstructor<T> = new (config: Configuration) => T;

export function constructApi<T>(page: Page, ApiClass: ApiConstructor<T>, options?: { withCsrf?: boolean }): T {
  const config: Configuration = new Configuration({
    basePath: FRONTEND_URL?.replace(/\/$/, ''),
    fetchApi: makeFetchWithPlaywright(page, options),
  });
  return new ApiClass(config);
}
