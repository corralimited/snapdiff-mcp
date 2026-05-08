import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi-types.js';

const DEFAULT_BASE_URL = 'https://api.snapdiff.dev/v1';

export type SnapdiffClient = ReturnType<typeof createOpenApiClient<paths>>;

export interface CreateClientOptions {
  /** Defaults to `process.env.SNAPDIFF_API_KEY`. */
  apiKey?: string;
  /** Defaults to `process.env.SNAPDIFF_API_URL` or `https://api.snapdiff.dev/v1`. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createClient(options: CreateClientOptions = {}): SnapdiffClient {
  const apiKey = options.apiKey ?? process.env.SNAPDIFF_API_KEY;
  if (!apiKey) {
    throw new Error(
      'SNAPDIFF_API_KEY is required. Get one at https://snapdiff.dev/dashboard.',
    );
  }
  const baseUrl =
    (options.baseUrl ?? process.env.SNAPDIFF_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  return createOpenApiClient<paths>({
    baseUrl,
    fetch: options.fetch,
    headers: { 'X-API-Key': apiKey },
  });
}
