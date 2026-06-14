/**
 * Tool schema source of truth for both the standalone MCP server (this package)
 * and the hosted SnapDiff backend's in-process /mcp endpoint. Implementations
 * diverge — schemas don't.
 *
 * Each module exports:
 *   - `name`         — the MCP tool name
 *   - `description`  — agent-facing description (overridable at registration time)
 *   - `inputSchema`  — Zod raw shape (the dict form `server.tool()` expects)
 *   - `Input`        — inferred TypeScript type for the validated args
 */
export * as comparePages from './compare-pages.js';
export * as captureScreenshot from './capture-screenshot.js';
export * as captureBaseline from './capture-baseline.js';
export * as verifyUiChange from './verify-ui-change.js';
export * as htmlToImage from './html-to-image.js';
