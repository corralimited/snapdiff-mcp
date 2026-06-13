// Sticky sessions are required for >1 replica: the transport holds an open
// SSE stream keyed on `mcp-session-id` that can't be migrated between
// processes. Either keep replicas at 1 or set up session affinity on the LB.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';
import type { SnapdiffClient } from './client.js';

const SESSION_TTL_MS = 30 * 60 * 1000;

interface Session {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}

export interface StartHttpServerOptions {
  client: SnapdiffClient;
  port: number;
  host: string;
  baseUrl: string;
  apiKey: string;
}

export async function startHttpServer(options: StartHttpServerOptions): Promise<void> {
  const sessions = new Map<string, Session>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        session.transport.close?.();
        sessions.delete(id);
      }
    }
  }, 5 * 60 * 1000);
  sweep.unref();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found. POST/GET/DELETE /mcp.' }));
      return;
    }

    const sessionId = req.headers['mcp-session-id'];
    const sessionIdStr = typeof sessionId === 'string' ? sessionId : undefined;

    if (sessionIdStr && sessions.has(sessionIdStr)) {
      await sessions.get(sessionIdStr)!.transport.handleRequest(req, res);
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32002, message: 'Invalid or missing session. Send a POST first.' },
          id: null,
        }),
      );
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id: string) => {
        sessions.set(id, { transport, createdAt: Date.now() });
      },
      onsessionclosed: (id: string) => {
        sessions.delete(id);
      },
    });

    const mcp = createMcpServer({ client: options.client, baseUrl: options.baseUrl, apiKey: options.apiKey });
    await mcp.connect(transport);
    await transport.handleRequest(req, res);
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  console.error(`snapdiff-mcp listening on http://${options.host}:${options.port}/mcp`);
}
