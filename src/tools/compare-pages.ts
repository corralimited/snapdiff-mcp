import { z } from 'zod';

export const name = 'snapdiff_compare_pages';

export const description =
  'Visually compare two web pages to detect differences. Use this to verify that a code change didn\'t break the UI, compare staging vs production, or check if a page changed. Captures both pages as screenshots, runs pixel-level comparison, and returns a diff percentage plus a highlighted diff image showing exactly what changed. This is the primary tool — use it whenever you need to verify visual output.\n\nTwo modes:\n  1. Ad-hoc compare: pass `before` + `after` URLs.\n  2. Baseline compare: pass `after` URL + `project` (slug or ID) + `page_name`. Compares against the last-accepted baseline for that page on the project\'s default branch. Use this when the user has set up a SnapDiff project and you want to verify a page still matches its approved state.';

export const inputSchema = {
  after: z.string().describe('URL of the "after" page (e.g. staging URL or localhost) — the page to check'),
  before: z.string().optional().describe('URL of the "before" page to compare against. Omit when using baseline mode.'),
  project: z.string().optional().describe('Project slug or ID for baseline mode. When set with page_name, diffs against the stored baseline.'),
  page_name: z.string().optional().describe('Page name within the project (e.g. "homepage", "pricing"). Required for baseline mode.'),
  branch: z.string().optional().describe('Branch name for baseline lookup. Defaults to the project\'s default branch.'),
  threshold: z.number().optional().describe('Pixel sensitivity 0.0-1.0. Lower = more sensitive. Default 0.1'),
  ignore_selectors: z.array(z.string()).optional().describe('CSS selectors to exclude from comparison (e.g. timestamps, ads)'),
  full_page: z.boolean().optional().describe('Compare full scrollable pages. Default false'),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
