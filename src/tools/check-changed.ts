import { z } from 'zod';

export const name = 'snapdiff_check_changed';

export const description =
  'Quick check if a page has visually changed compared to a previous screenshot. Faster and cheaper than compare_pages when you already have a baseline. Returns a simple changed/unchanged result.';

export const inputSchema = {
  url: z.string().describe('The URL to check now'),
  baseline_id: z.string().describe('Screenshot ID (ss_xxx) from a previous capture to compare against'),
  threshold: z.number().optional().describe('Percentage threshold to consider "changed". Default 1.0'),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
