import { z } from 'zod';

export const name = 'snapdiff_verify_ui_change';

export const description =
  'Verify a UI change you just made matches what you intended. Use this whenever you modify a route, page, or component and need to confirm the visual result.\n\nReturns a verdict (`pass`, `expected_change_detected`, `unexpected_regression`, `no_change_detected`, or `needs_human_review`), a `next_action`, and a `review_url`. Always surface `review_url` to the user — it is the human-reviewable dashboard page showing the before/after/diff. Do not share raw image URLs (`diff_url`, `before_url`, `after_url`) — those are internal references.\n\nRequires a SnapDiff project + page baseline. Pass `intent` to describe in one sentence what you meant to change. For sharper verdicts, pass `intent_regions` with either a CSS `selector` (recommended for code-editing agents — SnapDiff resolves it to a bbox during capture) or a `bbox` directly (when your agent drives a browser and already knows pixel coordinates).';

export const inputSchema = {
  project: z.string().describe('Project slug or ID (prj_xxx).'),
  page_name: z.string().describe('Page name within the project (e.g. "account", "pricing").'),
  after: z.string().describe('URL of the page after your change (preview URL, staging, or localhost).'),
  intent: z
    .string()
    .describe(
      'One sentence describing what you intended to change. Example: "added a Cancel subscription button to the bottom of the account page". Required — without it, the verdict cannot distinguish intended changes from regressions.',
    ),
  intent_regions: z
    .array(
      z.object({
        bbox: z
          .tuple([z.number(), z.number(), z.number(), z.number()])
          .optional()
          .describe('Pixel bounding box [x, y, width, height] of the region you edited. Best when your agent drives a browser and already knows the coords.'),
        selector: z
          .string()
          .optional()
          .describe('CSS selector for the region you edited (e.g. `.billing-card`, `#header nav`). SnapDiff resolves it to a bounding box on the after page and uses that for geometric verdict matching. If the selector matches multiple elements, the bbox is their union — pick a tighter selector if that\'s too loose. Recommended for code-editing agents that can name what they edited but can\'t measure pixels.'),
        label: z.string().optional().describe('Human-readable label for this region.'),
      }),
    )
    .optional()
    .describe(
      'Optional but recommended. Hints about where on the page your change should appear. Pass `selector` (resolved server-side) or `bbox` (already in pixels) — both produce geometric verdict matching. Without intent_regions the verdict falls back to conservative `needs_human_review`.',
    ),
  branch: z
    .string()
    .optional()
    .describe("Branch to look up the baseline on. Defaults to the project's default branch."),
  threshold: z
    .number()
    .optional()
    .describe('Per-pixel color sensitivity 0.0-1.0 (pixelmatch threshold). Lower = more sensitive. Default 0.1.'),
  match_tolerance_percent: z
    .number()
    .optional()
    .describe(
      "Maximum diff percentage that still counts as 'no change.' Defaults to 0.01% for verifications (10x stricter than the diff engine's general 0.1% noise floor) so subtle styling regressions don't slip through as no_change_detected. Raise it for noisier pages, lower it for ultra-strict gates. You almost never need to set this — the default is calibrated for the agent verification flow.",
    ),
  ignore_selectors: z
    .array(z.string())
    .optional()
    .describe('CSS selectors to mask out before comparison (e.g. timestamps, ads, dynamic counters).'),
  full_page: z.boolean().optional().describe('Compare full scrollable pages. Default false.'),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
