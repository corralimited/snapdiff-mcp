#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { createClient, getClientConfig } from './client.js';

async function main() {
  // Ahead of getClientConfig, which throws without an API key.
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(
      'Usage: snapdiff-mcp\n\n' +
        'Speaks MCP over stdio on stdin/stdout; your editor spawns it.\n\n' +
        'Env:\n' +
        '  SNAPDIFF_API_KEY  required — get one at https://snapdiff.ai/dashboard\n' +
        '  SNAPDIFF_API_URL  optional override (default: https://api.snapdiff.ai/v1)',
    );
    return;
  }

  const { baseUrl, apiKey } = getClientConfig();
  const client = createClient({ baseUrl, apiKey });
  const server = createMcpServer({ client, baseUrl, apiKey });
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
