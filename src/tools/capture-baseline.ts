import { z } from 'zod';

export const name = 'snapdiff_capture_baseline';

export const description =
  'Capture the current state of a page as the visual baseline for a SnapDiff project. Call this once per page before using snapdiff_verify_ui_change — the baseline is the reference screenshot that all future verifications diff against.\n\nFor localhost URLs, the page is captured locally with a headless browser (no tunnel needed). For public URLs, the SnapDiff backend captures it. Returns when the baseline is confirmed in place.';

export const inputSchema = {
  project: z.string().describe('Project slug or ID (prj_xxx).'),
  page_name: z
    .string()
    .describe(
      'Page name within the project (e.g. "account", "homepage"). Used to match this baseline when verifying.',
    ),
  url: z
    .string()
    .describe(
      'URL of the page to capture as the baseline. Localhost URLs are captured locally — no tunnel required.',
    ),
  branch: z
    .string()
    .optional()
    .describe("Branch to store the baseline on. Defaults to the project's default branch."),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
