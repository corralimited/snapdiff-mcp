import { z } from 'zod';

export const name = 'snapdiff_check_build';

export const description =
  'Capture every page in the list and diff them all against their baselines in one build. Use this after editing a shared component or design token to check whether the change affected pages you did not directly modify.\n\nReturns a per-page summary of changed vs unchanged. If any page changed, a review URL is included so a human can approve or reject before the baseline moves.';

export const inputSchema = {
  project: z.string().describe('Project slug or ID (prj_xxx).'),
  pages: z
    .array(
      z.object({
        page_name: z.string().describe('Page name within the project (e.g. "account").'),
        url: z.string().describe('URL of the page to capture. Localhost URLs are captured locally — no tunnel required.'),
      }),
    )
    .min(1)
    .describe('Pages to capture and diff. Pass every route in your page map.'),
  branch: z
    .string()
    .optional()
    .describe("Branch to look up baselines on. Defaults to the project's default branch."),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
