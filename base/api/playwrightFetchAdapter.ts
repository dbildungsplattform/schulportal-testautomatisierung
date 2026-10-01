import { APIRequestContext, APIResponse, Page } from '@playwright/test';
import { FetchAPI } from './generated';
import { constructAuthApi, getCsrfToken } from './authApi';

type PlaywrightFetchInit = Parameters<APIRequestContext['fetch']>[1];

// Per-page cache: WeakMap so pages can be GC'd freely
const csrfCache = new WeakMap<object, Promise<string | undefined>>();

function isTestEndedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Test ended');
}

async function resolveCsrf(page: Page): Promise<string | undefined> {
  // Use page.request as the cache key — unique per browser context
  const key = page.request;

  if (!csrfCache.has(key)) {
    const promise = (async (): Promise<string | undefined> => {
      const authApi = constructAuthApi(page);
      return getCsrfToken(authApi);
    })();
    csrfCache.set(key, promise);
  }

  return csrfCache.get(key)!;
}

export function invalidateCsrf(page: Page): void {
  csrfCache.delete(page.request);
}
/**
 * makeFetchWithPlaywright
 * -----------------------
 * Adapter that allows OpenAPI-generated clients (or any library expecting the native
 * `fetch` Response interface) to work seamlessly with Playwright’s `page.request.fetch`.
 *
 * Why?
 *  - Playwright’s `page.request.fetch` returns an `APIResponse`, which is *not*
 *    compatible with the standard `Response` object returned by native `fetch`.
 *  - The OpenAPI runtime checks properties like `status`, `ok`, `headers.entries()`,
 *    and calls methods like `json()` or `text()`. These don’t exist or behave differently
 *    on `APIResponse`.
 *  - Without this shim, you’ll see errors like:
 *    `_apiResponse$raw2.entries is not a function`
 *
 * What this does:
 *  - Wraps Playwright’s `APIResponse` and exposes it as a minimal `Response`-like object.
 *  - Ensures `status`, `ok`, `statusText`, `headers`, `url`, and body methods
 *    (`text()`, `json()`, `arrayBuffer()`, `blob()`) behave like native fetch.
 *  - Makes the OpenAPI client (or any fetch-based code) think it’s talking to a real `fetch`.
 *
 * Usage:
 *  ```ts
 *  import { makeFetchWithPlaywright } from './playwrightFetchAdapter';
 *  import { Configuration } from './generated';
 *  import { MyApi } from './generated/apis/MyApi';
 *
 *  function createMyApi(page: Page): MyApi {
 *    const config = new Configuration({
 *      basePath: FRONTEND_URL.replace(/\/$/, ''),
 *      fetchApi: makeFetchWithPlaywright(page),
 *    });
 *    return new MyApi(config);
 *  }
 *  ```
 */
export function makeFetchWithPlaywright(page: Page, options?: { withCsrf?: boolean }): FetchAPI {
  const withCsrf = options?.withCsrf ?? true;

  return async (url: string, init?: RequestInit & PlaywrightFetchInit): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };

    if (withCsrf) {
      const token = await resolveCsrf(page);
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    let resp: APIResponse;
    try {
      resp = await page.request.fetch(url, {
        ...init,
        data: init?.body,
        headers,
        maxRetries: 3,
      });
    } catch (error) {
      if (isTestEndedError(error)) {
        return new Response(null, { status: 0, statusText: 'Test ended' }) as unknown as Response;
      }
      throw error;
    }

    return {
      ok: resp.ok(),
      status: resp.status(),
      statusText: resp.statusText(),
      url: resp.url(),
      headers: new Headers(resp.headers()),
      text: () => resp.text(),
      json: () => resp.json(),
      arrayBuffer: async () => resp.body(),
      blob: async () => new Blob([new Uint8Array(await resp.body())]),
      clone: () => {
        throw new Error('clone not implemented');
      },
    } as unknown as Response;
  };
}
