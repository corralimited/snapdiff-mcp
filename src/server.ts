import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as tools from './tools/index.js';
import type { SnapdiffClient } from './client.js';

export interface CreateMcpServerOptions {
  client: SnapdiffClient;
}

export function createMcpServer({ client }: CreateMcpServerOptions): McpServer {
  const server = new McpServer({ name: 'snapdiff', version: '0.1.0' });

  server.tool(
    tools.comparePages.name,
    tools.comparePages.description,
    tools.comparePages.inputSchema,
    async (args: tools.comparePages.Input) => {
      const screenshotOptions = args.full_page ? { full_page: true } : undefined;

      if (args.project && args.page_name) {
        const { data, error, response } = await client.POST('/diff/baseline', {
          body: {
            after: args.after,
            project: args.project,
            page_name: args.page_name,
            branch: args.branch,
            threshold: args.threshold,
            ignore_selectors: args.ignore_selectors,
            screenshot_options: screenshotOptions,
          },
        });
        if (error || !data) return errorResult(error, response);
        return jsonResult({
          match: data.match,
          diff_percentage: data.diff_percentage,
          diff_image_url: data.diff_image_url,
          before_image_url: data.before_image_url,
          after_image_url: data.after_image_url,
          changed_regions: data.changed_regions,
          dimensions: data.dimensions,
          duration_ms: data.duration_ms,
          baseline_source: `${args.project}/${args.page_name}`,
          baseline: data.baseline,
        });
      }

      if (!args.before) {
        return errorPayload('Either `before` URL or `project` + `page_name` must be provided');
      }

      const { data, error, response } = await client.POST('/diff', {
        body: {
          before: args.before,
          after: args.after,
          threshold: args.threshold,
          ignore_selectors: args.ignore_selectors,
          screenshot_options: screenshotOptions,
        },
      });
      if (error || !data) return errorResult(error, response);
      return jsonResult({
        match: data.match,
        diff_percentage: data.diff_percentage,
        diff_image_url: data.diff_image_url,
        before_image_url: data.before_image_url,
        after_image_url: data.after_image_url,
        changed_regions: data.changed_regions,
        dimensions: data.dimensions,
        duration_ms: data.duration_ms,
        baseline_source: 'ad-hoc',
      });
    },
  );

  server.tool(
    tools.captureScreenshot.name,
    tools.captureScreenshot.description,
    tools.captureScreenshot.inputSchema,
    async (args: tools.captureScreenshot.Input) => {
      const { data, error, response } = await client.POST('/screenshot', {
        body: {
          url: args.url,
          full_page: args.full_page,
          dark_mode: args.dark_mode,
          selector: args.selector,
          width: args.width,
        },
      });
      if (error || !data) return errorResult(error, response);
      return jsonResult({
        id: data.id,
        url: data.url,
        width: data.width,
        height: data.height,
      });
    },
  );

  // Composed: /screenshot then /diff. The public /diff accepts ss_xxx ids.
  server.tool(
    tools.checkChanged.name,
    tools.checkChanged.description,
    tools.checkChanged.inputSchema,
    async (args: tools.checkChanged.Input) => {
      const threshold = args.threshold ?? 1.0;

      const capture = await client.POST('/screenshot', { body: { url: args.url } });
      if (capture.error || !capture.data) return errorResult(capture.error, capture.response);

      const diff = await client.POST('/diff', {
        body: { before: args.baseline_id, after: capture.data.id },
      });
      if (diff.error || !diff.data) return errorResult(diff.error, diff.response);

      return jsonResult({
        changed: diff.data.diff_percentage > threshold,
        diff_percentage: diff.data.diff_percentage,
        current_screenshot_id: capture.data.id,
      });
    },
  );

  server.tool(
    tools.htmlToImage.name,
    tools.htmlToImage.description,
    tools.htmlToImage.inputSchema,
    async (args: tools.htmlToImage.Input) => {
      const fullHtml = args.css
        ? `<html><head><style>${args.css}</style></head><body>${args.html}</body></html>`
        : args.html;

      const { data, error, response } = await client.POST('/screenshot', {
        body: {
          html: fullHtml,
          width: args.width ?? 1200,
          height: args.height ?? 630,
        },
      });
      if (error || !data) return errorResult(error, response);
      return jsonResult({
        id: data.id,
        url: data.url,
        width: data.width,
        height: data.height,
      });
    },
  );

  return server;
}

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function jsonResult(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

function errorPayload(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

function errorResult(err: unknown, response: Response): ToolResult {
  const body = err as { error?: { message?: string } } | undefined;
  const message =
    body?.error?.message ?? `SnapDiff API error ${response.status} ${response.statusText}`;
  return errorPayload(message);
}
