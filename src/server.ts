import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as tools from './tools/index.js';
import type { SnapdiffClient } from './client.js';
import { isLocalUrl, captureAndUpload, captureMultipleAndUpload } from './local.js';

export interface CreateMcpServerOptions {
  client: SnapdiffClient;
  baseUrl: string;
  apiKey: string;
}

export function createMcpServer({ client, baseUrl, apiKey }: CreateMcpServerOptions): McpServer {
  const server = new McpServer({ name: 'snapdiff', version: '0.1.0' });

  server.tool(
    tools.comparePages.name,
    tools.comparePages.description,
    tools.comparePages.inputSchema,
    async (args: tools.comparePages.Input) => {
      const screenshotOptions = args.full_page ? { full_page: true as const } : undefined;
      const captureOpts = { full_page: args.full_page };

      // Pre-capture any local URLs — the diff endpoint accepts screenshot IDs
      // (ss_xxx) but cannot reach localhost from the backend. When both sides
      // are local, share a single browser to avoid paying two launch costs.
      let after = args.after;
      let before = args.before;
      try {
        const afterIsLocal = isLocalUrl(args.after);
        const beforeIsLocal = args.before != null && isLocalUrl(args.before);
        if (afterIsLocal || beforeIsLocal) {
          const specs = [
            afterIsLocal ? { pageUrl: args.after, options: captureOpts } : null,
            beforeIsLocal ? { pageUrl: args.before!, options: captureOpts } : null,
          ];
          const nonNull = specs.filter((s): s is NonNullable<typeof s> => s !== null);
          const results = await captureMultipleAndUpload(nonNull, baseUrl, apiKey);
          let ri = 0;
          if (afterIsLocal) after = results[ri++].upload.id;
          if (beforeIsLocal) before = results[ri++].upload.id;
        }
      } catch (err) {
        return errorPayload(err instanceof Error ? err.message : String(err));
      }

      if (args.project && args.page_name) {
        const { data, error, response } = await client.POST('/diff/baseline', {
          body: {
            after,
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

      if (!before) {
        return errorPayload('Either `before` URL or `project` + `page_name` must be provided');
      }

      const { data, error, response } = await client.POST('/diff', {
        body: {
          before,
          after,
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
      if (isLocalUrl(args.url)) {
        try {
          const result = await captureAndUpload(
            args.url,
            { full_page: args.full_page, width: args.width, selector: args.selector, dark_mode: args.dark_mode },
            baseUrl,
            apiKey,
          );
          return jsonResult({ id: result.upload.id, url: result.upload.url, width: result.upload.width, height: result.upload.height });
        } catch (err) {
          return errorPayload(err instanceof Error ? err.message : String(err));
        }
      }

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

  server.tool(
    tools.captureBaseline.name,
    tools.captureBaseline.description,
    tools.captureBaseline.inputSchema,
    async (args: tools.captureBaseline.Input) => {
      let pageEntry: { name: string; url?: string; screenshot_id?: string };

      if (isLocalUrl(args.url)) {
        try {
          const { upload } = await captureAndUpload(args.url, {}, baseUrl, apiKey);
          pageEntry = { name: args.page_name, screenshot_id: upload.id };
        } catch (err) {
          return errorPayload(err instanceof Error ? err.message : String(err));
        }
      } else {
        pageEntry = { name: args.page_name, url: args.url };
      }

      const { data: build, error, response } = await client.POST('/projects/{projectId}/builds', {
        params: { path: { projectId: args.project } },
        body: { branch: args.branch, pages: [pageEntry] },
      });
      if (error || !build) return errorResult(error, response);

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data, error: pollError, response: pollRes } = await client.GET(
          '/projects/{projectId}/builds/{buildId}',
          { params: { path: { projectId: args.project, buildId: build.id } } },
        );
        if (pollError || !data) return errorResult(pollError, pollRes);

        if (data.status === 'approved') {
          return jsonResult({
            status: 'baseline_captured',
            page_name: args.page_name,
            build_id: data.id,
            message: `Baseline for "${args.page_name}" is in place. You can now call snapdiff_verify_ui_change against this page.`,
          });
        }
        if (data.status === 'changes_requested') {
          return jsonResult({
            status: 'existing_baseline_differs',
            page_name: args.page_name,
            build_id: data.id,
            message: `A baseline already exists for "${args.page_name}" and your capture differs from it. Open the dashboard to approve the new capture or delete the existing baseline first.`,
          });
        }
        if (data.status === 'failed') {
          return errorPayload(`Build failed — check that ${args.url} is reachable.`);
        }
      }

      return errorPayload('Baseline capture timed out after 60 seconds. Check the dashboard for build status.');
    },
  );

  server.tool(
    tools.checkBuild.name,
    tools.checkBuild.description,
    tools.checkBuild.inputSchema,
    async (args: tools.checkBuild.Input) => {
      const pageEntries: { name: string; url?: string; screenshot_id?: string }[] = [];

      const localSpecs = args.pages
        .map((p, i) => (isLocalUrl(p.url) ? { pageUrl: p.url, options: {}, _index: i } : null))
        .filter((s): s is NonNullable<typeof s> => s !== null);

      let uploadedIds: Map<number, string> = new Map();
      if (localSpecs.length > 0) {
        try {
          const results = await captureMultipleAndUpload(localSpecs, baseUrl, apiKey);
          for (let i = 0; i < localSpecs.length; i++) {
            uploadedIds.set(localSpecs[i]._index, results[i].upload.id);
          }
        } catch (err) {
          return errorPayload(err instanceof Error ? err.message : String(err));
        }
      }

      for (let i = 0; i < args.pages.length; i++) {
        const p = args.pages[i];
        const screenshotId = uploadedIds.get(i);
        pageEntries.push(screenshotId ? { name: p.page_name, screenshot_id: screenshotId } : { name: p.page_name, url: p.url });
      }

      const { data: build, error, response } = await client.POST('/projects/{projectId}/builds', {
        params: { path: { projectId: args.project } },
        body: { branch: args.branch, pages: pageEntries },
      });
      if (error || !build) return errorResult(error, response);

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data, error: pollError, response: pollRes } = await client.GET(
          '/projects/{projectId}/builds/{buildId}',
          { params: { path: { projectId: args.project, buildId: build.id } } },
        );
        if (pollError || !data) return errorResult(pollError, pollRes);
        if (data.status === 'pending' || data.status === 'processing') continue;

        const changed = data.snapshots.filter((s) => s.status === 'pending' || s.status === 'new');
        const unchanged = data.snapshots.filter((s) => s.status !== 'pending' && s.status !== 'new');

        return jsonResult({
          build_id: data.id,
          summary: changed.length === 0 ? 'all_pages_match' : 'pages_changed',
          changed: changed.map((s) => ({ page_name: s.page_name, diff_percentage: s.diff_percentage })),
          unchanged: unchanged.map((s) => s.page_name),
          ...(changed.length > 0 && {
            review_url: `https://snapdiff.ai/dashboard/projects/${args.project}/builds/${data.id}`,
            message: `${changed.length} page(s) changed. Review before promoting the baseline.`,
          }),
        });
      }

      return errorPayload('Build timed out after 60 seconds. Check the dashboard for status.');
    },
  );

  // The opinionated verdict tool. Hits the backend's /verifications
  // endpoint which creates a persistent verification record, computes
  // the verdict server-side, and returns a review_url the human can
  // open to approve or reject. The verdict + intent + baseline live on
  // the backend so the dashboard review page can render the same shape
  // the agent saw.
  server.tool(
    tools.verifyUiChange.name,
    tools.verifyUiChange.description,
    tools.verifyUiChange.inputSchema,
    async (args: tools.verifyUiChange.Input) => {
      let after = args.after;
      let intentRegions = args.intent_regions;

      if (isLocalUrl(args.after)) {
        try {
          const { upload, measuredRegions } = await captureAndUpload(
            args.after,
            { full_page: args.full_page },
            baseUrl,
            apiKey,
            args.intent_regions,
          );
          after = upload.id;
          // Replace selector-only regions with locally-measured bboxes so the
          // server can do geometry matching even though `after` is now a
          // screenshot ID rather than a fetchable URL.
          if (measuredRegions?.length) intentRegions = measuredRegions;
        } catch (err) {
          return errorPayload(err instanceof Error ? err.message : String(err));
        }
      }

      const { data, error, response } = await client.POST('/verifications', {
        body: {
          after,
          project: args.project,
          page_name: args.page_name,
          branch: args.branch,
          intent: args.intent,
          intent_regions: intentRegions,
          threshold: args.threshold,
          match_tolerance_percent: args.match_tolerance_percent,
          ignore_selectors: args.ignore_selectors,
          full_page: args.full_page,
        },
      });
      if (error || !data) return errorResult(error, response);

      return jsonResult({
        verification_id: data.id,
        verdict: data.verdict,
        next_action: data.next_action,
        reasoning: data.reasoning,
        diff_percentage: data.diff_percentage,
        diff_url: data.diff_image_url,
        before_url: data.before_image_url,
        after_url: data.after_image_url,
        changed_regions: data.annotated_regions,
        baseline: data.baseline,
        review_url: data.review_url,
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
