#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { createClient } from './client.js';

interface CliOptions {
  http: boolean;
  port: number;
  host: string;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { http: false, port: 8787, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--http') opts.http = true;
    else if (arg === '--port') opts.port = Number(argv[++i]);
    else if (arg === '--host') opts.host = argv[++i] ?? opts.host;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: snapdiff-mcp [--http] [--port <n>] [--host <h>]\n\n' +
          'Env:\n' +
          '  SNAPDIFF_API_KEY  required — get one at https://snapdiff.dev/dashboard\n' +
          '  SNAPDIFF_API_URL  optional override (default: https://api.snapdiff.dev/v1)',
      );
      process.exit(0);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const client = createClient();

  if (opts.http) {
    const { startHttpServer } = await import('./http.js');
    await startHttpServer({ client, port: opts.port, host: opts.host });
    return;
  }

  const server = createMcpServer({ client });
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
