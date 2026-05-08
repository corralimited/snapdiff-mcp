import createOpenApiClient from 'openapi-fetch';
import type { paths } from './openapi-types.js';

const DEFAULT_BASE_URL = 'https://api.snapdiff.dev/v1';

export type SnapdiffClient = ReturnType<typeof createOpenApiClient<paths>>;

export interface CreateClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createClient(options: CreateClientOptions): SnapdiffClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  return createOpenApiClient<paths>({
    baseUrl,
    fetch: options.fetch,
    headers: {
      'X-API-Key': options.apiKey,
    },
  });
}

/**
 * Build a client from environment variables. Throws if SNAPDIFF_API_KEY is not set.
 *   SNAPDIFF_API_KEY  — required
 *   SNAPDIFF_API_URL  — optional override (default: https://api.snapdiff.dev/v1)
 */
export function createClientFromEnv(env: NodeJS.ProcessEnv = process.env): SnapdiffClient {
  const apiKey = env.SNAPDIFF_API_KEY;
  if (!apiKey) {
    throw new Error(
      'SNAPDIFF_API_KEY is required. Get one at https://snapdiff.dev/dashboard and set it in your MCP server config.',
    );
  }
  return createClient({ apiKey, baseUrl: env.SNAPDIFF_API_URL });
}
