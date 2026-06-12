import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi-types.js';

const DEFAULT_BASE_URL = 'https://api.snapdiff.ai/v1';

export type SnapdiffClient = ReturnType<typeof createOpenApiClient<paths>>;

export function getClientConfig(options: { apiKey?: string; baseUrl?: string } = {}): {
  baseUrl: string;
  apiKey: string;
} {
  const apiKey = options.apiKey ?? process.env.SNAPDIFF_API_KEY;
  if (!apiKey) {
    throw new Error(
      'SNAPDIFF_API_KEY is required. Get one at https://snapdiff.ai/dashboard.',
    );
  }
  const baseUrl = (
    options.baseUrl ?? process.env.SNAPDIFF_API_URL ?? DEFAULT_BASE_URL
  ).replace(/\/$/, '');
  return { baseUrl, apiKey };
}

export interface CreateClientOptions {
  /** Defaults to `process.env.SNAPDIFF_API_KEY`. */
  apiKey?: string;
  /** Defaults to `process.env.SNAPDIFF_API_URL` or `https://api.snapdiff.ai/v1`. */
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createClient(options: CreateClientOptions = {}): SnapdiffClient {
  const { baseUrl, apiKey } = getClientConfig(options);
  return createOpenApiClient<paths>({
    baseUrl,
    fetch: options.fetch,
    headers: { 'X-API-Key': apiKey },
  });
}
